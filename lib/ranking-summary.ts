import type { CompanyData } from "./sheets"

// 【SEO】ランキングページ冒頭の集計サマリー。
// 競合サイトが持つ「全体平均・業種別平均・調査概要」に相当する情報を
// 取得済みデータの集計だけで生成する（＝当サイトの独自データ）。

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

const splitIndustries = (industry: string): string[] =>
  (industry || "")
    .split("/")
    .map((i) => i.trim())
    .filter(Boolean)

export interface IndustryAvg {
  industry: string
  count: number
  avgMonthly: number
}

export interface RankingSummary {
  /** 掲載企業総数 */
  totalListed: number
  /** 初任給（数値）がある企業数 */
  withMonthly: number
  avgMonthly: number | null
  medianMonthly: number | null
  topCompany: string | null
  topMonthly: number | null
  over40: number
  over35: number
  over30: number
  /** 業種別平均（3社以上の業界のみ・平均の高い順） */
  industryAverages: IndustryAvg[]
}

export function buildRankingSummary(all: CompanyData[]): RankingSummary {
  const monthlies = all
    .map((c) => ({ c, v: num(c.baseMonthly) }))
    .filter((x): x is { c: CompanyData; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)

  const values = monthlies.map((x) => x.v)
  const avgMonthly =
    values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null
  const medianMonthly =
    values.length > 0
      ? values.length % 2 === 1
        ? values[(values.length - 1) / 2]
        : Math.round((values[values.length / 2 - 1] + values[values.length / 2]) / 2)
      : null

  // 業種別平均
  const byIndustry = new Map<string, number[]>()
  for (const { c, v } of monthlies) {
    for (const ind of splitIndustries(c.industry)) {
      const arr = byIndustry.get(ind) ?? []
      arr.push(v)
      byIndustry.set(ind, arr)
    }
  }
  const industryAverages: IndustryAvg[] = Array.from(byIndustry.entries())
    .filter(([, arr]) => arr.length >= 3)
    .map(([industry, arr]) => ({
      industry,
      count: arr.length,
      avgMonthly: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
    }))
    .sort((a, b) => b.avgMonthly - a.avgMonthly)

  return {
    totalListed: all.length,
    withMonthly: values.length,
    avgMonthly,
    medianMonthly,
    topCompany: monthlies[0]?.c.company ?? null,
    topMonthly: monthlies[0]?.v ?? null,
    over40: values.filter((v) => v >= 400_000).length,
    over35: values.filter((v) => v >= 350_000).length,
    over30: values.filter((v) => v >= 300_000).length,
    industryAverages,
  }
}
