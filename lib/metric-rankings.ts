import type { CompanyData } from "./sheets"
import { meaningfulAverageSalary } from "./financials"
import { METRIC_RANKING_LINKS, type MetricSlug } from "./metric-ranking-links"

export type { MetricSlug }
/** 表示順。実体は lib/metric-ranking-links.ts（クライアント向けの軽量定義）にある */
export const METRIC_RANKING_ORDER: MetricSlug[] = METRIC_RANKING_LINKS.map((l) => l.slug)

const pathOf = (slug: MetricSlug): string =>
  METRIC_RANKING_LINKS.find((l) => l.slug === slug)!.path
const labelOf = (slug: MetricSlug): string =>
  METRIC_RANKING_LINKS.find((l) => l.slug === slug)!.shortLabel

// ------------------------------------------------------------------
// 【指標別ランキングの共通基盤】
//
// これまでランキングは「初任給」と「想定年収」の2本だけで、いずれも
// 給与額を降順に並べるものだった。一方で企業詳細ページでは
// 平均年収・一人当たり営業利益・営業利益率・伸び倍率について
// 「掲載◯社中◯位」という順位を既に計算して表示している。
//
// つまり順位を出す材料は揃っているのに、その軸で並べた一覧ページが
// 存在しないため、
//   ・「平均年収 ランキング」のような検索需要を取りこぼしている
//   ・詳細ページの順位表示から辿れる先が無い
// という状態だった。
//
// ここでは「指標の定義」だけを差し替えれば1本のランキングページが
// 増える形にしておく。表示側は定義を受け取って並べるだけにする。
// ------------------------------------------------------------------

/** 有限な数値だけを通す（0や空欄、"非公開" のような文字列は除外） */
const finite = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null

/** 正の数値だけを通す */
const positive = (v: number | string | null | undefined): number | null => {
  const n = finite(v)
  return n !== null && n > 0 ? n : null
}

const MAN = 10_000

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * 相関係数の表示。小数第2位に固定する。
 *
 * 【なぜ toFixed を使うか】
 * 割り算で桁を丸めると浮動小数点の誤差がそのまま文字列に出る。
 * 実際 `Math.round(r * 1000) / 10 / 100` は -9.7/100 を計算する形になり、
 * 画面に「-0.09699999999999999」と表示されていた。
 * 桁を固定したい場面では割り算ではなく toFixed を使うこと。
 *
 * 相関係数は小数第2位まであれば強さの判断には十分で、
 * それ以上の桁は精度があるように見えるだけで根拠がない。
 */
const formatCorrelation = (r: number) => r.toFixed(2)

const manYen = (v: number) => `${Math.round(v).toLocaleString()}万円`
const times = (v: number) => `${round1(v)}倍`
const percent = (v: number) => `${round1(v)}%`

/**
 * 持株会社ガードを通過した平均年収（円）。
 * 単体従業員が数名しかいない持株会社では平均年収がグループの実態を
 * 表さないため、lib/financials.ts と同じ基準で除外する。
 */
const averageAnnualYen = (c: CompanyData): number | null => {
  const man = meaningfulAverageSalary(c)
  return man === null ? null : man * MAN
}

/** 初任給ベースの年収（円）。想定年収があればそれを、無ければ月額×12 */
const starterAnnualYen = (c: CompanyData): number | null => {
  const annual = positive(c.annualSalary)
  if (annual !== null) return annual
  const monthly = positive(c.baseMonthly)
  return monthly === null ? null : monthly * 12
}

// ------------------------------------------------------------------
// 【同一企業の重複行について】
// ランキング元データには同じ企業が複数行あることがある。同じ会社でも
// 職種によって初任給が異なり、初任給の高い職種を複数募集しているためで、
// これは初任給ランキングでは正しい姿。
//
// しかし財務指標は会社単位の値なので、そのまま並べると
// 「平均年収1,000万円の同じ会社が3行並ぶ」という無意味な一覧になる。
// ここでは社名で1社に寄せ、初任給が最も高い行を代表として採用する。
// （伸び倍率も同じ行を使う。最も条件の良い職種を基準に見る形になり、
//   行ごとに有利な方を選ぶようなつまみ食いをしないで済む）
// ------------------------------------------------------------------
function dedupeByCompany(all: CompanyData[]): CompanyData[] {
  const best = new Map<string, CompanyData>()
  for (const c of all) {
    const name = (c.company ?? "").trim()
    if (!name) continue
    const prev = best.get(name)
    if (!prev) {
      best.set(name, c)
      continue
    }
    const cur = starterAnnualYen(c) ?? 0
    const old = starterAnnualYen(prev) ?? 0
    if (cur > old) best.set(name, c)
  }
  return Array.from(best.values())
}

export interface MetricRankingDef {
  slug: MetricSlug
  path: string
  /** ページ<title>。検索結果に出る文言 */
  title: string
  /**
   * ページ内のh1。
   *
   * 【重要】短く保つこと。
   * 以前は「平均年収ランキング（全社員・有価証券報告書ベース）」のように
   * 括弧付きの長い見出しにしていたが、スマホ幅では
   * 「平均年収ランキング（全社／員・有価証券報告書ベース）」と
   * 単語の途中で折り返されて読めなくなっていた。
   * 補足は subtitle に逃がし、h1 は検索キーワードそのものだけにする。
   */
  h1: string
  /** h1の下に置く補足。長い説明はこちらに書く */
  subtitle: string
  /** 切り替えUIなどで使う短い名前 */
  shortLabel: string
  /** ランキングの軸そのものの名前（表頭に出る） */
  valueLabel: string
  /** 並べ替えに使う値。対象外の企業は null */
  extract: (c: CompanyData) => number | null
  /** 値の表示整形 */
  format: (v: number) => string
  /** 行の補助情報 */
  extras: (c: CompanyData) => { label: string; value: string }[]
  /** データの出どころ・読み方の注記 */
  note: string
  /** 指標そのものの1行説明 */
  definition: string
}

const growthRatio = (c: CompanyData): number | null => {
  const starter = starterAnnualYen(c)
  const average = averageAnnualYen(c)
  if (starter === null || average === null) return null
  return average / starter
}

export const METRIC_RANKINGS: Record<MetricSlug, MetricRankingDef> = {
  growth: {
    slug: "growth",
    path: pathOf("growth"),
    title: "初任給からの伸び率ランキング｜入社後に給与が伸びる企業",
    h1: "賃金の伸び率ランキング",
    subtitle: "初任給から全社員の平均年収まで、給与がどれだけ伸びるか",
    shortLabel: labelOf("growth"),
    valueLabel: "伸び倍率",
    definition:
      "全社員の平均年収が、初任給ベースの年収の何倍にあたるかを示した数値です。数値が大きいほど、入社後に給与が上がっていく企業といえます。",
    extract: growthRatio,
    format: times,
    extras: (c) => {
      const s = starterAnnualYen(c)
      const a = averageAnnualYen(c)
      const m = positive(c.baseMonthly)
      return [
        { label: "初任給（月額）", value: m === null ? "-" : `${m.toLocaleString()}円` },
        { label: "初任給ベース年収", value: s === null ? "-" : manYen(s / MAN) },
        { label: "平均年収", value: a === null ? "-" : manYen(a / MAN) },
      ]
    },
    note:
      "平均年収は有価証券報告書の「平均年間給与」（提出会社）、初任給ベース年収は各社の募集要項に基づく想定年収（未記載の場合は月額×12）です。平均年収には管理職やベテラン社員が含まれるため、若手のうちからこの金額に届くわけではありません。",
  },
  average: {
    slug: "average",
    path: pathOf("average"),
    title: "平均年収ランキング｜有価証券報告書ベースの全社員平均",
    h1: "平均年収ランキング",
    subtitle: "有価証券報告書に基づく、管理職を含む全社員の平均年間給与",
    shortLabel: labelOf("average"),
    valueLabel: "平均年収",
    definition:
      "有価証券報告書に記載された、提出会社の従業員の平均年間給与です。新卒の給与ではなく、管理職を含む全社員の平均値です。",
    extract: (c) => {
      const yen = averageAnnualYen(c)
      return yen === null ? null : yen / MAN
    },
    format: manYen,
    extras: (c) => {
      const s = starterAnnualYen(c)
      const r = growthRatio(c)
      const m = positive(c.baseMonthly)
      return [
        { label: "初任給（月額）", value: m === null ? "-" : `${m.toLocaleString()}円` },
        { label: "初任給ベース年収", value: s === null ? "-" : manYen(s / MAN) },
        { label: "伸び倍率", value: r === null ? "-" : times(r) },
      ]
    },
    note:
      "有価証券報告書「従業員の状況」の平均年間給与です。持株会社のように提出会社の従業員が連結の5%未満しかいない企業は、グループの実態を表さないため掲載していません。",
  },
  "profit-per-employee": {
    slug: "profit-per-employee",
    path: pathOf("profit-per-employee"),
    title: "社員一人当たり営業利益ランキング｜稼ぐ力が高い企業",
    h1: "一人当たり営業利益ランキング",
    subtitle: "社員1人がどれだけの利益を生んでいるか（給与の原資の大きさ）",
    shortLabel: labelOf("profit-per-employee"),
    valueLabel: "一人当たり営業利益",
    definition:
      "営業利益を連結従業員数で割った数値です。社員1人がどれだけの利益を生んでいるかを表し、給与の原資がどれだけあるかの目安になります。",
    extract: (c) => finite(c.profitPerEmployee),
    format: manYen,
    extras: (c) => {
      const sales = finite(c.salesPerEmployee)
      const avg = averageAnnualYen(c)
      const margin = finite(c.operatingMargin)
      return [
        { label: "一人当たり売上高", value: sales === null ? "-" : manYen(sales) },
        { label: "営業利益率", value: margin === null ? "-" : percent(margin) },
        { label: "平均年収", value: avg === null ? "-" : manYen(avg / MAN) },
      ]
    },
    note:
      "連結の営業利益を連結従業員数で割った値です。持株会社や、製造をグループ会社に委託している企業では実態とずれることがあります。IFRS採用企業では営業利益にあたる項目として事業利益を用いています。",
  },
  margin: {
    slug: "margin",
    path: pathOf("margin"),
    title: "営業利益率ランキング｜収益性が高い企業",
    h1: "営業利益率ランキング",
    subtitle: "売上高に対する営業利益の割合（本業の収益性）",
    shortLabel: labelOf("margin"),
    valueLabel: "営業利益率",
    definition:
      "売上高に対する営業利益の割合です。同じ売上規模でも利益率が高いほど手元に残る利益が大きく、給与や賞与に回せる余力があるといえます。",
    extract: (c) => finite(c.operatingMargin),
    format: percent,
    extras: (c) => {
      const s = finite(c.salesPerEmployee)
      const p = finite(c.profitPerEmployee)
      const avg = averageAnnualYen(c)
      return [
        { label: "一人当たり売上高", value: s === null ? "-" : manYen(s) },
        { label: "一人当たり営業利益", value: p === null ? "-" : manYen(p) },
        { label: "平均年収", value: avg === null ? "-" : manYen(avg / MAN) },
      ]
    },
    note:
      "有価証券報告書の売上高と営業利益から算出しています。IFRS採用企業では事業利益を用いているため、日本基準の営業利益とは厳密には概念が異なります。業界によって適正水準が大きく違う点にも注意してください。",
  },
}

export interface RankedCompany {
  rank: number
  company: CompanyData
  value: number
  display: string
  extras: { label: string; value: string }[]
}

export interface IndustryAverage {
  industry: string
  value: number
  display: string
  count: number
}

export interface MetricRanking {
  def: MetricRankingDef
  entries: RankedCompany[]
  count: number
  medianValue: number
  medianDisplay: string
  top: RankedCompany | null
  /** 業界別の中央値（3社以上ある業界のみ・高い順） */
  industryAverages: IndustryAverage[]
  /** 自動生成の分析文 */
  analysis: string[]
  faq: { question: string; answer: string }[]
}

/** 降順の順位（1始まり・同値は同順位） */
const rankOf = (values: number[], target: number): number =>
  values.filter((v) => v > target).length + 1

/**
 * スピアマンの順位相関係数。
 * 2つの指標の順位がどれだけ連動しているかを −1〜+1 で表す。
 * 「初任給が高い企業は伸び率も高いのか」のような問いに答えるために使う。
 */
function spearman(pairs: [number, number][]): number | null {
  const n = pairs.length
  if (n < 10) return null
  const rank = (vals: number[]): number[] => {
    const idx = vals.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0])
    const r = new Array<number>(n)
    let i = 0
    while (i < n) {
      let j = i
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++
      // 同値は平均順位を与える
      const avg = (i + j) / 2 + 1
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg
      i = j + 1
    }
    return r
  }
  const rx = rank(pairs.map((p) => p[0]))
  const ry = rank(pairs.map((p) => p[1]))
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
  const mx = mean(rx)
  const my = mean(ry)
  let cov = 0
  let vx = 0
  let vy = 0
  for (let i = 0; i < n; i++) {
    cov += (rx[i] - mx) * (ry[i] - my)
    vx += (rx[i] - mx) ** 2
    vy += (ry[i] - my) ** 2
  }
  if (vx === 0 || vy === 0) return null
  return cov / Math.sqrt(vx * vy)
}

/** 相関係数を日本語の強さ表現に直す */
function correlationWord(r: number): string {
  const a = Math.abs(r)
  const strength = a < 0.2 ? "ほとんど関係がない" : a < 0.4 ? "弱い" : a < 0.7 ? "中程度の" : "強い"
  if (a < 0.2) return strength
  return `${strength}${r > 0 ? "正の相関" : "負の相関"}`
}

/**
 * 指標ランキングを組み立てる。
 *
 * @param all 全掲載企業（重複行を含んでよい。内部で社名ごとに1社へ寄せる）
 * @param def どの指標で並べるかの定義
 */
export function buildMetricRanking(all: CompanyData[], def: MetricRankingDef): MetricRanking | null {
  const unique = dedupeByCompany(all)

  const rows = unique
    .map((company) => ({ company, value: def.extract(company) }))
    .filter((r): r is { company: CompanyData; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value)

  // 母数が少ないと中央値も順位も意味を持たないため、ページごと出さない
  if (rows.length < 10) return null

  const values = rows.map((r) => r.value)
  const med = median(values)!

  const entries: RankedCompany[] = rows.map((r) => ({
    rank: rankOf(values, r.value),
    company: r.company,
    value: r.value,
    display: def.format(r.value),
    extras: def.extras(r.company),
  }))

  // 業界別の中央値。1社しかない業界は代表性が無いので3社以上に限る
  const byIndustry = new Map<string, number[]>()
  for (const r of rows) {
    for (const raw of (r.company.industry ?? "").split("/")) {
      const industry = raw.trim()
      if (!industry) continue
      if (!byIndustry.has(industry)) byIndustry.set(industry, [])
      byIndustry.get(industry)!.push(r.value)
    }
  }
  const industryAverages: IndustryAverage[] = Array.from(byIndustry.entries())
    .filter(([, vs]) => vs.length >= 3)
    .map(([industry, vs]) => {
      const m = median(vs)!
      return { industry, value: m, display: def.format(m), count: vs.length }
    })
    .sort((a, b) => b.value - a.value)

  return {
    def,
    entries,
    count: rows.length,
    medianValue: med,
    medianDisplay: def.format(med),
    top: entries[0] ?? null,
    industryAverages,
    analysis: buildAnalysis(def, rows, med, industryAverages),
    faq: buildFaq(def, rows, med, industryAverages),
  }
}

// ------------------------------------------------------------------
// 【自動生成の分析文】
// 企業が増減しても数字が自動で追従するよう、集計値の穴埋めだけで
// 文章を組み立てる。手作業の更新が要らないうえ、
// 「掲載データを実際に集計した結果」という他サイトに無い中身になる。
// ------------------------------------------------------------------
function buildAnalysis(
  def: MetricRankingDef,
  rows: { company: CompanyData; value: number }[],
  med: number,
  industryAverages: IndustryAverage[],
): string[] {
  const paragraphs: string[] = []
  const fmt = def.format
  const top = rows[0]
  const bottom = rows[rows.length - 1]

  // ① 全体像。中央値と上下の開きを示す
  //
  // 【注意】「上位は下位の◯倍」という言い方は、下位が0以下だと成立しない。
  // 営業利益率には赤字（マイナス）の企業が含まれるため、
  // 割り算の結果をそのまま書くと「25倍の開き」のような誤った表現になる。
  // 下位が正の値で、かつ極端に0へ近くないときだけ倍率で表現する。
  const spread =
    bottom.value > 0 && top.value / bottom.value < 1000
      ? `同じ「初任給が高い企業」の中でも${round1(top.value / bottom.value)}倍の開きがあります。`
      : `同じ「初任給が高い企業」の中でも、これだけの幅があります。`
  paragraphs.push(
    `掲載${rows.length}社の${def.valueLabel}を集計したところ、中央値は${fmt(med)}でした。` +
      `最も高いのは${top.company.company}の${fmt(top.value)}、最も低いのは${bottom.company.company}の${fmt(bottom.value)}です。` +
      `${spread}${def.definition}`,
  )

  // ② 業界差
  if (industryAverages.length >= 3) {
    const hi = industryAverages.slice(0, 3)
    const lo = industryAverages.slice(-2)
    paragraphs.push(
      `業界別に見ると、${def.valueLabel}の中央値が高いのは` +
        `${hi.map((r) => `${r.industry}（${r.display}／${r.count}社）`).join("、")}の順です。` +
        `一方で${lo.map((r) => `${r.industry}（${r.display}）`).join("、")}は低めに出ています。` +
        `業界ごとにビジネスの構造が違うため、この数値は同じ業界どうしで比べたときに最も意味を持ちます。`,
    )
  }

  // ③ 初任給との関係。この指標が初任給から予測できるものかを検証する
  const pairs: [number, number][] = []
  for (const r of rows) {
    const s = starterAnnualYen(r.company)
    if (s !== null) pairs.push([s, r.value])
  }
  const r = spearman(pairs)
  if (r !== null) {
    const word = correlationWord(r)
    const lead =
      Math.abs(r) < 0.2
        ? `初任給の高さと${def.valueLabel}の間には${word}という結果でした（順位相関 ${formatCorrelation(r)}、${pairs.length}社）。` +
          `つまり初任給を見ただけでは${def.valueLabel}は予測できません。`
        : `初任給の高さと${def.valueLabel}の間には${word}が見られました（順位相関 ${formatCorrelation(r)}、${pairs.length}社）。`
    paragraphs.push(
      lead +
        `初任給は採用市場での競争によって決まる一方、${def.valueLabel}は入社後の給与制度や事業の収益構造によって決まります。` +
        `決まり方が違う以上、両方を確認しないと入社後の姿は見えてきません。`,
    )
  }

  // ④ 初任給の水準帯ごとの傾向
  const banded = bandByStarterSalary(rows)
  if (banded.length >= 3) {
    paragraphs.push(
      `初任給の水準帯ごとに${def.valueLabel}の中央値を出すと、` +
        `${banded.map((b) => `${b.label}が${fmt(b.median)}（${b.count}社）`).join("、")}となりました。` +
        `${describeBandTrend(banded, def)}`,
    )
  }

  return paragraphs
}

/** 初任給の水準帯ごとに指標の中央値を集計する */
function bandByStarterSalary(
  rows: { company: CompanyData; value: number }[],
): { label: string; median: number; count: number }[] {
  const BANDS: { label: string; min: number; max: number }[] = [
    { label: "月30万円未満", min: 0, max: 300_000 },
    { label: "月30〜35万円", min: 300_000, max: 350_000 },
    { label: "月35〜40万円", min: 350_000, max: 400_000 },
    { label: "月40万円以上", min: 400_000, max: Infinity },
  ]
  const buckets = BANDS.map((b) => ({ ...b, values: [] as number[] }))
  for (const r of rows) {
    const monthly = positive(r.company.baseMonthly)
    if (monthly === null) continue
    const b = buckets.find((x) => monthly >= x.min && monthly < x.max)
    if (b) b.values.push(r.value)
  }
  return buckets
    .filter((b) => b.values.length >= 3)
    .map((b) => ({ label: b.label, median: median(b.values)!, count: b.values.length }))
}

/** 帯ごとの傾向が単調に増減しているかを判定し、読み解きの一文を返す */
function describeBandTrend(
  banded: { label: string; median: number; count: number }[],
  def: MetricRankingDef,
): string {
  const vals = banded.map((b) => b.median)
  const rising = vals.every((v, i) => i === 0 || v >= vals[i - 1])
  const falling = vals.every((v, i) => i === 0 || v <= vals[i - 1])

  if (def.slug === "growth") {
    if (falling) {
      return (
        "初任給が高い企業ほど伸び率は小さくなる、という逆方向の関係がはっきり出ています。" +
        "初任給の高さは「入社時点で既に高い水準に達している」ことを意味する場合があり、" +
        "その分だけ入社後の上げ幅は緩やかになりやすいということです。" +
        "初任給が相場並みでも、そこから大きく伸びる企業を見落とさないようにしてください。"
      )
    }
    if (rising) {
      return "初任給が高い企業ほど伸び率も大きいという結果で、上位企業は入社時点でも入社後でも高い水準を保っています。"
    }
    return "きれいな増減の関係は見られず、初任給の水準だけで入社後の伸び方は決まらないことがわかります。"
  }

  if (rising) {
    return `初任給が高い企業ほど${def.valueLabel}も高いという関係が出ています。給与を高く設定できる裏付けとして、収益力の高さがあると考えられます。`
  }
  if (falling) {
    return `初任給が高い企業ほど${def.valueLabel}は低いという結果でした。人材確保のために採用時の条件を厚くしている企業が含まれている可能性があります。`
  }
  return `帯ごとの明確な傾向は見られず、初任給の水準と${def.valueLabel}は別々の要因で決まっていると考えられます。`
}

// ------------------------------------------------------------------
// 【FAQ】検索結果のFAQリッチリザルトと、AIによる引用の両方を狙う。
// 質問への答えが単体で完結するように、数値と前提をその場で書く。
// ------------------------------------------------------------------
function buildFaq(
  def: MetricRankingDef,
  rows: { company: CompanyData; value: number }[],
  med: number,
  industryAverages: IndustryAverage[],
): { question: string; answer: string }[] {
  const fmt = def.format
  const top = rows[0]
  const faq: { question: string; answer: string }[] = [
    {
      question: `${def.valueLabel}が最も高い企業はどこですか？`,
      answer:
        `当サイト掲載${rows.length}社の中では${top.company.company}が${fmt(top.value)}で最も高くなっています。` +
        `${def.note}`,
    },
    {
      question: `${def.valueLabel}の平均的な水準はどのくらいですか？`,
      answer:
        `掲載${rows.length}社の中央値は${fmt(med)}です。` +
        `ただし当サイトは初任給の高い企業を中心に収録しているため、日本企業全体の水準ではありません。`,
    },
  ]

  if (industryAverages.length >= 2) {
    const hi = industryAverages[0]
    faq.push({
      question: `${def.valueLabel}が高いのはどの業界ですか？`,
      answer:
        `掲載データでは${hi.industry}が中央値${hi.display}（${hi.count}社）で最も高くなっています。` +
        `業界ごとにビジネスの構造が異なるため、比較は同じ業界どうしで行うのが適切です。`,
    })
  }

  if (def.slug === "growth") {
    faq.push({
      question: "伸び倍率が高い企業を選べば給与は上がりますか？",
      answer:
        "伸び倍率は「全社員の平均年収 ÷ 初任給ベースの年収」であり、平均年収には管理職やベテラン社員が含まれます。" +
        "そのため若手のうちからその金額に届くわけではなく、昇進や在籍年数によって実際の到達時期は大きく変わります。" +
        "また平均年収は提出会社（単体）の値であり、グループ全体の平均とは異なる場合があります。",
    })
    faq.push({
      question: "初任給が高い企業は伸び率も高いのですか？",
      answer:
        "掲載データを集計すると、初任給の高さと伸び倍率にはむしろ逆方向の関係が見られます。" +
        "初任給が高い企業は入社時点で既に高い水準に達しているため、そこからの上げ幅は緩やかになりやすいためです。" +
        "初任給と伸び率は別々の要因で決まるので、両方を確認することをおすすめします。",
    })
  }

  return faq
}
