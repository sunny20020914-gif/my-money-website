import type { CompanyData } from "./sheets"

// 取得済みのランキングデータだけから比較コンテキストを計算するヘルパー。
// AI・外部APIは一切使わない。スプシ側のロジックにも影響しない。

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

const yen = (n: number) => `${n.toLocaleString()}円`

export interface CompanyStats {
  industry: string // 主業界（"IT/通信" の場合は "IT"）
  rankInIndustry: number | null
  totalInIndustry: number
  industryAvgMonthly: number | null
  diffFromAvgMonthly: number | null
  overallRankMonthly: number | null
  totalWithMonthly: number
  relatedCompanies: CompanyData[]
}

export function computeCompanyStats(
  all: CompanyData[],
  company: CompanyData,
  relatedLimit = 6,
): CompanyStats {
  const primaryIndustry = (company.industry || "").split("/")[0]?.trim() || ""

  const peers = primaryIndustry
    ? all.filter((c) =>
        c.industry
          .split("/")
          .map((i) => i.trim())
          .includes(primaryIndustry),
      )
    : []

  // 月額初任給が数値で入っている企業のみを統計対象にする
  const peersWithMonthly = peers.filter((c) => num(c.baseMonthly) !== null)
  const allWithMonthly = all.filter((c) => num(c.baseMonthly) !== null)
  const myMonthly = num(company.baseMonthly)

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

  const overallRankMonthly =
    myMonthly !== null
      ? allWithMonthly.filter((c) => (num(c.baseMonthly) as number) > myMonthly).length + 1
      : null

  // 同業界の関連企業（自社を除き、初任給の高い順）
  const relatedCompanies = peers
    .filter((c) => c.id !== company.id)
    .sort((a, b) => (num(b.baseMonthly) ?? 0) - (num(a.baseMonthly) ?? 0))
    .slice(0, relatedLimit)

  return {
    industry: primaryIndustry,
    rankInIndustry,
    totalInIndustry: peersWithMonthly.length,
    industryAvgMonthly,
    diffFromAvgMonthly:
      myMonthly !== null && industryAvgMonthly !== null ? myMonthly - industryAvgMonthly : null,
    overallRankMonthly,
    totalWithMonthly: allWithMonthly.length,
    relatedCompanies,
  }
}

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

  if (stats.rankInIndustry !== null && stats.totalInIndustry > 1) {
    let rankText = `${stats.industry}業界${stats.totalInIndustry}社中${stats.rankInIndustry}位`
    if (stats.overallRankMonthly !== null && stats.totalWithMonthly > 1) {
      rankText += `、掲載企業全体では${stats.totalWithMonthly}社中${stats.overallRankMonthly}位`
    }
    parts.push(`初任給は${rankText}の水準です。`)
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
  const faq: FaqItem[] = []

  if (monthly !== null) {
    let answer = `${company.company}の初任給は月額${yen(monthly)}です（${fiscalYear}年度・当サイト調べ）。`
    if (stats.rankInIndustry !== null && stats.totalInIndustry > 1) {
      answer += `${stats.industry}業界${stats.totalInIndustry}社中${stats.rankInIndustry}位の水準です。`
    }
    faq.push({ question: `${company.company}の初任給はいくらですか？`, answer })
  }

  if (annual !== null) {
    faq.push({
      question: `${company.company}の想定年収はいくらですか？`,
      answer: `${company.company}の新卒想定年収は${yen(annual)}です（${fiscalYear}年度・当サイト調べ）。賞与や残業代を含んだ理論値であり、実際の支給額とは異なる場合があります。`,
    })
  }

  if (monthly !== null && stats.industryAvgMonthly !== null && stats.diffFromAvgMonthly !== null && stats.totalInIndustry > 1) {
    const diff = stats.diffFromAvgMonthly
    const diffText =
      diff === 0
        ? "業界平均とほぼ同じ水準です"
        : diff > 0
          ? `業界平均より${yen(diff)}高い水準です`
          : `業界平均より${yen(Math.abs(diff))}低い水準です`
    faq.push({
      question: `${company.company}の初任給は${stats.industry}業界の平均と比べて高いですか？`,
      answer: `${stats.industry}業界（掲載${stats.totalInIndustry}社）の平均初任給は月額${yen(stats.industryAvgMonthly)}で、${company.company}は${diffText}。`,
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
