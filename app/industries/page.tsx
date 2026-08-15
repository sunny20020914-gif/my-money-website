import { fetchRankingDataServer } from "@/lib/sheets"
import {
  buildIndustryAnalyses,
  buildOverallStats,
  buildHubSummary,
  rankableIndustries,
} from "@/lib/industry-stats"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Building2, TrendingUp, Trophy } from "lucide-react"
import { AdBanner } from "@/components/ad-banner"

export const revalidate = REVALIDATE_STABLE

export const metadata = {
  title: `業界別 初任給ランキング・分析 ${FISCAL_YEAR} | 平均初任給を全業界で比較`,
  description:
    "IT・金融・製造・商社など主要業界の初任給を自動集計。各業界の平均初任給・中央値・初任給レンジ・トップ企業を横断比較し、業界選択の参考になるデータを提供します。",
  alternates: {
    canonical: `${SITE_URL}/industries`,
  },
}

export default async function IndustriesPage() {
  const allCompanies = await fetchRankingDataServer("monthly")

  const analyses = buildIndustryAnalyses(allCompanies, 3)
  const overall = buildOverallStats(allCompanies, analyses)
  const ranked = rankableIndustries(analyses)
  const summary = buildHubSummary(analyses, overall, FISCAL_YEAR)
  const maxAvg = ranked[0]?.avgMonthly ?? 0

  // 業界ハブ用FAQ（データ由来・下部のJSON-LDと同一内容）
  const hubFaq: { question: string; answer: string }[] = []
  if (overall.avgMonthly !== null) {
    hubFaq.push({
      question: "掲載企業全体の平均初任給はいくらですか？",
      answer:
        `当サイト掲載${overall.withMonthly}社の平均初任給は月額¥${overall.avgMonthly.toLocaleString()}です` +
        (overall.medianMonthly !== null ? `（中央値¥${overall.medianMonthly.toLocaleString()}・${FISCAL_YEAR}年度・当サイト調べ）。` : `（${FISCAL_YEAR}年度・当サイト調べ）。`),
    })
  }
  if (ranked.length >= 1 && ranked[0].avgMonthly !== null) {
    const top = ranked.slice(0, 3).filter((a) => a.avgMonthly !== null)
    hubFaq.push({
      question: "平均初任給が最も高い業界はどこですか？",
      answer: `平均初任給が最も高い業界は${ranked[0].industry}（月額¥${(ranked[0].avgMonthly as number).toLocaleString()}）です。` +
        (top.length > 1
          ? `次いで${top.slice(1).map((a) => `${a.industry}（月額¥${(a.avgMonthly as number).toLocaleString()}）`).join("、")}が続きます。`
          : ""),
    })
  }

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `業界別 初任給ランキング ${FISCAL_YEAR}`,
    numberOfItems: ranked.length,
    itemListElement: ranked.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${a.industry}業界`,
      url: `${SITE_URL}/industries/${encodeURIComponent(a.industry)}`,
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "業界別分析", item: `${SITE_URL}/industries` },
    ],
  }

  const faqLd = hubFaq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: hubFaq.map((item) => ({
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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">

            {/* パンくず */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <span>/</span>
              <span className="text-foreground font-medium">業界別分析</span>
            </nav>

            {/* ヘッダー */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Building2 className="w-4 h-4 mr-2" />
                {FISCAL_YEAR}年最新データ・自動集計
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-primary mb-3">
                業界別 初任給ランキング・分析 {FISCAL_YEAR}
              </h1>
              {/* 【AI SEO】答えを先に書く自己完結型サマリー */}
              {summary && (
                <p className="text-sm md:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed text-left sm:text-center">
                  {summary}
                </p>
              )}
            </div>

            {/* 全体サマリー指標 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="rounded-xl border bg-card p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">掲載業界数</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{overall.industryCount}<span className="text-sm font-normal text-muted-foreground">業界</span></div>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">掲載企業数</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{overall.withMonthly}<span className="text-sm font-normal text-muted-foreground">社</span></div>
              </div>
              {overall.avgMonthly !== null && (
                <div className="rounded-xl border bg-card p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">全体平均初任給</div>
                  <div className="text-xl md:text-2xl font-bold text-primary">¥{overall.avgMonthly.toLocaleString()}</div>
                </div>
              )}
              {overall.medianMonthly !== null && (
                <div className="rounded-xl border bg-card p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">全体中央値</div>
                  <div className="text-xl md:text-2xl font-bold text-foreground">¥{overall.medianMonthly.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* 業界別 平均初任給ランキング比較（横棒） */}
            {ranked.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  業界別 平均初任給ランキング
                </h2>
                <div className="rounded-xl border bg-card divide-y">
                  {ranked.map((a, i) => {
                    // ratio は実際の比率（ラベル表示用）。barWidth は細くなりすぎて
                    // 棒に見えなくなるのを防ぐため下限8%を設けた描画専用の値。
                    // 両者を分けないと「1位比 8%」のような実測と異なる表示になってしまう。
                    const ratio = maxAvg > 0 ? Math.round(((a.avgMonthly as number) / maxAvg) * 100) : 0
                    const barWidth = Math.max(8, ratio)
                    return (
                      <Link
                        key={a.industry}
                        href={`/industries/${encodeURIComponent(a.industry)}`}
                        className="flex items-center gap-3 p-3 md:px-4 hover:bg-muted/50 transition-colors group"
                      >
                        <span className="w-6 text-sm font-bold text-muted-foreground shrink-0 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-sm md:text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {a.industry}
                              <span className="ml-2 text-xs font-normal text-muted-foreground">{a.count}社</span>
                            </span>
                            <span className="text-sm md:text-base font-bold text-primary shrink-0">
                              ¥{(a.avgMonthly as number).toLocaleString()}
                            </span>
                          </div>
                          {/* 【意図】平均初任給の相対比較を示す棒グラフ。
                              以前は全幅のグレーのトラックを敷いていたためスクロールバーに見えていた。
                              トラックを外し「伸びている棒」だけにすることで、グラフだと直感的に伝わる。 */}
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 rounded-sm bg-primary/70 group-hover:bg-primary transition-colors"
                              style={{ width: `${barWidth}%` }}
                            />
                            <span className="text-[11px] text-muted-foreground shrink-0 tabular">
                              1位比 {ratio}%
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ※棒の長さは、平均初任給が最も高い業界を100%としたときの相対比を表します。
                  各業界に掲載されている企業の初任給（月額）の平均値で、数値は{FISCAL_YEAR}年度・当サイト調べ。
                </p>
              </section>
            )}

            <AdBanner />

            {/* 業界別カード（詳細ランキングへの導線） */}
            <section className="mt-8">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                業界別 詳細ランキング
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyses.map((a) => {
                  const diff =
                    a.avgMonthly !== null && overall.avgMonthly !== null
                      ? a.avgMonthly - overall.avgMonthly
                      : null
                  return (
                    <Card key={a.industry} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-foreground leading-tight">{a.industry}</h3>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2 mt-0.5">{a.count}社</span>
                        </div>

                        {a.avgMonthly !== null && (
                          <div className="mb-1">
                            <div className="text-xs text-muted-foreground">平均初任給</div>
                            <div className="text-xl font-bold text-primary">
                              ¥{a.avgMonthly.toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground">/月</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                          {a.medianMonthly !== null && <span>中央値 ¥{a.medianMonthly.toLocaleString()}</span>}
                          {a.avgAnnual !== null && <span>平均年収 ¥{a.avgAnnual.toLocaleString()}</span>}
                          {diff !== null && diff !== 0 && (
                            <span className={diff > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                              全体平均比 {diff > 0 ? "+" : "-"}¥{Math.abs(diff).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 mb-4">
                          {a.topCompanies.map((c, i) => (
                            <div key={c.id || c.company} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                              <span className="text-foreground truncate flex-1">{c.company}</span>
                              {typeof c.baseMonthly === "number" && (
                                <span className="text-xs text-muted-foreground shrink-0">¥{c.baseMonthly.toLocaleString()}</span>
                              )}
                            </div>
                          ))}
                        </div>

                        <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                          <Link href={`/industries/${encodeURIComponent(a.industry)}`}>
                            {a.industry}の詳細分析
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>

            {/* FAQ */}
            {hubFaq.length > 0 && (
              <section className="mt-12 space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                  業界別分析に関するよくある質問
                </h2>
                <dl className="space-y-5">
                  {hubFaq.map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <dt className="font-bold text-[16px] md:text-lg">Q. {item.question}</dt>
                      <dd className="text-[15px] md:text-base leading-relaxed text-muted-foreground">A. {item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
