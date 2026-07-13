import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { LIST_DEFINITIONS, getListBySlug, buildList, buildListLeadSummary } from "@/lib/list-definitions"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Metadata } from "next"

type Props = {
  params: { slug: string }
}

// 1時間ごとにスプシから再取得（ISR）。条件別一覧は常に最新データで自動更新される
export const revalidate = 3600

export async function generateStaticParams() {
  return LIST_DEFINITIONS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const def = getListBySlug(params.slug)
  if (!def) return { title: "ページが見つかりません" }

  return {
    title: def.name,
    description: def.description,
    alternates: {
      canonical: `${SITE_URL}/lists/${def.slug}`,
    },
    openGraph: {
      title: def.name,
      description: def.description,
    },
  }
}

export default async function ListPage({ params }: Props) {
  const def = getListBySlug(params.slug)
  if (!def) notFound()

  const all = await fetchAllUniqueCompanies()
  const companies = buildList(def, all)
  const leadSummary = buildListLeadSummary(def, companies)
  const lastUpdated = new Date()
  const pageUrl = `${SITE_URL}/lists/${def.slug}`
  const otherLists = LIST_DEFINITIONS.filter((d) => d.slug !== def.slug)

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
      { "@type": "ListItem", position: 2, name: "初任給・年収ランキング", item: `${SITE_URL}/ranking` },
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
                <Link href="/ranking" className="hover:underline">ランキング</Link>
                <span className="mx-1.5">›</span>
                <span>{def.shortName}</span>
              </nav>
              <h1 className="text-xl md:text-3xl font-bold text-primary">{def.name}</h1>
              {/* 【AI SEO】答えを先に書く自己完結型サマリー（集計値は当サイトの独自データ） */}
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
                    <Card key={c.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm md:text-base flex-shrink-0">
                            {i + 1}
                          </div>
                          <Image
                            src={c.logo || (c.domain ? `https://logo.clearbit.com/${c.domain}` : "/placeholder.svg")}
                            alt={`${c.company}のロゴ`}
                            width={48}
                            height={48}
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
                                  <Badge key={j} variant="secondary" className="text-[10px] md:text-xs">{ind}</Badge>
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
                  )
                })}
                <p className="pt-2 text-xs text-muted-foreground leading-relaxed">
                  ※手取りは独身・扶養なし・新卒1年目（住民税なし）を前提とした概算です。給与データは{FISCAL_YEAR}年度・当サイト調べ。
                </p>
              </section>
            )}

            {/* --- 他の条件・ランキングへの導線 --- */}
            <section className="space-y-3 border-t pt-8">
              <h2 className="text-base md:text-lg font-bold">他の条件で探す</h2>
              <div className="flex flex-wrap gap-2">
                {otherLists.map((d) => (
                  <Button key={d.slug} asChild variant="outline" size="sm" className="bg-transparent">
                    <Link href={`/lists/${d.slug}`}>{d.shortName}</Link>
                  </Button>
                ))}
              </div>
              <p className="text-sm">
                <Link href="/ranking" className="text-primary hover:underline">
                  全企業の初任給ランキングを見る →
                </Link>
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
