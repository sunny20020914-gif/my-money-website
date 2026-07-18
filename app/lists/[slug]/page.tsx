import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildAllListDefinitions, getListBySlug, buildList, buildListLeadSummary } from "@/lib/list-definitions"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { CompanyLogo } from "@/components/company-logo"
import Image from "next/image"
import Link from "next/link"
import { Metadata } from "next"
import React from "react"

type Props = {
  params: { slug: string }
}

// 1時間ごとにスプシから再取得（ISR）。条件別一覧は常に最新データで自動更新される
export const revalidate = 3600

export async function generateStaticParams() {
  const all = await fetchAllUniqueCompanies()
  return buildAllListDefinitions(all).map((d) => ({ slug: encodeURIComponent(d.slug) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug)
  const all = await fetchAllUniqueCompanies()
  const def = getListBySlug(slug, all)
  if (!def) return { title: "ページが見つかりません" }

  return {
    title: def.name,
    description: def.description,
    alternates: {
      canonical: `${SITE_URL}/lists/${encodeURIComponent(def.slug)}`,
    },
    openGraph: {
      title: def.name,
      description: def.description,
    },
  }
}

export default async function ListPage({ params }: Props) {
  const slug = decodeURIComponent(params.slug)
  const all = await fetchAllUniqueCompanies()
  const allDefs = buildAllListDefinitions(all)
  const def = allDefs.find((d) => d.slug === slug)
  if (!def) notFound()

  const companies = buildList(def, all)
  const leadSummary = buildListLeadSummary(def, companies)
  const lastUpdated = new Date()
  const pageUrl = `${SITE_URL}/lists/${encodeURIComponent(def.slug)}`

  // 関連条件: 同じセグメントの別閾値 + 同じ閾値の他セグメント（該当数の多い順に最大8件）
  const sameSegment = allDefs.filter((d) => d.segmentLabel === def.segmentLabel && d.slug !== def.slug)
  const sameThreshold = allDefs
    .filter((d) => d.threshold === def.threshold && d.segmentLabel !== def.segmentLabel)
    .slice(0, 8)

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: def.name,
    description: def.description,
    numberOfItems: companies.length,
    itemListElement: companies.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.company,
      url: `${SITE_URL}/companies/${c.id}`,
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "条件で探す", item: `${SITE_URL}/lists` },
      { "@type": "ListItem", position: 3, name: def.shortName, item: pageUrl },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* --- ヘッダー --- */}
            <section>
              <nav aria-label="パンくずリスト" className="text-xs text-muted-foreground mb-3">
                <Link href="/" className="hover:underline">ホーム</Link>
                <span className="mx-1.5">›</span>
                <Link href="/lists" className="hover:underline">条件で探す</Link>
                <span className="mx-1.5">›</span>
                <span>{def.shortName}</span>
              </nav>
              <h1 className="text-xl md:text-3xl font-bold text-primary">{def.name}</h1>
              {/* 【AI SEO】答えを先に書く自己完結型サマリー（母集団比率＝独自の集計データ） */}
              {leadSummary && (
                <p className="mt-4 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                  {leadSummary}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                最終更新日: <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleDateString("ja-JP")}</time>
                （データは自動で最新に保たれます）
              </p>
            </section>

            <AdBanner />

            {/* --- 企業一覧 --- */}
            {companies.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">現在この条件に該当する企業はありません。</p>
                </CardContent>
              </Card>
            ) : (
              <section className="space-y-2">
                {companies.map((c, i) => {
                  const monthly = typeof c.baseMonthly === "number" ? c.baseMonthly : null
                  const annual = typeof c.annualSalary === "number" ? c.annualSalary : null
                  const net = estimateNetSalary(c.baseMonthly)
                  return (
                    <React.Fragment key={c.id}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 md:p-5">
                          <div className="flex items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm md:text-base flex-shrink-0">
                              {i + 1}
                            </div>
                            <CompanyLogo
                              logo={c.logo}
                              domain={c.domain}
                              company={c.company}
                              size={48}
                              className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain border bg-card flex-shrink-0"
                            />
                            <div className="flex-grow min-w-0">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h2 className="text-base md:text-lg font-bold leading-tight">
                                  <Link href={`/companies/${c.id}`} className="hover:text-primary transition-colors">
                                    {c.company}
                                  </Link>
                                </h2>
                                <div className="flex flex-wrap gap-1">
                                  {c.industry.split("/").filter(Boolean).slice(0, 3).map((ind, j) => (
                                    <Badge key={j} variant="secondary" className="text-[10px] md:text-xs">{ind.trim()}</Badge>
                                  ))}
                                </div>
                              </div>
                              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                                {monthly !== null && (
                                  <div className="flex items-baseline gap-1.5">
                                    <dt className="text-muted-foreground text-xs">初任給</dt>
                                    <dd className="font-semibold text-primary">¥{monthly.toLocaleString()}/月</dd>
                                  </div>
                                )}
                                {net !== null && (
                                  <div className="flex items-baseline gap-1.5">
                                    <dt className="text-muted-foreground text-xs">手取り目安</dt>
                                    <dd className="font-semibold">約¥{roundNet(net.netMonthlyFirstYear).toLocaleString()}</dd>
                                  </div>
                                )}
                                {annual !== null && (
                                  <div className="flex items-baseline gap-1.5">
                                    <dt className="text-muted-foreground text-xs">想定年収</dt>
                                    <dd className="font-semibold">¥{annual.toLocaleString()}</dd>
                                  </div>
                                )}
                                {typeof c.employees === "number" && (
                                  <div className="flex items-baseline gap-1.5">
                                    <dt className="text-muted-foreground text-xs">従業員数</dt>
                                    <dd>{c.employees.toLocaleString()}人</dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                            <Button asChild variant="outline" size="sm" className="bg-transparent flex-shrink-0 hidden sm:inline-flex">
                              <Link href={`/companies/${c.id}`}>詳しく</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      {/* 8社ごとに広告を挿入 */}
                      {(i + 1) % 8 === 0 && i + 1 < companies.length && <AdBanner />}
                    </React.Fragment>
                  )
                })}
                <p className="pt-2 text-xs text-muted-foreground leading-relaxed">
                  ※手取りは独身・扶養なし・新卒1年目（住民税なし）を前提とした概算です。給与データは{FISCAL_YEAR}年度・当サイト調べ。
                </p>
              </section>
            )}

            <AdBanner />

            {/* --- 関連条件への導線 --- */}
            <section className="space-y-5 border-t pt-8">
              {sameSegment.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base md:text-lg font-bold">{def.segmentLabel}の他の条件</h2>
                  <div className="flex flex-wrap gap-2">
                    {sameSegment.map((d) => (
                      <Button key={d.slug} asChild variant="outline" size="sm" className="bg-transparent">
                        <Link href={`/lists/${encodeURIComponent(d.slug)}`}>{d.shortName}（{d.count}社）</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {sameThreshold.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base md:text-lg font-bold">他の業界・セグメントで初任給{def.threshold / 10000}万円以上</h2>
                  <div className="flex flex-wrap gap-2">
                    {sameThreshold.map((d) => (
                      <Button key={d.slug} asChild variant="outline" size="sm" className="bg-transparent">
                        <Link href={`/lists/${encodeURIComponent(d.slug)}`}>{d.shortName}（{d.count}社）</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <Link href="/lists" className="text-primary hover:underline">すべての条件を見る →</Link>
                {def.industry && (
                  <Link href={`/industries/${encodeURIComponent(def.industry)}`} className="text-primary hover:underline">
                    {def.industry}業界の全ランキング →
                  </Link>
                )}
                <Link href="/ranking" className="text-primary hover:underline">全企業ランキング →</Link>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
