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

// ------------------------------------------------------------------
// 【SEO】ランキングページ用のFAQ。
// 「初任給ランキング 2026」で検索する人が実際に知りたいこと
// （平均はいくら／1位はどこ／何社が30万円以上か）に、
// 集計済みデータの穴埋めだけで答える。AIや外部APIは使わない。
//
// 純粋関数にしているのは、サーバー側（FAQPage構造化データ）と
// クライアント側（画面表示）の両方から同じ入力で呼び出し、
// 内容を完全に一致させるため。ずれるとリッチリザルトの違反になる。
// ------------------------------------------------------------------

export interface RankingFaqItem {
  question: string
  answer: string
}

const yen = (n: number) => `${n.toLocaleString()}円`

export function buildRankingFaq(
  s: RankingSummary,
  fiscalYear: number,
): RankingFaqItem[] {
  const faq: RankingFaqItem[] = []

  if (s.avgMonthly !== null) {
    let a = `当サイト掲載${s.withMonthly}社の平均初任給は月額${yen(s.avgMonthly)}です（${fiscalYear}年度・当サイト調べ）。`
    if (s.medianMonthly !== null) {
      a += `中央値は${yen(s.medianMonthly)}で、平均は一部の高額企業に引き上げられるため、実感に近いのは中央値です。`
    }
    faq.push({ question: `${fiscalYear}年の新卒初任給の平均はいくらですか？`, answer: a })
  }

  if (s.topCompany && s.topMonthly !== null) {
    faq.push({
      question: `初任給が最も高い企業はどこですか？`,
      answer: `${fiscalYear}年度の当サイト掲載企業では${s.topCompany}が最も高く、初任給は月額${yen(s.topMonthly)}です。ランキングは月額（額面）を基準に並べています。`,
    })
  }

  if (s.withMonthly > 0) {
    faq.push({
      question: `初任給30万円以上の企業は何社ありますか？`,
      answer: `当サイト掲載${s.withMonthly}社のうち、月額30万円以上は${s.over30}社、35万円以上は${s.over35}社、40万円以上は${s.over40}社です（${fiscalYear}年度）。`,
    })
  }

  const top3 = s.industryAverages.slice(0, 3)
  if (top3.length > 0) {
    faq.push({
      question: `初任給が高い業界はどこですか？`,
      answer: `平均初任給が高い業界は${top3
        .map((r) => `${r.industry}（月額${yen(r.avgMonthly)}）`)
        .join("、")}の順です（掲載3社以上の業界で集計）。`,
    })
  }

  faq.push({
    question: `ランキングの初任給は手取り額ですか？`,
    answer: `いいえ、掲載しているのは額面（月額総支給）です。手取りは額面から社会保険料と税金が引かれるため、おおよそ額面の75〜85%が目安になります。各企業の詳細ページでは手取りの概算も掲載しています。`,
  })

  return faq
}
