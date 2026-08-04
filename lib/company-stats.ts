import type { CompanyData } from "./sheets"
import { estimateNetSalary, roundNet } from "./net-salary"

// 取得済みのランキングデータだけから比較コンテキストを計算するヘルパー。
// AI・外部APIは一切使わない。スプシ側のロジックにも影響しない。
// 企業が複数業界に属する場合（"IT/通信" のように / 区切り）は全業界分の統計を返す。

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

const yen = (n: number) => `${n.toLocaleString()}円`

const splitIndustries = (industry: string): string[] =>
  (industry || "")
    .split("/")
    .map((i) => i.trim())
    .filter(Boolean)

// 1業界あたりの統計
export interface IndustryStat {
  industry: string
  rankInIndustry: number | null
  totalInIndustry: number
  industryAvgMonthly: number | null
  diffFromAvgMonthly: number | null
}

export interface CompanyStats {
  industryStats: IndustryStat[] // 所属する全業界分
  overallRankMonthly: number | null
  totalWithMonthly: number
  relatedCompanies: CompanyData[] // 全所属業界の企業を統合（重複排除）
}

export function computeCompanyStats(
  all: CompanyData[],
  company: CompanyData,
  relatedLimit = 6,
): CompanyStats {
  const industries = splitIndustries(company.industry)
  const myMonthly = num(company.baseMonthly)
  const allWithMonthly = all.filter((c) => num(c.baseMonthly) !== null)

  // 業界ごとの順位・平均を計算
  const industryStats: IndustryStat[] = industries.map((ind) => {
    const peersWithMonthly = all.filter(
      (c) => splitIndustries(c.industry).includes(ind) && num(c.baseMonthly) !== null,
    )

    const industryAvgMonthly =
      peersWithMonthly.length > 0
        ? Math.round(
            peersWithMonthly.reduce((s, c) => s + (num(c.baseMonthly) as number), 0) /
              peersWithMonthly.length,
          )
        : null

    const rankInIndustry =
      myMonthly !== null
        ? peersWithMonthly.filter((c) => (num(c.baseMonthly) as number) > myMonthly).length + 1
        : null

    return {
      industry: ind,
      rankInIndustry,
      totalInIndustry: peersWithMonthly.length,
      industryAvgMonthly,
      diffFromAvgMonthly:
        myMonthly !== null && industryAvgMonthly !== null ? myMonthly - industryAvgMonthly : null,
    }
  })

  const overallRankMonthly =
    myMonthly !== null
      ? allWithMonthly.filter((c) => (num(c.baseMonthly) as number) > myMonthly).length + 1
      : null

  // 関連企業: 所属する全業界の企業を統合し、id で重複排除して初任給の高い順
  const relatedMap = new Map<string, CompanyData>()
  for (const c of all) {
    if (c.id === company.id) continue
    const cIndustries = splitIndustries(c.industry)
    if (industries.some((ind) => cIndustries.includes(ind))) {
      relatedMap.set(c.id, c)
    }
  }
  const relatedCompanies = Array.from(relatedMap.values())
    .sort((a, b) => (num(b.baseMonthly) ?? 0) - (num(a.baseMonthly) ?? 0))
    .slice(0, relatedLimit)

  return {
    industryStats,
    overallRankMonthly,
    totalWithMonthly: allWithMonthly.length,
    relatedCompanies,
  }
}

// 順位情報がある（業界内に比較対象が2社以上いる）業界だけを返す
export const rankedIndustries = (stats: CompanyStats): IndustryStat[] =>
  stats.industryStats.filter((s) => s.rankInIndustry !== null && s.totalInIndustry > 1)

// 【AI SEO】ページ冒頭に置く「答えを先に書く」自己完結型サマリー。
// AI検索エンジンがこの一文だけで引用できる形にする。
export function buildLeadSummary(
  company: CompanyData,
  stats: CompanyStats,
  fiscalYear: number,
): string {
  const monthly = num(company.baseMonthly)
  const annual = num(company.annualSalary)

  const parts: string[] = []

  if (monthly !== null && annual !== null) {
    parts.push(
      `${company.company}の初任給は月額${yen(monthly)}、想定年収は${yen(annual)}です（${fiscalYear}年度）。`,
    )
  } else if (monthly !== null) {
    parts.push(`${company.company}の初任給は月額${yen(monthly)}です（${fiscalYear}年度）。`)
  } else if (annual !== null) {
    parts.push(`${company.company}の想定年収は${yen(annual)}です（${fiscalYear}年度）。`)
  }

  const ranked = rankedIndustries(stats)
  if (ranked.length > 0) {
    const industryTexts = ranked.map(
      (s) => `${s.industry}業界${s.totalInIndustry}社中${s.rankInIndustry}位`,
    )
    if (stats.overallRankMonthly !== null && stats.totalWithMonthly > 1) {
      industryTexts.push(`掲載企業全体では${stats.totalWithMonthly}社中${stats.overallRankMonthly}位`)
    }
    parts.push(`初任給は${industryTexts.join("、")}の水準です。`)
  }

  return parts.join("")
}

export interface FaqItem {
  question: string
  answer: string
}

// 全てスプシの取得済みデータの穴埋めで生成するFAQ。データがない質問は出さない。
export function buildFaq(
  company: CompanyData,
  stats: CompanyStats,
  fiscalYear: number,
): FaqItem[] {
  const monthly = num(company.baseMonthly)
  const annual = num(company.annualSalary)
  const ranked = rankedIndustries(stats)
  const faq: FaqItem[] = []

  if (monthly !== null) {
    let answer = `${company.company}の初任給は月額${yen(monthly)}です（${fiscalYear}年度・当サイト調べ）。`
    if (ranked.length > 0) {
      const rankTexts = ranked.map(
        (s) => `${s.industry}業界${s.totalInIndustry}社中${s.rankInIndustry}位`,
      )
      answer += `${rankTexts.join("、")}の水準です。`
    }
    faq.push({ question: `${company.company}の初任給はいくらですか？`, answer })
  }

  // 【SEO】「企業名 初任給 手取り」は実測でCTR50%・平均6.5位を記録している主力クエリ。
  // 検索結果のスニペットにそのまま答えが出るよう、金額を文頭付近に置く。
  const net = estimateNetSalary(monthly)
  if (net !== null) {
    faq.push({
      question: `${company.company}の初任給の手取りはいくらですか？`,
      answer:
        `額面${yen(net.grossMonthly)}から社会保険料（約${yen(net.socialInsuranceTotal)}）と所得税（約${yen(net.incomeTaxMonthly)}）を差し引いた1年目の手取りは月額約${yen(roundNet(net.netMonthlyFirstYear))}です（独身・扶養なしの概算）。` +
        `新卒1年目は住民税が徴収されないため、住民税（月約${yen(net.residentTaxMonthly)}）が始まる2年目以降の手取りは約${yen(roundNet(net.netMonthlySecondYear))}が目安です。`,
    })
  }

  if (annual !== null) {
    faq.push({
      question: `${company.company}の想定年収はいくらですか？`,
      answer: `${company.company}の新卒想定年収は${yen(annual)}です（${fiscalYear}年度・当サイト調べ）。賞与や残業代を含んだ理論値であり、実際の支給額とは異なる場合があります。`,
    })
  }

  // 業界平均との比較（全所属業界をまとめて1問で回答）
  const avgComparable = ranked.filter(
    (s) => s.industryAvgMonthly !== null && s.diffFromAvgMonthly !== null,
  )
  if (monthly !== null && avgComparable.length > 0) {
    const answerParts = avgComparable.map((s) => {
      const diff = s.diffFromAvgMonthly as number
      const diffText =
        diff === 0
          ? "ほぼ同水準"
          : diff > 0
            ? `${yen(diff)}高い水準`
            : `${yen(Math.abs(diff))}低い水準`
      return `${s.industry}業界（掲載${s.totalInIndustry}社）の平均初任給は月額${yen(s.industryAvgMonthly as number)}で、平均より${diffText}`
    })
    faq.push({
      question: `${company.company}の初任給は業界平均と比べて高いですか？`,
      answer: `${answerParts.join("。")}です。`,
    })
  }

  const employees = typeof company.employees === "number" ? company.employees : null
  if (employees !== null || company.founded) {
    const bits: string[] = []
    if (employees !== null) bits.push(`従業員数は約${employees.toLocaleString()}人`)
    if (company.founded) bits.push(`設立は${company.founded}年`)
    faq.push({
      question: `${company.company}はどんな会社ですか？`,
      answer: `${company.description ? company.description + " " : ""}${bits.join("、")}です。`,
    })
  }

  return faq
}

// 初任給の全体ランキングで前後に位置する企業（回遊導線用）
export function getRankNeighbors(
  all: CompanyData[],
  company: CompanyData,
): { prev: CompanyData | null; next: CompanyData | null; rank: number | null; total: number } {
  const sorted = all
    .filter((c) => num(c.baseMonthly) !== null)
    .sort((a, b) => (num(b.baseMonthly) as number) - (num(a.baseMonthly) as number))
  const idx = sorted.findIndex((c) => c.id === company.id)
  if (idx === -1) return { prev: null, next: null, rank: null, total: sorted.length }
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    rank: idx + 1,
    total: sorted.length,
  }
}

// 比較候補: 同業界で初任給が近い企業（比較ページへの導線・静的生成用）
export function getCompareCandidates(
  all: CompanyData[],
  company: CompanyData,
  limit = 4,
): CompanyData[] {
  const myMonthly = num(company.baseMonthly)
  if (myMonthly === null) return []
  const industries = splitIndustries(company.industry)
  return all
    .filter(
      (c) =>
        c.id !== company.id &&
        num(c.baseMonthly) !== null &&
        splitIndustries(c.industry).some((i) => industries.includes(i)),
    )
    .sort(
      (a, b) =>
        Math.abs((num(a.baseMonthly) as number) - myMonthly) -
        Math.abs((num(b.baseMonthly) as number) - myMonthly),
    )
    .slice(0, limit)
}
