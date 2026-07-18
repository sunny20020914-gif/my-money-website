import { fetchRankingDataServer } from "@/lib/sheets"
import { buildAllListDefinitions } from "@/lib/list-definitions"
import { CompanyLogo } from "@/components/company-logo"
import React from "react"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Metadata } from "next"
import { AdBanner } from "@/components/ad-banner"
import { ChevronLeft } from "lucide-react"

type Props = { params: { industry: string } }

export const revalidate = 3600

// スプシの業界データから全業界を取得してページを静的生成
export async function generateStaticParams() {
  const companies = await fetchRankingDataServer("monthly")
  const industries = new Set(
    companies.flatMap((c) => c.industry.split("/").map((i) => i.trim())).filter(Boolean)
  )
  // 【重要】生の値を返す（Next.jsがビルド時にエンコードするため、
  // encodeURIComponent済みの値を返すと二重エンコードになり日本語URLが404になる）
  return Array.from(industries).map((industry) => ({ industry }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const industry = decodeURIComponent(params.industry)
  const allCompanies = await fetchRankingDataServer("monthly")
  const companies = allCompanies
    .filter((c) => c.industry.split("/").map((i) => i.trim()).includes(industry))
    .sort((a, b) => a.rank - b.rank)

  if (companies.length === 0) return { title: "業界が見つかりません" }

  const top = companies[0]
  const topSalary =
    typeof top.baseMonthly === "number"
      ? `¥${top.baseMonthly.toLocaleString()}`
      : String(top.baseMonthly)

  const description = `【2026年最新】${industry}業界の初任給ランキング（${companies.length}社）。1位${top.company}（初任給${topSalary}/月）。各社の初任給・想定年収・従業員数を比較できます。`

  return {
    title: `${industry}業界 初任給ランキング 2026【${companies.length}社】`,
    description,
    alternates: {
      canonical: `https://www.mymoneyweb.com/industries/${encodeURIComponent(industry)}`,
    },
    openGraph: {
      title: `${industry}業界 初任給ランキング 2026`,
      description,
    },
  }
}

export default async function IndustryPage({ params }: Props) {
  const industry = decodeURIComponent(params.industry)
  const allCompanies = await fetchRankingDataServer("monthly")
  const companies = allCompanies
    .filter((c) => c.industry.split("/").map((i) => i.trim()).includes(industry))
    .sort((a, b) => a.rank - b.rank)

  if (companies.length === 0) notFound()

  // この業界のクロス条件一覧ページ（業界×給与閾値）
  const industryDefs = buildAllListDefinitions(allCompanies).filter((d) => d.industry === industry)

  // 平均初任給（数値のみで計算）
  const numericSalaries = companies
    .map((c) => (typeof c.baseMonthly === "number" ? c.baseMonthly : null))
    .filter((v): v is number => v !== null)
  const avgSalary =
    numericSalaries.length > 0
      ? Math.round(numericSalaries.reduce((a, b) => a + b, 0) / numericSalaries.length)
      : null

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${industry}業界 初任給ランキング 2026`,
    numberOfItems: companies.length,
    itemListElement: companies.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.company,
      url: `https://www.mymoneyweb.com/companies/${c.id}`,
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: "https://www.mymoneyweb.com/" },
      { "@type": "ListItem", position: 2, name: "業界別分析", item: "https://www.mymoneyweb.com/industries" },
      { "@type": "ListItem", position: 3, name: `${industry}業界`, item: `https://www.mymoneyweb.com/industries/${encodeURIComponent(industry)}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">

            {/* パンくず */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <span>/</span>
              <Link href="/industries" className="hover:text-primary transition-colors">業界別分析</Link>
              <span>/</span>
              <span className="text-foreground font-medium">{industry}業界</span>
            </nav>

            {/* ヘッダー */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-primary mb-3">
                {industry}業界 初任給ランキング 2026
              </h1>
              <p className="text-muted-foreground text-base md:text-lg mb-4">
                {industry}業界の新卒初任給・想定年収データ（{companies.length}社掲載）
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="bg-primary/10 text-primary rounded-lg px-4 py-2 font-medium">
                  掲載企業数：{companies.length}社
                </div>
                {avgSalary && (
                  <div className="bg-muted rounded-lg px-4 py-2 text-muted-foreground">
                    平均初任給：¥{avgSalary.toLocaleString()}/月
                  </div>
                )}
              </div>
              {/* 【SEO】業界×給与のクロス条件一覧への内部リンク */}
              {industryDefs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {industryDefs
                    .sort((a, b) => a.threshold - b.threshold)
                    .map((d) => (
                      <Button key={d.slug} asChild variant="outline" size="sm" className="bg-transparent">
                        <Link href={`/lists/${encodeURIComponent(d.slug)}`}>
                          初任給{d.threshold / 10000}万円以上に絞る（{d.count}社）
                        </Link>
                      </Button>
                    ))}
                </div>
              )}
            </div>

            <AdBanner />

            {/* 企業リスト */}
            <div className="space-y-3 mt-6">
              {companies.map((company, index) => {
                const monthly = company.baseMonthly ?? company.monthlySalary ?? company.baseSalary
                const isNumericMonthly = typeof monthly === "number"
                const isNumericAnnual = typeof company.annualSalary === "number"

                return (
                  <React.Fragment key={company.id || company.company}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-4">
                        {/* 順位 */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-base shrink-0">
                          {index + 1}
                        </div>

                        {/* ロゴ */}
                        <CompanyLogo
                          logo={company.logo}
                          domain={company.domain}
                          company={company.company}
                          size={44}
                          className="w-11 h-11 rounded-lg object-contain shrink-0"
                        />

                        {/* 企業名・業界 */}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-base font-bold text-foreground truncate">{company.company}</h2>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {company.industry.split("/").map((ind, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5">{ind.trim()}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* 給与情報 */}
                        <div className="hidden sm:flex flex-col items-end shrink-0 gap-0.5">
                          <div className="text-xs text-muted-foreground">初任給</div>
                          <div className="text-lg font-bold text-primary">
                            {isNumericMonthly ? `¥${(monthly as number).toLocaleString()}` : (monthly ?? "—")}
                            {isNumericMonthly && <span className="text-xs font-normal text-muted-foreground">/月</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            年収：{isNumericAnnual ? `¥${(company.annualSalary as number).toLocaleString()}` : (company.annualSalary ?? "—")}
                          </div>
                        </div>

                        {/* 詳しくボタン */}
                        {company.id && (
                          <Button asChild variant="outline" size="sm" className="shrink-0 bg-transparent">
                            <Link href={`/companies/${company.id}`}>詳しく</Link>
                          </Button>
                        )}
                      </div>

                      {/* スマホ用給与表示 */}
                      <div className="sm:hidden mt-3 pl-14 flex gap-6">
                        <div>
                          <div className="text-xs text-muted-foreground">初任給</div>
                          <div className="text-base font-bold text-primary">
                            {isNumericMonthly ? `¥${(monthly as number).toLocaleString()}` : (monthly ?? "—")}
                            {isNumericMonthly && <span className="text-xs font-normal text-muted-foreground">/月</span>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">想定年収</div>
                          <div className="text-sm font-semibold text-foreground">
                            {isNumericAnnual ? `¥${(company.annualSalary as number).toLocaleString()}` : (company.annualSalary ?? "—")}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* 8社ごとに広告を挿入 */}
                  {(index + 1) % 8 === 0 && index + 1 < companies.length && <AdBanner />}
                  </React.Fragment>
                )
              })}
            </div>

            <AdBanner />

            <div className="mt-8 flex gap-3">
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/industries">
                  <ChevronLeft className="mr-1 h-4 w-4" />業界一覧に戻る
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/ranking">全企業ランキングを見る</Link>
              </Button>
            </div>

          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
