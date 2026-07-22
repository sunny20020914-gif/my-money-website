import type { CompanyData } from "./sheets"
import type { FaqItem } from "./company-stats"

// 取得済みのランキングデータ「だけ」から業界別の分析コンテキストを計算するヘルパー。
// 企業詳細ページの lib/company-stats.ts と同じ思想で、AI・外部APIは一切使わない。
// スプレッドシート側のロジック（手書きの「業界別データ」タブ等）にも依存しない。
// 企業が複数業界（"IT/通信" のように / 区切り）に属する場合は各業界にカウントする。

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

const yen = (n: number) => `${n.toLocaleString()}円`

const splitIndustries = (industry: string): string[] =>
  (industry || "")
    .split("/")
    .map((i) => i.trim())
    .filter(Boolean)

const average = (values: number[]): number | null =>
  values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

// 1業界あたりの分析結果
export interface IndustryAnalysis {
  industry: string
  /** 業界に属する掲載企業の総数 */
  totalCount: number
  /** 初任給（月額）データがある企業数 */
  count: number
  avgMonthly: number | null
  medianMonthly: number | null
  maxMonthly: number | null
  minMonthly: number | null
  avgAnnual: number | null
  /** 初任給が最も高い企業 */
  maxCompany: CompanyData | null
  /** 初任給の高い順トップN */
  topCompanies: CompanyData[]
  /** 業界の全企業（初任給の高い順、月額データがある企業のみ） */
  companies: CompanyData[]
}

// サイト全体の集計
export interface OverallStats {
  industryCount: number
  totalCompanies: number
  withMonthly: number
  avgMonthly: number | null
  medianMonthly: number | null
}

/**
 * 全業界の分析を平均初任給の高い順に並べて返す。
 * @param all ランキングデータ（fetchRankingDataServer("monthly") 等）
 * @param topN 各業界のトップ企業として保持する件数
 */
export function buildIndustryAnalyses(all: CompanyData[], topN = 3): IndustryAnalysis[] {
  const map = new Map<string, CompanyData[]>()
  for (const c of all) {
    for (const ind of splitIndustries(c.industry)) {
      if (!map.has(ind)) map.set(ind, [])
      map.get(ind)!.push(c)
    }
  }

  const analyses: IndustryAnalysis[] = []
  for (const [industry, companies] of map) {
    const withMonthly = companies.filter((c) => num(c.baseMonthly) !== null)
    const monthlies = withMonthly.map((c) => num(c.baseMonthly) as number)
    const annuals = companies
      .map((c) => num(c.annualSalary))
      .filter((v): v is number => v !== null)
    const sortedByMonthly = [...withMonthly].sort(
      (a, b) => (num(b.baseMonthly) as number) - (num(a.baseMonthly) as number),
    )

    analyses.push({
      industry,
      totalCount: companies.length,
      count: withMonthly.length,
      avgMonthly: average(monthlies),
      medianMonthly: median(monthlies),
      maxMonthly: monthlies.length > 0 ? Math.max(...monthlies) : null,
      minMonthly: monthlies.length > 0 ? Math.min(...monthlies) : null,
      avgAnnual: average(annuals),
      maxCompany: sortedByMonthly[0] ?? null,
      topCompanies: sortedByMonthly.slice(0, topN),
      companies: sortedByMonthly,
    })
  }

  // 平均初任給の降順（データなしは末尾）
  return analyses.sort((a, b) => (b.avgMonthly ?? -1) - (a.avgMonthly ?? -1))
}

/** 平均初任給が算出できた業界だけをランキング対象として返す */
export const rankableIndustries = (analyses: IndustryAnalysis[]): IndustryAnalysis[] =>
  analyses.filter((a) => a.avgMonthly !== null)

export function buildOverallStats(
  all: CompanyData[],
  analyses: IndustryAnalysis[],
): OverallStats {
  const withMonthly = all.filter((c) => num(c.baseMonthly) !== null)
  const monthlies = withMonthly.map((c) => num(c.baseMonthly) as number)
  return {
    industryCount: analyses.length,
    totalCompanies: all.length,
    withMonthly: withMonthly.length,
    avgMonthly: average(monthlies),
    medianMonthly: median(monthlies),
  }
}

/** ある業界が全業界中で平均初任給何位かを返す（1始まり）。算出不能なら null */
export function industryRank(
  analyses: IndustryAnalysis[],
  industry: string,
): { rank: number; total: number } | null {
  const ranked = rankableIndustries(analyses)
  const idx = ranked.findIndex((a) => a.industry === industry)
  if (idx === -1) return null
  return { rank: idx + 1, total: ranked.length }
}

// ------------------------------------------------------------------
// 【AI SEO】データの穴埋めだけで生成する自己完結型テキスト。
// データがない項目には触れず、断定的な「将来性」等の主観は生成しない。
// ------------------------------------------------------------------

/** 業界ハブ（/industries）冒頭に置く要約文 */
export function buildHubSummary(
  analyses: IndustryAnalysis[],
  overall: OverallStats,
  fiscalYear: number,
): string {
  const ranked = rankableIndustries(analyses)
  const parts: string[] = []

  if (overall.avgMonthly !== null) {
    parts.push(
      `当サイト掲載の主要${overall.industryCount}業界・${overall.withMonthly}社の初任給（月額）データを集計しました。全体の平均初任給は月額${yen(overall.avgMonthly)}` +
        (overall.medianMonthly !== null ? `、中央値は${yen(overall.medianMonthly)}です（${fiscalYear}年度・当サイト調べ）。` : `です（${fiscalYear}年度・当サイト調べ）。`),
    )
  }

  const top = ranked.slice(0, 3).filter((a) => a.avgMonthly !== null)
  if (top.length > 0) {
    const topText = top
      .map((a) => `${a.industry}（月額${yen(a.avgMonthly as number)}）`)
      .join("、")
    parts.push(`平均初任給が高い業界は${topText}の順です。`)
  }

  parts.push("各業界の平均・中央値・初任給レンジ・トップ企業を比較して、志望業界選びの参考にしてください。")
  return parts.join("")
}

/** 業界詳細（/industries/[industry]）冒頭に置く要約文 */
export function buildIndustryLeadSummary(
  a: IndustryAnalysis,
  overall: OverallStats,
  rank: { rank: number; total: number } | null,
  fiscalYear: number,
): string {
  const parts: string[] = []

  if (a.avgMonthly !== null) {
    let head = `${a.industry}業界の平均初任給は月額${yen(a.avgMonthly)}です（掲載${a.count}社・${fiscalYear}年度・当サイト調べ）。`
    if (rank) {
      head += `全${rank.total}業界中${rank.rank}位の水準で、`
    }
    if (overall.avgMonthly !== null) {
      const diff = a.avgMonthly - overall.avgMonthly
      const diffText =
        diff === 0
          ? "全体平均とほぼ同水準です。"
          : diff > 0
            ? `全体平均（月額${yen(overall.avgMonthly)}）を${yen(diff)}上回ります。`
            : `全体平均（月額${yen(overall.avgMonthly)}）を${yen(Math.abs(diff))}下回ります。`
      head += diffText
    }
    parts.push(head)
  }

  if (a.maxCompany && a.maxMonthly !== null && a.minMonthly !== null) {
    parts.push(
      `業界内で初任給が最も高いのは${a.maxCompany.company}（月額${yen(a.maxMonthly)}）で、初任給レンジは${yen(a.minMonthly)}〜${yen(a.maxMonthly)}です。`,
    )
  }

  return parts.join("")
}

/** 業界詳細ページ用のFAQ（データの穴埋めで生成・FAQPageスキーマと同一内容にする） */
export function buildIndustryFaq(
  a: IndustryAnalysis,
  overall: OverallStats,
  rank: { rank: number; total: number } | null,
  fiscalYear: number,
): FaqItem[] {
  const faq: FaqItem[] = []

  if (a.avgMonthly !== null) {
    let answer = `${a.industry}業界の平均初任給は月額${yen(a.avgMonthly)}です（掲載${a.count}社・${fiscalYear}年度・当サイト調べ）。`
    if (a.medianMonthly !== null) answer += `中央値は${yen(a.medianMonthly)}です。`
    faq.push({ question: `${a.industry}業界の平均初任給はいくらですか？`, answer })
  }

  if (a.maxCompany && a.maxMonthly !== null) {
    const annual = num(a.maxCompany.annualSalary)
    faq.push({
      question: `${a.industry}業界で初任給が最も高い企業はどこですか？`,
      answer:
        `${a.maxCompany.company}で、初任給は月額${yen(a.maxMonthly)}です` +
        (annual !== null ? `（想定年収${yen(annual)}）。` : "。"),
    })
  }

  if (a.avgMonthly !== null && overall.avgMonthly !== null && rank) {
    const diff = a.avgMonthly - overall.avgMonthly
    const diffText =
      diff === 0
        ? "全体平均とほぼ同水準です"
        : diff > 0
          ? `全体平均より${yen(diff)}高い水準です`
          : `全体平均より${yen(Math.abs(diff))}低い水準です`
    faq.push({
      question: `${a.industry}業界の初任給は他の業界と比べて高いですか？`,
      answer: `${a.industry}業界の平均初任給（月額${yen(a.avgMonthly)}）は全${rank.total}業界中${rank.rank}位で、${diffText}。`,
    })
  }

  return faq
}
