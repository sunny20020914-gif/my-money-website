import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildRankingSummary } from "@/lib/ranking-summary"
import { buildAllListDefinitions } from "@/lib/list-definitions"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"
import { SITE_URL, FISCAL_YEAR, TARGET_GRADS, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import Link from "next/link"
import { Metadata } from "next"

// 「27卒 初任給」等の卒年キーワードの受け皿ページ。
// 集計はスプシデータから自動生成され、TARGET_GRADS（lib/config.ts）に卒年を足すだけで増やせる。

type Props = {
  params: { grad: string }
}

export const revalidate = REVALIDATE_STABLE

const parseGrad = (raw: string): number | null => {
  const n = Number(raw)
  return (TARGET_GRADS as readonly number[]).includes(n) ? n : null
}

export async function generateStaticParams() {
  return TARGET_GRADS.map((g) => ({ grad: String(g) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const grad = parseGrad(params.grad)
  if (grad === null) return { title: "ページが見つかりません" }
  const joinYear = 2000 + grad

  const all = await fetchAllUniqueCompanies()
  const summary = buildRankingSummary(all)
  const avgText =
    summary.avgMonthly !== null ? `掲載${summary.withMonthly}社の平均は月額${summary.avgMonthly.toLocaleString()}円（${FISCAL_YEAR}年度実績）。` : ""

  return {
    title: `${grad}卒の初任給ランキング・平均まとめ【${joinYear}年入社】`,
    description: `${grad}卒（${joinYear}年3月卒業・${joinYear}年4月入社）向けの初任給情報まとめ。${avgText}企業別ランキング・業界別平均・手取り目安を確認できます。`,
    alternates: {
      canonical: `${SITE_URL}/grad/${grad}`,
    },
    openGraph: {
      title: `${grad}卒の初任給ランキング・平均まとめ【${joinYear}年入社】`,
      description: `${grad}卒向けの初任給データまとめ。${avgText}`,
    },
  }
}

export default async function GradPage({ params }: Props) {
  const grad = parseGrad(params.grad)
  if (grad === null) notFound()
  const joinYear = 2000 + grad

  const all = await fetchAllUniqueCompanies()
  const summary = buildRankingSummary(all)
  const topLists = buildAllListDefinitions(all).slice(0, 8)
  const avgNet = summary.avgMonthly !== null ? estimateNetSalary(summary.avgMonthly) : null
  const otherGrads = TARGET_GRADS.filter((g) => g !== grad)
  // 【ISR課金】日単位に丸めることで、同じ日のうちは再生成しても出力が
  // 完全に一致し、キャッシュ書き込みが発生しない（lib/updated-at.ts 参照）
  const lastUpdated = updatedAt()

  const faq = [
    ...(summary.avgMonthly !== null
      ? [{
          question: `${grad}卒の初任給の平均はいくらですか？`,
          answer: `当サイト掲載${summary.withMonthly}社の平均初任給は月額${summary.avgMonthly.toLocaleString()}円です（${FISCAL_YEAR}年度実績・当サイト調べ）。${grad}卒（${joinYear}年4月入社）の初任給は多くの企業で前年度と同水準か、引き上げの傾向にあります。`,
        }]
      : []),
    {
      question: `${grad}卒とはいつ卒業・入社する学年ですか？`,
      answer: `${grad}卒は${joinYear}年3月に大学・大学院を卒業し、${joinYear}年4月に入社する学年を指します。`,
    },
    {
      question: `${grad}卒の初任給はいつ確定しますか？`,
      answer: `各社の採用サイトや求人票には前年度実績の初任給が記載されています。初任給の改定（引き上げ）は入社前年度の春〜入社直前に発表されることが多く、内定時の労働条件通知書で確定額を確認できます。`,
    },
  ]

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: `${grad}卒向けまとめ`, item: `${SITE_URL}/grad/${grad}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-3xl mx-auto space-y-8">
            <section>
              <nav aria-label="パンくずリスト" className="text-xs text-muted-foreground mb-3">
                <Link href="/" className="hover:underline">ホーム</Link>
                <span className="mx-1.5">›</span>
                <span>{grad}卒向けまとめ</span>
              </nav>
              <h1 className="text-xl md:text-3xl font-bold text-primary">
                {grad}卒の初任給ランキング・平均まとめ【{joinYear}年入社】
              </h1>
              {/* 【AI SEO】答えを先に書く自己完結型サマリー */}
              <p className="mt-4 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                {grad}卒（{joinYear}年3月卒業・{joinYear}年4月入社予定）向けの初任給情報のまとめです。
                {summary.avgMonthly !== null && (
                  <>
                    当サイト掲載{summary.withMonthly}社の平均初任給は月額{summary.avgMonthly.toLocaleString()}円
                    {summary.medianMonthly !== null && <>（中央値{summary.medianMonthly.toLocaleString()}円）</>}
                    で、初任給40万円以上の企業は{summary.over40}社あります（{FISCAL_YEAR}年度実績）。
                  </>
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                最終更新日: <time dateTime={lastUpdated.iso}>{lastUpdated.label}</time>
                （データは自動で最新に保たれます）
              </p>
            </section>

            {/* --- 主要導線 --- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild size="lg">
                <Link href="/ranking">初任給ランキングを見る →</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent">
                <Link href="/simulator">手取りを計算する →</Link>
              </Button>
            </section>

            <AdBanner />

            {/* --- 業種別平均 --- */}
            {summary.industryAverages.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                  {grad}卒が参考にすべき業種別の平均初任給
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th scope="col" className="py-2 pr-4 text-left font-medium">業界</th>
                        <th scope="col" className="py-2 pr-4 text-right font-medium">掲載社数</th>
                        <th scope="col" className="py-2 text-right font-medium">平均初任給（月額）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.industryAverages.slice(0, 8).map((row) => (
                        <tr key={row.industry} className="border-b last:border-b-0">
                          <th scope="row" className="py-2 pr-4 text-left font-normal">
                            <Link href={`/industries/${encodeURIComponent(row.industry)}`} className="text-primary hover:underline">
                              {row.industry}
                            </Link>
                          </th>
                          <td className="py-2 pr-4 text-right">{row.count}社</td>
                          <td className="py-2 text-right font-semibold">¥{row.avgMonthly.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {FISCAL_YEAR}年度実績・当サイト調べ。{grad}卒の初任給は多くの企業で同水準か引き上げ傾向です。
                </p>
              </section>
            )}

            {/* --- 手取りの目安 --- */}
            {summary.avgMonthly !== null && avgNet && (
              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                  {grad}卒の初任給の手取り目安
                </h2>
                <p className="text-[15px] leading-relaxed">
                  平均初任給（月額{summary.avgMonthly.toLocaleString()}円）の場合、社会保険料と所得税を差し引いた1年目の手取りは
                  <strong>約{roundNet(avgNet.netMonthlyFirstYear).toLocaleString()}円</strong>が目安です。
                  新卒1年目は住民税がかからないため、2年目以降は約{roundNet(avgNet.netMonthlySecondYear).toLocaleString()}円になります。
                </p>
                <p className="text-sm">
                  <Link href="/simulator" className="text-primary hover:underline">
                    自分の初任給で手取りを計算する →
                  </Link>
                </p>
              </section>
            )}

            {/* --- 条件別リンク --- */}
            {topLists.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                  条件から企業を探す
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topLists.map((d) => (
                    <Button key={d.slug} asChild variant="outline" size="sm" className="bg-transparent">
                      <Link href={`/lists/${encodeURIComponent(d.slug)}`}>{d.shortName}（{d.count}社）</Link>
                    </Button>
                  ))}
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/lists">すべての条件 →</Link>
                  </Button>
                </div>
              </section>
            )}

            <AdBanner />

            {/* --- FAQ --- */}
            <section className="space-y-4">
              <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                {grad}卒の初任給に関するよくある質問
              </h2>
              <dl className="space-y-5">
                {faq.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <dt className="font-bold text-[15px] md:text-base">Q. {item.question}</dt>
                    <dd className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">A. {item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* --- 他の卒年 --- */}
            {otherGrads.length > 0 && (
              <section className="border-t pt-6">
                <div className="flex flex-wrap gap-2">
                  {otherGrads.map((g) => (
                    <Button key={g} asChild variant="outline" size="sm" className="bg-transparent">
                      <Link href={`/grad/${g}`}>{g}卒向けのまとめを見る →</Link>
                    </Button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
