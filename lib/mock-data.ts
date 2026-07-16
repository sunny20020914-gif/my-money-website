import type { CompanyData, ArticleData, IndustryData, FeaturedCompanyData } from "./sheets"

// 【デバッグ用】MOCK_SHEETS=1 のときに使う疑似データ。
// Google Sheets API なしで本番同等のフルビルド（全企業・比較・条件ページの静的生成）を
// ローカルで再現し、プリレンダリングのエラーを特定するために使う。

const INDUSTRIES = [
  "IT", "メーカー", "外資/IT", "戦略コンサル", "金融/損保", "エンタメ/メーカー/金融",
  "商社", "製薬", "インターネット", "監査法人", "不動産投資", "SIer/ITコンサル",
]

export function mockRankingData(): CompanyData[] {
  const companies: CompanyData[] = []
  for (let i = 0; i < 135; i++) {
    companies.push({
      id: i % 17 === 0 ? `company-${i}` : `Comp${i}`,
      rank: i + 1,
      company: `テスト企業${i}`,
      industry: INDUSTRIES[i % INDUSTRIES.length],
      // 実データにある欠損・文字列値を再現
      annualSalary: i % 9 === 0 ? null : i % 7 === 0 ? "要確認" : 7_000_000 - i * 20_000,
      baseMonthly: i % 11 === 0 ? null : i % 5 === 0 ? "非公開" : 500_000 - i * 1_500,
      employees: i % 13 === 0 ? "?" : 100 + i * 120,
      founded: i % 10 === 0 ? 0 : i % 21 === 0 ? 6061 : 1950 + (i % 70),
      description: i % 3 === 0 ? "" : `テスト企業${i}の説明文です。`,
      url: i % 2 === 0 ? "https://example.com" : undefined,
      domain: i % 2 === 0 ? "example.com" : undefined,
      logo: undefined,
      salaryUrl: i % 4 === 0 ? "https://example.com/recruit" : undefined,
    })
  }
  return companies
}

export function mockDetailRow(id: string): any[] {
  return [id, `**${id}** の企業概要テキスト（モック）。`, "強みテキスト", "将来性テキスト", "給与補足テキスト"]
}

export function mockArticles(): ArticleData[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${Math.floor(i / 4) + 1}-${(i % 4) + 1}`,
    title: `テスト記事${i + 1}`,
    excerpt: "テスト記事の抜粋です。",
    content: "本文です。\n\n段落2。\n\n段落3。\n\n段落4。[[NEXT_PAGE]]2ページ目。",
    category: "テスト",
    publishedAt: new Date(2026, 0, i + 1).toISOString(),
    author: "編集部",
    readTime: 5,
    image: undefined,
  }))
}

export function mockIndustryData(): IndustryData[] {
  return INDUSTRIES.slice(0, 6).map((ind, i) => ({
    industry: ind.split("/")[0],
    averageAnnualSalary: 4_000_000 + i * 100_000,
    companyCount: 10 + i,
    description: `${ind}業界の説明`,
  }))
}

export function mockFeaturedCompanies(): FeaturedCompanyData[] {
  return [
    { company: "テスト企業1", industry: "IT", estimatedAnnualSalary: 6_000_000, reason: "注目理由", domainUrl: "example.com" },
  ]
}

export const isMockMode = () => process.env.MOCK_SHEETS === "1"
