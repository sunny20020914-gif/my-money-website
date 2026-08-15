import type { CompanyData } from "./sheets"
import { meaningfulAverageSalary, LISTED_COMPANY_NOTE } from "./financials"
import type { MetricRanking, MetricRankingDef, RankedCompany, IndustryAverage } from "./metric-rankings"

// ------------------------------------------------------------------
// 【初任給 × 平均年収の両立ランキング】
//
// 当サイトのデータでは、初任給の順位と平均年収の順位はほとんど連動しない。
// つまり「入社時点で高く、かつ入社後も高い」企業は例外的で、
// だからこそ両立している企業を特定する価値がある。
//
// ------------------------------------------------------------------
// 【なぜ「パーセンタイルの調和平均」なのか】
//
// 2つの変数を1つの順位にまとめる方法はいくつもあるが、
// この用途では次の理由で他の方法を採らなかった。
//
// ① 金額をそのまま足す
//    → 単位が違う（月額30万円 と 年収1,000万円）ので意味を持たない。
//
// ② 偏差値（Zスコア）を足す
//    → 平均年収は右に裾が長い分布で、一部の企業が突出している。
//      Zスコアは平均と標準偏差に依存するため外れ値に引きずられ、
//      「1社だけ極端に高い」だけで全体の評価が歪む。
//
// ③ 順位を足す（初任給5位＋平均年収80位＝85）
//    → 分かりやすいが、順位の差が実際の金額差を反映しない。
//      1位と2位が僅差でも、80位と81位が大差でも同じ「1」として扱われる。
//
// ④ パーセンタイルの算術平均
//    → 「片方100・もう片方20」（平均60）と「両方60」（平均60）が
//      同点になってしまう。これでは"両立"を測れない。
//
// 採用したのは【パーセンタイルの調和平均】。
//   ・パーセンタイルなので分布の形に左右されず、外れ値にも強い
//   ・調和平均は小さい方に強く引っ張られる性質を持つため、
//     片方が低い企業のスコアは伸びない
//       例) 100と20 → 算術平均60 / 調和平均33
//           60と60  → 算術平均60 / 調和平均60
//     これがまさに「両立しているか」を測る性質になる
// ------------------------------------------------------------------

const MAN = 10_000

const positive = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null

/** 初任給ベースの年収（円）。想定年収があればそれを、無ければ月額×12 */
const starterAnnualYen = (c: CompanyData): number | null => {
  const annual = positive(c.annualSalary)
  if (annual !== null) return annual
  const monthly = positive(c.baseMonthly)
  return monthly === null ? null : monthly * 12
}

/** 持株会社ガードを通過した平均年収（円） */
const averageAnnualYen = (c: CompanyData): number | null => {
  const man = meaningfulAverageSalary(c)
  return man === null ? null : man * MAN
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const manYen = (v: number) => `${Math.round(v).toLocaleString()}万円`
const yen = (v: number) => `${Math.round(v).toLocaleString()}円`

/** 社名で1社に寄せる（同じ企業の職種違いの行をまとめる） */
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
    if ((starterAnnualYen(c) ?? 0) > (starterAnnualYen(prev) ?? 0)) best.set(name, c)
  }
  return Array.from(best.values())
}

/**
 * パーセンタイル順位（0〜100）。100が最高。
 * 「自分より下に何％の企業がいるか」で計算する。
 * 同値は同じ値になる。
 */
function percentileOf(sorted: number[], value: number): number {
  const below = sorted.filter((v) => v < value).length
  const equal = sorted.filter((v) => v === value).length
  // 同値グループの中央を取ることで、同点の企業が不当に有利／不利にならない
  return ((below + equal / 2) / sorted.length) * 100
}

/** 調和平均。片方が0に近いと全体も0に近づく */
function harmonicMean(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0
  return (2 * a * b) / (a + b)
}

export type QuadrantKey = "both" | "starter" | "later" | "neither"

export interface Quadrant {
  key: QuadrantKey
  label: string
  description: string
  count: number
  share: number
  examples: string[]
}

export interface BalancedRanking extends MetricRanking {
  quadrants: Quadrant[]
  /** パレート最適（他社に完全には劣らない）企業数 */
  paretoCount: number
  paretoNames: string[]
}

export const BALANCED_DEF: MetricRankingDef = {
  slug: "balanced",
  path: "/ranking/balanced",
  title: "初任給も平均年収も高い企業ランキング｜入社時も入社後も高待遇",
  h1: "初任給×平均年収ランキング",
  subtitle: "入社時の初任給と、入社後の平均年収の両方が高い企業",
  shortLabel: "初任給×年収",
  valueLabel: "両立スコア",
  definition:
    "初任給と平均年収それぞれの順位を0〜100のパーセンタイルに直し、その調和平均をとった数値です。100に近いほど両方が高く、どちらか一方が低いとスコアは伸びません。",
  // 実際の値は buildBalancedRanking が直接計算する。型を満たすためのスタブ。
  extract: () => null,
  format: (v: number) => `${Math.round(v)}`,
  extras: () => [],
  note:
    `両立スコアは初任給と平均年収のパーセンタイル（0〜100）の調和平均です。片方だけが高い企業のスコアは伸びない計算になっています。${LISTED_COMPANY_NOTE}`,
}

/**
 * 初任給と平均年収の両方が揃っている企業だけを対象に、両立度でランキングする。
 *
 * @param all 全掲載企業（重複行を含んでよい）
 */
export function buildBalancedRanking(all: CompanyData[]): BalancedRanking | null {
  const unique = dedupeByCompany(all)

  // 両方の数値が揃っている企業だけが対象。
  // 片方しか無い企業を0点として混ぜると、データ欠損が低評価に見えてしまう。
  const rows = unique
    .map((company) => ({
      company,
      starter: starterAnnualYen(company),
      average: averageAnnualYen(company),
    }))
    .filter(
      (r): r is { company: CompanyData; starter: number; average: number } =>
        r.starter !== null && r.average !== null,
    )

  if (rows.length < 10) return null

  const starters = rows.map((r) => r.starter).sort((a, b) => a - b)
  const averages = rows.map((r) => r.average).sort((a, b) => a - b)

  const scored = rows
    .map((r) => {
      const sp = percentileOf(starters, r.starter)
      const ap = percentileOf(averages, r.average)
      return { ...r, starterPct: sp, averagePct: ap, score: harmonicMean(sp, ap) }
    })
    .sort((a, b) => b.score - a.score)

  // ---- パレート最適（非劣解）----
  // 「初任給も平均年収も、この企業より高い企業が1社も存在しない」企業。
  // 数学的には他社に完全には負けていないことを意味し、
  // トレードオフの最前線に立っている企業だと言える。
  // どちらを重視するかに関わらず候補に残る、という強い意味を持つ。
  const paretoSet = new Set<CompanyData>()
  for (const a of scored) {
    const dominated = scored.some(
      (b) =>
        b !== a &&
        b.starter >= a.starter &&
        b.average >= a.average &&
        (b.starter > a.starter || b.average > a.average),
    )
    if (!dominated) paretoSet.add(a.company)
  }

  const values = scored.map((s) => s.score)
  const rankOf = (v: number) => values.filter((x) => x > v).length + 1

  // 【表示の主役】両立スコアは当サイト独自の指標で検索需要がない。
  // 読者が実際に知りたいのは金額そのものなので、初任給と平均年収を
  // 大きく出し、スコアは小さく添えるだけにする（primary を使う）。
  const entries: RankedCompany[] = scored.map((s) => ({
    rank: rankOf(s.score),
    company: s.company,
    value: s.score,
    display: `${Math.round(s.score)}`,
    primary: [
      {
        label: "初任給（月額）",
        value: positive(s.company.baseMonthly) ? yen(s.company.baseMonthly as number) : "-",
      },
      { label: "平均年収", value: manYen(s.average / MAN) },
    ],
    extras: [
      {
        label: "上位％（初任給／年収）",
        value: `${Math.round(100 - s.starterPct)}％／${Math.round(100 - s.averagePct)}％`,
      },
    ],
    badge: paretoSet.has(s.company) ? "両方で勝る企業なし" : undefined,
  }))

  const med = median(values)!

  // ---- 業界別の中央値 ----
  const byIndustry = new Map<string, number[]>()
  for (const s of scored) {
    for (const raw of (s.company.industry ?? "").split("/")) {
      const industry = raw.trim()
      if (!industry) continue
      if (!byIndustry.has(industry)) byIndustry.set(industry, [])
      byIndustry.get(industry)!.push(s.score)
    }
  }
  const industryAverages: IndustryAverage[] = Array.from(byIndustry.entries())
    .filter(([, vs]) => vs.length >= 3)
    .map(([industry, vs]) => {
      const m = median(vs)!
      return { industry, value: m, display: `${Math.round(m)}`, count: vs.length }
    })
    .sort((a, b) => b.value - a.value)

  // ---- 4象限分類 ----
  // 中央値で区切って、企業のタイプを4つに分ける。
  // 「両方高い」以外の3タイプにも意味があり、
  // 読者が自分の重視するものを選ぶ材料になる。
  const medStarter = median(starters)!
  const medAverage = median(averages)!
  const buckets: Record<QuadrantKey, typeof scored> = {
    both: [],
    starter: [],
    later: [],
    neither: [],
  }
  for (const s of scored) {
    const hiStart = s.starter >= medStarter
    const hiAvg = s.average >= medAverage
    const key: QuadrantKey = hiStart && hiAvg ? "both" : hiStart ? "starter" : hiAvg ? "later" : "neither"
    buckets[key].push(s)
  }

  const QUADRANT_META: { key: QuadrantKey; label: string; description: string }[] = [
    {
      key: "both",
      label: "両取り型",
      description:
        "初任給も平均年収も中央値以上。入社時点で高く、入社後も高い水準が続くタイプです。",
    },
    {
      key: "starter",
      label: "入口重視型",
      description:
        "初任給は高いものの、平均年収は中央値を下回るタイプ。採用時の条件を厚くしている企業が含まれます。入社後の伸びは緩やかになりやすい傾向があります。",
    },
    {
      key: "later",
      label: "後伸び型",
      description:
        "初任給は中央値以下でも、平均年収は高いタイプ。入社時の金額だけを見ていると候補から外してしまう企業です。",
    },
    {
      key: "neither",
      label: "標準型",
      description:
        "どちらも中央値を下回るタイプ。ただし当サイトは初任給の高い企業を集めているため、世間一般の水準より低いという意味ではありません。",
    },
  ]

  const quadrants: Quadrant[] = QUADRANT_META.map((meta) => {
    const list = buckets[meta.key]
    return {
      ...meta,
      count: list.length,
      share: Math.round((list.length / scored.length) * 100),
      examples: list
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((s) => s.company.company),
    }
  })

  const paretoNames = scored
    .filter((s) => paretoSet.has(s.company))
    .map((s) => s.company.company)

  return {
    def: BALANCED_DEF,
    entries,
    count: scored.length,
    medianValue: med,
    medianDisplay: `${Math.round(med)}`,
    top: entries[0] ?? null,
    industryAverages,
    analysis: buildAnalysis(scored, quadrants, paretoNames, medStarter, medAverage),
    faq: buildFaq(scored, quadrants, paretoNames),
    quadrants,
    paretoCount: paretoNames.length,
    paretoNames,
  }
}

type Scored = {
  company: CompanyData
  starter: number
  average: number
  starterPct: number
  averagePct: number
  score: number
}

function buildAnalysis(
  scored: Scored[],
  quadrants: Quadrant[],
  paretoNames: string[],
  medStarter: number,
  medAverage: number,
): string[] {
  const paragraphs: string[] = []
  const top = scored[0]
  const both = quadrants.find((q) => q.key === "both")!
  const starterOnly = quadrants.find((q) => q.key === "starter")!
  const laterOnly = quadrants.find((q) => q.key === "later")!

  paragraphs.push(
    `初任給と平均年収の両方が分かる${scored.length}社を対象に、それぞれの順位を0〜100のパーセンタイルに直し、` +
      `その調和平均を「両立スコア」としました。片方だけが高い企業のスコアは伸びない計算です。` +
      `1位は${top.company.company}で、初任給は上位${Math.round(100 - top.starterPct)}％、平均年収は上位${Math.round(100 - top.averagePct)}％に入ります。`,
  )

  paragraphs.push(
    `対象企業を中央値（初任給ベース年収${manYen(medStarter / MAN)}、平均年収${manYen(medAverage / MAN)}）で4つに分けると、` +
      `両方が中央値以上の「両取り型」は${both.count}社（${both.share}%）にとどまりました。` +
      `初任給だけが高い「入口重視型」が${starterOnly.count}社、平均年収だけが高い「後伸び型」が${laterOnly.count}社です。` +
      `初任給が高いことと入社後も高いことは、別々の性質だと分かります。`,
  )

  if (paretoNames.length > 0) {
    paragraphs.push(
      `また、「初任給も平均年収も自社より高い企業が1社も存在しない」企業は${paretoNames.length}社ありました。` +
        `${paretoNames.slice(0, 5).join("、")}などがこれにあたります。` +
        `どちらの数字を重視するかに関わらず比較検討の対象に残る企業で、一覧では「両方で勝る企業なし」と表示しています。`,
    )
  }

  return paragraphs
}

function buildFaq(
  scored: Scored[],
  quadrants: Quadrant[],
  paretoNames: string[],
): { question: string; answer: string }[] {
  const top = scored[0]
  const both = quadrants.find((q) => q.key === "both")!

  return [
    {
      question: "初任給も平均年収も高い企業はどこですか？",
      answer:
        `当サイトで両方のデータが揃う${scored.length}社のうち、両立スコアが最も高いのは${top.company.company}です。` +
        `初任給は上位${Math.round(100 - top.starterPct)}％、平均年収は上位${Math.round(100 - top.averagePct)}％に位置しています。` +
        LISTED_COMPANY_NOTE,
    },
    {
      question: "両立スコアはどのように計算していますか？",
      answer:
        "初任給と平均年収それぞれについて、対象企業の中での順位を0〜100のパーセンタイルに変換し、その2つの調和平均をとっています。" +
        "調和平均は小さい方の数値に強く引っ張られるため、片方だけが高い企業のスコアは伸びません。" +
        "たとえば片方が100・もう片方が20の企業は33点、両方が60の企業は60点になります。" +
        "金額をそのまま足す方法は単位が違うため使えず、偏差値は一部の突出した企業に引きずられるため採用していません。",
    },
    {
      question: "初任給が高ければ平均年収も高いのではないですか？",
      answer:
        `そうとは限りません。両方が中央値以上の企業は${both.count}社（全体の${both.share}%）にとどまります。` +
        "初任給は採用市場での競争によって決まり、平均年収は入社後の給与制度と事業の収益力で決まるためです。" +
        "決まり方が違うので、両方を確認する必要があります。",
    },
    {
      question: "「両方で勝る企業なし」とはどういう意味ですか？",
      answer:
        `初任給も平均年収も自社より高い企業が1社も存在しない、という意味です（該当${paretoNames.length}社）。` +
        "どちらか一方では上回られていても、両方で上回られてはいない状態を指します。" +
        "初任給と平均年収のどちらを重視するかに関わらず、比較の候補に残る企業だと言えます。",
    },
  ]
}
