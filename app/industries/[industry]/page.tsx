import { fetchAllUniqueCompanies } from "@/lib/sheets"
import type { CompanyData } from "@/lib/sheets"
import { buildAllListDefinitions } from "@/lib/list-definitions"
import {
  buildIndustryAnalyses,
  buildOverallStats,
  buildIndustryLeadSummary,
  buildIndustryFaq,
  industryRank,
} from "@/lib/industry-stats"
import { FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
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
import { ChevronLeft, TrendingUp, Trophy } from "lucide-react"
import { rankTier, RANK_BADGE, RANK_LOGO, RANK_NAME } from "@/lib/rank-tier"

type Props = { params: { industry: string } }

export const revalidate = REVALIDATE_STABLE

/**
 * 【404対策・重要】
 * 以前は fetchRankingDataServer("monthly")（＝初任給が数値の企業のみ）を母集団にしていた。
 * そのため「所属企業は居るが全員の初任給が未記載/『非公開』」という業界は
 * 該当0件となり notFound() が呼ばれ、「業界が見つかりません」ページになっていた。
 *
 * 企業詳細ページは自社の業界へリンクを張っているため、この状態だと
 * サイト内のリンクを辿っただけで404に着地してしまう（実際にアクセスが発生していた）。
 *
 * 母集団を全企業に変えることで、初任給が無い業界でも
 * 想定年収や企業一覧を持つページとして成立させ、404を根本から無くす。
 */
const splitIndustries = (s: string) =>
  (s || "").split("/").map((i) => i.trim()).filter(Boolean)

/** 指定業界の企業を、初任給→想定年収の順で降順に並べて返す（データ無しは末尾） */
function companiesInIndustry(all: CompanyData[], industry: string): CompanyData[] {
  const num = (v: number | string | null | undefined) =>
    typeof v === "number" && v > 0 ? v : null
  return all
    .filter((c) => splitIndustries(c.industry).includes(industry))
    .sort((a, b) => {
      const am = num(a.baseMonthly)
      const bm = num(b.baseMonthly)
      if (am !== null && bm !== null) return bm - am
      if (am !== null) return -1 // 初任給がある企業を上に
      if (bm !== null) return 1
      // どちらも初任給が無い場合は想定年収で比較
      return (num(b.annualSalary) ?? 0) - (num(a.annualSalary) ?? 0)
    })
}

// 全業界のページを静的生成
export async function generateStaticParams() {
  const companies = await fetchAllUniqueCompanies()
  const industries = new Set(companies.flatMap((c) => splitIndustries(c.industry)))
  // 【重要】生の値を返す（Next.jsがビルド時にエンコードするため、
  // encodeURIComponent済みの値を返すと二重エンコードになり日本語URLが404になる）
  return Array.from(industries).map((industry) => ({ industry }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const industry = decodeURIComponent(params.industry)
  const allCompanies = await fetchAllUniqueCompanies()
  const companies = companiesInIndustry(allCompanies, industry)

  if (companies.length === 0) {
    return { title: "業界が見つかりません", robots: { index: false, follow: false } }
  }

  const top = companies[0]
  const topSalary =
    typeof top.baseMonthly === "number"
      ? `¥${top.baseMonthly.toLocaleString()}`
      : String(top.baseMonthly)

  const description = `【${FISCAL_YEAR}年最新】${industry}業界の初任給ランキング（${companies.length}社）。1位${top.company}（初任給${topSalary}/月）。各社の初任給・想定年収・従業員数を比較できます。`

  return {
    title: `${industry}業界 初任給ランキング ${FISCAL_YEAR}【${companies.length}社】`,
    description,
    alternates: {
      canonical: `https://www.mymoneyweb.com/industries/${encodeURIComponent(industry)}`,
    },
    openGraph: {
      title: `${industry}業界 初任給ランキング ${FISCAL_YEAR}`,
      description,
    },
  }
}

export default async function IndustryPage({ params }: Props) {
  const industry = decodeURIComponent(params.industry)
  const allCompanies = await fetchAllUniqueCompanies()
  const companies = companiesInIndustry(allCompanies, industry)

  // 本当に1社も存在しない業界名（打ち間違い等）のみ404にする
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

  // 【自動生成】取得済みデータだけからこの業界の分析コンテキストを算出（AI不使用）
  const analyses = buildIndustryAnalyses(allCompanies, 3)
  const overall = buildOverallStats(allCompanies, analyses)
  const analysis = analyses.find((a) => a.industry === industry) ?? null
  const rank = industryRank(analyses, industry)
  const leadSummary = analysis ? buildIndustryLeadSummary(analysis, overall, rank, FISCAL_YEAR) : ""
  const faq = analysis ? buildIndustryFaq(analysis, overall, rank, FISCAL_YEAR) : []

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${industry}業界 初任給ランキング ${FISCAL_YEAR}`,
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

  // 【SEO】FAQリッチリザルト用。表示しているFAQと完全に同一内容にする
  const faqLd = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
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

            {/* ヘッダー
                スマホでは「○○業界」と「初任給ランキング」の間で必ず改行し中央揃えにする。
                自動折り返しに任せると「初任給ランキ / ング 2026」のように
                単語の途中で切れて不自然になるため、意味の切れ目で明示的に分割している。
                md以上は1行に収まるので inline に戻して従来通り左揃え。 */}
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-bold text-primary mb-3">
                <span className="block md:inline">{industry}業界</span>{" "}
                <span className="block md:inline">初任給ランキング {FISCAL_YEAR}</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg mb-4">
                {industry}業界の新卒初任給・想定年収データ（{companies.length}社掲載）
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
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
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
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

            {/* 【自動生成】業界分析（AI不使用・取得済みデータの集計） */}
            {analysis && (
              <section className="mb-8 space-y-4">
                {leadSummary && (
                  <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                    {leadSummary}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {analysis.avgMonthly !== null && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1">平均初任給</div>
                      <div className="text-lg md:text-xl font-bold text-primary">¥{analysis.avgMonthly.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/月</span></div>
                    </div>
                  )}
                  {analysis.medianMonthly !== null && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1">初任給の中央値</div>
                      <div className="text-lg md:text-xl font-bold text-foreground">¥{analysis.medianMonthly.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/月</span></div>
                    </div>
                  )}
                  {analysis.avgAnnual !== null && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1">平均想定年収</div>
                      <div className="text-lg md:text-xl font-bold text-foreground">¥{analysis.avgAnnual.toLocaleString()}</div>
                    </div>
                  )}
                  {analysis.maxMonthly !== null && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1">最高初任給</div>
                      <div className="text-lg md:text-xl font-bold text-foreground">¥{analysis.maxMonthly.toLocaleString()}</div>
                      {analysis.maxCompany && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{analysis.maxCompany.company}</div>
                      )}
                    </div>
                  )}
                  {analysis.minMonthly !== null && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1">最低初任給</div>
                      <div className="text-lg md:text-xl font-bold text-foreground">¥{analysis.minMonthly.toLocaleString()}</div>
                    </div>
                  )}
                  {rank && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" />全業界内の順位</div>
                      <div className="text-lg md:text-xl font-bold text-primary">{rank.rank}<span className="text-sm font-normal text-muted-foreground">位 / {rank.total}業界</span></div>
                    </div>
                  )}
                </div>

                {/* 全体平均との比較 */}
                {analysis.avgMonthly !== null && overall.avgMonthly !== null && (
                  <div className="rounded-xl border bg-muted/40 p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      掲載企業全体の平均初任給（月額¥{overall.avgMonthly.toLocaleString()}）と比べて、{industry}業界は
                      {" "}
                      {analysis.avgMonthly - overall.avgMonthly === 0 ? (
                        <span className="font-semibold text-foreground">ほぼ同水準</span>
                      ) : analysis.avgMonthly - overall.avgMonthly > 0 ? (
                        <span className="font-semibold text-green-600 dark:text-green-500">+¥{(analysis.avgMonthly - overall.avgMonthly).toLocaleString()} 高い</span>
                      ) : (
                        <span className="font-semibold text-red-600 dark:text-red-500">-¥{Math.abs(analysis.avgMonthly - overall.avgMonthly).toLocaleString()} 低い</span>
                      )}
                      {" "}水準です。
                    </p>
                  </div>
                )}
              </section>
            )}

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
                        {/* 順位。上位ほど大きく見せる。サイズは lib/rank-tier.ts で
                            一元管理し、指標別ランキングと見た目を揃えている。 */}
                        <div
                          className={`flex items-center justify-center rounded-full font-bold tabular shrink-0 ${RANK_BADGE[rankTier(index + 1)]}`}
                        >
                          {index + 1}
                        </div>

                        {/* ロゴ */}
                        <CompanyLogo
                          logo={company.logo}
                          domain={company.domain}
                          company={company.company}
                          size={48}
                          className={`rounded-lg object-contain shrink-0 ${RANK_LOGO[rankTier(index + 1)]}`}
                        />

                        {/* 企業名・業界 */}
                        <div className="flex-1 min-w-0">
                          <h2 className={`font-bold text-foreground truncate ${RANK_NAME[rankTier(index + 1)]}`}>
                            {company.company}
                          </h2>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {company.industry.split("/").map((ind, i) => (
                              <Badge key={i} variant="secondary" className="text-[11px] px-1.5">{ind.trim()}</Badge>
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

            {/* 【自動生成】業界FAQ（FAQPageスキーマと同一内容） */}
            {faq.length > 0 && (
              <section className="mt-10 space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                  {industry}業界の初任給に関するよくある質問
                </h2>
                <dl className="space-y-5">
                  {faq.map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <dt className="font-bold text-[16px] md:text-lg">Q. {item.question}</dt>
                      <dd className="text-[15px] md:text-base leading-relaxed text-muted-foreground">A. {item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

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
