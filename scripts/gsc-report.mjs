#!/usr/bin/env node
/**
 * ------------------------------------------------------------------
 * Google Search Console レポート取得スクリプト（読み取り専用）
 * ------------------------------------------------------------------
 *
 * このファイルは単体で完結しており、next build にもアプリのコードにも
 * 一切関与しない。消してもサイトは動く。書き込み系のAPIは呼ばない。
 *
 * 【できること】
 *   1. sitemap … /sitemap/0〜3.xml のURL数を軸別に数える（認証不要）
 *   2. perf    … 検索パフォーマンス（クエリ別・ページ別・日別の表示回数/クリック）
 *   3. index   … インデックス登録状況（URL単位で検査し、除外理由を集計）
 *
 * 【重要・インデックス状況について】
 *   Search Console の「ページ」レポート（有効◯件／未登録◯件と除外理由の内訳）を
 *   そのまま返すAPIは存在しない。APIで取れるのは URL Inspection API による
 *   「1URLずつの検査結果」だけ。そこでこのスクリプトは sitemap の全URLを
 *   1本ずつ検査し、coverageState（＝レポートの「除外理由」に当たる文言）で
 *   集計してレポート相当の内訳を自力で組み立てる。
 *
 *   URL Inspection API の割り当ては 1サイトあたり 2,000件/日・600件/分。
 *   このサイトの sitemap は約450URLなので、全件を1回の実行で検査できる。
 *
 * 【使い方】
 *   node scripts/gsc-report.mjs sitemap
 *   node scripts/gsc-report.mjs perf --days 28
 *   node scripts/gsc-report.mjs perf --days 90 --dim query,page
 *   node scripts/gsc-report.mjs index                  # sitemapの全URLを検査
 *   node scripts/gsc-report.mjs index --limit 100      # 先頭100件だけ
 *   node scripts/gsc-report.mjs index --filter /companies/
 *   node scripts/gsc-report.mjs index --urls urls.txt  # 1行1URLのファイル
 *
 *   出力は .gsc-out/ に CSV と JSON で書き出す。
 *   .gitignore に「/.gsc-out」を足しておくこと（現状の .env* では弾けない）。
 *
 * 【依存】
 *   サービスアカウント認証のときだけ google-auth-library を使う。
 *   既存の googleapis が内部で依存しているので node_modules には既にある。
 *   明示したい場合は  npm i -D google-auth-library
 *   OAuth2（リフレッシュトークン）認証なら依存ゼロで動く。
 *
 * 【必要な環境変数】アプリ側（lib/config.ts・GOOGLE_SHEETS_API_KEY）とは無関係。
 *   .env.local ではなくシェルか .env.gsc に置き、コミットしないこと。
 *
 *   GSC_SITE_URL   必須。Search Consoleのプロパティ識別子。
 *                  ドメインプロパティ : sc-domain:mymoneyweb.com
 *                  URLプレフィックス  : https://www.mymoneyweb.com/  ← 末尾スラッシュ必須
 *   GSC_BASE_URL   sitemapを読むためのサイトURL。GSC_SITE_URLがsc-domain:形式なら必須。
 *                  例: https://www.mymoneyweb.com
 *
 *   -- 認証（下のいずれか1つ） --
 *   [A] サービスアカウント（推奨・人の操作が要らないのでCIやcronに向く）
 *       GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *       または GSC_SA_KEY_JSON='{"type":"service_account",...}'（鍵のJSONそのもの）
 *   [B] OAuth2（組織ポリシーでサービスアカウントを使えない場合）
 *       GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN
 *
 *   GSC_OUT_DIR    任意。出力先（既定: .gsc-out）
 * ------------------------------------------------------------------
 */

import fs from "node:fs"
import path from "node:path"

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
const OUT_DIR = process.env.GSC_OUT_DIR || ".gsc-out"

// URL Inspection API の割り当て: 1サイト 600件/分・2,000件/日
const INSPECT_QPM = 600
const INSPECT_QPD = 2000
const INSPECT_CONCURRENCY = 5

// ------------------------------------------------------------------
// 引数・設定
// ------------------------------------------------------------------

function parseArgs(argv) {
  const [, , cmd, ...rest] = argv
  const flags = {}
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = rest[i + 1]
    if (next === undefined || next.startsWith("--")) flags[key] = true
    else {
      flags[key] = next
      i++
    }
  }
  return { cmd, flags }
}

function die(msg) {
  console.error(`\n[gsc] ${msg}\n`)
  process.exit(1)
}

function siteUrl() {
  const v = process.env.GSC_SITE_URL
  if (!v) {
    die(
      "GSC_SITE_URL が未設定です。\n" +
        "  ドメインプロパティ : export GSC_SITE_URL='sc-domain:mymoneyweb.com'\n" +
        "  URLプレフィックス  : export GSC_SITE_URL='https://www.mymoneyweb.com/'（末尾スラッシュ必須）",
    )
  }
  return v
}

/** sitemapを読むためのサイトURL（末尾スラッシュなし） */
function baseUrl() {
  if (process.env.GSC_BASE_URL) return process.env.GSC_BASE_URL.replace(/\/$/, "")
  const s = process.env.GSC_SITE_URL || ""
  if (!s || s.startsWith("sc-domain:")) {
    die("export GSC_BASE_URL='https://www.mymoneyweb.com' を設定してください。")
  }
  return s.replace(/\/$/, "")
}

// ------------------------------------------------------------------
// 認証（アクセストークンを取るところだけ）
// ------------------------------------------------------------------

let tokenCache = { value: null, expiresAt: 0 }

async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.value

  const { GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN } = process.env

  // [B] OAuth2 リフレッシュトークン（依存ゼロ）
  if (GSC_CLIENT_ID && GSC_CLIENT_SECRET && GSC_REFRESH_TOKEN) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GSC_CLIENT_ID,
        client_secret: GSC_CLIENT_SECRET,
        refresh_token: GSC_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    })
    const json = await res.json()
    if (!res.ok) die(`トークンの更新に失敗しました: ${JSON.stringify(json)}`)
    tokenCache = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
    return tokenCache.value
  }

  // [A] サービスアカウント（google-auth-library を遅延読み込み）
  if (process.env.GSC_SA_KEY_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    let GoogleAuth
    try {
      ;({ GoogleAuth } = await import("google-auth-library"))
    } catch {
      die("google-auth-library が見つかりません。 npm i -D google-auth-library を実行してください。")
    }
    const opts = { scopes: [SCOPE] }
    if (process.env.GSC_SA_KEY_JSON) {
      try {
        opts.credentials = JSON.parse(process.env.GSC_SA_KEY_JSON)
      } catch {
        die("GSC_SA_KEY_JSON のJSONを解析できませんでした。")
      }
    }
    const auth = new GoogleAuth(opts)
    const c = await auth.getClient()
    const { token } = await c.getAccessToken()
    tokenCache = { value: token, expiresAt: Date.now() + 50 * 60_000 }
    return token
  }

  die(
    "認証情報が見つかりません。次のいずれかを設定してください。\n" +
      "  [A] GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json\n" +
      "  [A] GSC_SA_KEY_JSON='{\"type\":\"service_account\",...}'\n" +
      "  [B] GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN",
  )
}

/** Search Console API に POST する。403/429 はそのまま呼び出し側に返す */
async function apiPost(url, body) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* 非JSONはそのまま扱う */
  }
  if (!res.ok) {
    const err = new Error(json?.error?.message || text || `HTTP ${res.status}`)
    err.code = res.status
    throw err
  }
  return json ?? {}
}

// ------------------------------------------------------------------
// 出力ユーティリティ
// ------------------------------------------------------------------

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function csvCell(v) {
  if (v === null || v === undefined) return ""
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function writeCsv(file, headers, rows) {
  ensureOutDir()
  const p = path.join(OUT_DIR, file)
  // Excelで開いたときに文字化けしないようBOMを付ける
  const body = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n")
  fs.writeFileSync(p, "﻿" + body + "\n", "utf8")
  console.log(`  -> ${p}  (${rows.length}行)`)
}

function writeJson(file, data) {
  ensureOutDir()
  const p = path.join(OUT_DIR, file)
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8")
  console.log(`  -> ${p}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ymd = (d) => d.toISOString().slice(0, 10)

// ------------------------------------------------------------------
// 1. sitemap（認証不要）
// ------------------------------------------------------------------

async function fetchSitemapUrls(base) {
  const all = []
  const perFile = {}
  for (const id of [0, 1, 2, 3]) {
    const url = `${base}/sitemap/${id}.xml`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ! ${url} が ${res.status} を返しました`)
      perFile[id] = []
      continue
    }
    const xml = await res.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].trim().replace(/&amp;/g, "&"),
    )
    perFile[id] = locs
    all.push(...locs)
  }
  return { all, perFile }
}

/** URLをサイトの軸（企業／業界／手取り…）に分類する */
function classify(u) {
  const p = decodeURIComponent(u.replace(/^https?:\/\/[^/]+/, "")) || "/"
  if (p === "/") return "トップ"
  if (p.startsWith("/companies/")) return "企業詳細"
  if (p.startsWith("/industries/")) return "業界別"
  if (p.startsWith("/lists/")) return "条件クロス一覧"
  if (p.startsWith("/articles/")) return "記事"
  if (p.startsWith("/take-home/annual/")) return "年収別手取り"
  if (p.startsWith("/take-home/")) return "月額別手取り"
  if (p.startsWith("/savings/")) return "手取り別貯蓄"
  if (p.startsWith("/grad/")) return "卒年別"
  if (p.startsWith("/ranking")) return "ランキング"
  return "その他（固定ページ）"
}

async function cmdSitemap() {
  const base = baseUrl()
  console.log(`\n[gsc] sitemap を集計: ${base}\n`)
  const { all, perFile } = await fetchSitemapUrls(base)

  const rows = []
  for (const id of [0, 1, 2, 3]) {
    const urls = perFile[id] ?? []
    const byAxis = {}
    for (const u of urls) {
      const a = classify(u)
      byAxis[a] = (byAxis[a] ?? 0) + 1
    }
    console.log(`  sitemap/${id}.xml : ${urls.length} URL`)
    for (const [axis, n] of Object.entries(byAxis).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${axis} … ${n}`)
      rows.push([`sitemap/${id}.xml`, axis, n])
    }
  }
  console.log(`\n  合計: ${all.length} URL\n`)

  writeCsv("sitemap-breakdown.csv", ["sitemap", "軸", "URL数"], rows)
  writeJson("sitemap-urls.json", { total: all.length, perFile })
}

// ------------------------------------------------------------------
// 2. perf: 検索パフォーマンス（Search Analytics API）
// ------------------------------------------------------------------

async function searchAnalytics(site, body) {
  const url =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(site)}/searchAnalytics/query`

  const ROW_LIMIT = 25000
  const rows = []
  let startRow = 0
  for (;;) {
    const data = await apiPost(url, { ...body, rowLimit: ROW_LIMIT, startRow })
    const got = data.rows ?? []
    rows.push(...got)
    if (got.length < ROW_LIMIT) break
    startRow += ROW_LIMIT
  }
  return rows
}

async function cmdPerf(flags) {
  const site = siteUrl()

  // GSCのデータは2〜3日遅れる。既定は「3日前までの28日間」。
  const end = flags.end ? new Date(String(flags.end)) : new Date(Date.now() - 3 * 86400_000)
  const days = Number(flags.days ?? 28)
  const start = flags.start
    ? new Date(String(flags.start))
    : new Date(end.getTime() - (days - 1) * 86400_000)

  const startDate = ymd(start)
  const endDate = ymd(end)

  // --dim query,page のように複数指定でクロス集計もできる
  const dimSets = flags.dim
    ? [String(flags.dim).split(",").map((s) => s.trim())]
    : [["query"], ["page"], ["date"]]

  console.log(`\n[gsc] 検索パフォーマンス: ${site}`)
  console.log(`      期間: ${startDate} 〜 ${endDate}\n`)

  const summary = {}

  for (const dimensions of dimSets) {
    const label = dimensions.join("-")
    process.stdout.write(`  ${label} を取得中...`)

    const rows = await searchAnalytics(site, {
      startDate,
      endDate,
      dimensions,
      type: flags.type ? String(flags.type) : "web",
      // final = 確定値のみ。速報値も含めたいなら --datastate all
      dataState: flags.datastate === "all" ? "all" : "final",
    })
    console.log(` ${rows.length}行`)

    const out = rows
      .map((r) => ({
        keys: r.keys ?? [],
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      }))
      .sort((a, b) => b.impressions - a.impressions)

    writeCsv(
      `perf-${label}-${startDate}_${endDate}.csv`,
      [...dimensions, "クリック", "表示回数", "CTR(%)", "平均掲載順位"],
      out.map((r) => [
        ...r.keys,
        r.clicks,
        r.impressions,
        (r.ctr * 100).toFixed(2),
        r.position.toFixed(1),
      ]),
    )

    summary[label] = {
      rows: out.length,
      clicks: out.reduce((s, r) => s + r.clicks, 0),
      impressions: out.reduce((s, r) => s + r.impressions, 0),
      top10: out.slice(0, 10).map((r) => ({
        key: r.keys.join(" | "),
        clicks: r.clicks,
        impressions: r.impressions,
        position: Number(r.position.toFixed(1)),
      })),
    }
  }

  writeJson(`perf-summary-${startDate}_${endDate}.json`, { site, startDate, endDate, summary })

  console.log("\n  --- 表示回数の多い順 TOP10 ---")
  for (const [label, s] of Object.entries(summary)) {
    console.log(
      `\n  [${label}] 合計 表示${s.impressions.toLocaleString()} / クリック${s.clicks.toLocaleString()}`,
    )
    for (const t of s.top10) {
      console.log(
        `    ${String(t.impressions).padStart(7)}imp ${String(t.clicks).padStart(5)}clk ` +
          `${String(t.position).padStart(5)}位  ${t.key}`,
      )
    }
  }
  console.log("")
}

// ------------------------------------------------------------------
// 3. index: インデックス登録状況（URL Inspection API）
// ------------------------------------------------------------------

const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"

async function inspectOne(site, inspectionUrl, attempt = 0) {
  try {
    const data = await apiPost(INSPECT_URL, {
      siteUrl: site,
      inspectionUrl,
      languageCode: "ja-JP",
    })
    return data.inspectionResult ?? null
  } catch (e) {
    if ((e.code === 429 || e.code === 503) && attempt < 4) {
      const wait = 2000 * 2 ** attempt
      console.warn(`\n    ! ${e.code} を受信。${wait}ms 待って再試行: ${inspectionUrl}`)
      await sleep(wait)
      return inspectOne(site, inspectionUrl, attempt + 1)
    }
    return { __error: `${e.code ?? "ERR"}: ${e.message}` }
  }
}

async function cmdIndex(flags) {
  const site = siteUrl()

  // 対象URLを集める
  let urls
  if (flags.urls) {
    urls = fs
      .readFileSync(String(flags.urls), "utf8")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"))
  } else {
    urls = (await fetchSitemapUrls(baseUrl())).all
  }

  if (flags.filter) {
    const f = String(flags.filter)
    urls = urls.filter((u) => decodeURIComponent(u).includes(f))
  }

  const limit = Math.min(Number(flags.limit ?? INSPECT_QPD), INSPECT_QPD)
  if (urls.length > limit) {
    console.warn(`\n  ! 対象${urls.length}件を ${limit}件に切り詰めます（1日の上限は${INSPECT_QPD}件）`)
    urls = urls.slice(0, limit)
  }

  console.log(`\n[gsc] インデックス状況を検査: ${site}`)
  console.log(`      対象 ${urls.length} URL（上限 ${INSPECT_QPM}件/分・${INSPECT_QPD}件/日）\n`)

  const results = []
  const t0 = Date.now()

  for (let i = 0; i < urls.length; i += INSPECT_CONCURRENCY) {
    const batch = urls.slice(i, i + INSPECT_CONCURRENCY)
    const got = await Promise.all(batch.map((u) => inspectOne(site, u)))
    batch.forEach((u, j) => results.push({ url: u, result: got[j] }))

    process.stdout.write(`\r      ${Math.min(i + INSPECT_CONCURRENCY, urls.length)}/${urls.length} 件`)
    // 600件/分 = 10件/秒 を超えないよう間隔を空ける
    await sleep(Math.ceil((INSPECT_CONCURRENCY / INSPECT_QPM) * 60_000))
  }
  console.log(`\n      完了（${Math.round((Date.now() - t0) / 1000)}秒）\n`)

  // ---- 集計 ----
  const tally = (key) => {
    const m = {}
    for (const r of results) {
      const s = r.result?.indexStatusResult ?? {}
      const v = r.result?.__error ? "APIエラー" : (s[key] ?? "(なし)")
      m[v] = (m[v] ?? 0) + 1
    }
    return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]))
  }

  const rows = results.map((r) => {
    const s = r.result?.indexStatusResult ?? {}
    const mismatch =
      s.googleCanonical && s.userCanonical && s.googleCanonical !== s.userCanonical ? "不一致" : ""
    return [
      r.url,
      classify(r.url),
      r.result?.__error ?? s.verdict ?? "",
      s.coverageState ?? "",
      s.robotsTxtState ?? "",
      s.indexingState ?? "",
      s.pageFetchState ?? "",
      s.lastCrawlTime ?? "",
      s.googleCanonical ?? "",
      s.userCanonical ?? "",
      mismatch,
      (s.sitemap ?? []).join(" "),
    ]
  })

  writeCsv(
    "index-status.csv",
    [
      "URL",
      "軸",
      "verdict",
      "coverageState（登録状況・除外理由）",
      "robotsTxtState",
      "indexingState",
      "pageFetchState",
      "最終クロール",
      "Google判定canonical",
      "宣言canonical",
      "canonical不一致",
      "検出sitemap",
    ],
    rows,
  )

  // 軸 × 登録状況のクロス集計（どのページ群が落ちているかを見るため）
  const cross = {}
  for (const r of results) {
    const axis = classify(r.url)
    const state = r.result?.__error
      ? "APIエラー"
      : (r.result?.indexStatusResult?.coverageState ?? "(なし)")
    cross[axis] ??= {}
    cross[axis][state] = (cross[axis][state] ?? 0) + 1
  }
  const crossRows = []
  for (const [axis, states] of Object.entries(cross)) {
    for (const [state, n] of Object.entries(states).sort((a, b) => b[1] - a[1])) {
      crossRows.push([axis, state, n])
    }
  }
  writeCsv("index-by-axis.csv", ["軸", "coverageState", "件数"], crossRows)

  const summary = {
    site,
    inspectedAt: new Date().toISOString(),
    total: results.length,
    verdict: tally("verdict"),
    coverageState: tally("coverageState"),
    robotsTxtState: tally("robotsTxtState"),
    indexingState: tally("indexingState"),
    pageFetchState: tally("pageFetchState"),
    canonicalMismatch: results.filter((r) => {
      const s = r.result?.indexStatusResult
      return s?.googleCanonical && s?.userCanonical && s.googleCanonical !== s.userCanonical
    }).length,
    byAxis: cross,
  }
  writeJson("index-summary.json", summary)

  console.log("  --- verdict（PASS=登録済み / NEUTRAL・FAIL=未登録） ---")
  for (const [k, v] of Object.entries(summary.verdict)) console.log(`    ${String(v).padStart(5)}  ${k}`)
  console.log("\n  --- coverageState（Search Consoleの「除外理由」に対応） ---")
  for (const [k, v] of Object.entries(summary.coverageState)) console.log(`    ${String(v).padStart(5)}  ${k}`)
  console.log(`\n  canonical不一致: ${summary.canonicalMismatch}件\n`)
}

// ------------------------------------------------------------------

const USAGE = `
使い方:
  node scripts/gsc-report.mjs sitemap
  node scripts/gsc-report.mjs perf   [--days 28] [--start YYYY-MM-DD] [--end YYYY-MM-DD]
                                     [--dim query|page|date|query,page] [--datastate all]
  node scripts/gsc-report.mjs index  [--limit 2000] [--filter /companies/] [--urls urls.txt]

必要な環境変数は、このファイル冒頭のコメントを参照。
`

async function main() {
  const { cmd, flags } = parseArgs(process.argv)
  switch (cmd) {
    case "sitemap":
      return cmdSitemap()
    case "perf":
      return cmdPerf(flags)
    case "index":
      return cmdIndex(flags)
    default:
      console.log(USAGE)
      process.exit(cmd ? 1 : 0)
  }
}

main().catch((e) => {
  console.error("\n[gsc] 失敗しました:", e?.message ?? e)
  if (e?.code === 403) {
    console.error(
      "  403 の場合、サービスアカウント（またはOAuthのユーザー）が\n" +
        "  Search Console のユーザーとして追加されていない可能性が高いです。\n" +
        "  Search Console → 設定 → ユーザーと権限 → ユーザーを追加（権限は「フル」）",
    )
  }
  if (e?.code === 404) {
    console.error("  404 の場合、GSC_SITE_URL の綴りを確認してください（URLプレフィックスは末尾スラッシュ必須）。")
  }
  process.exit(1)
})
