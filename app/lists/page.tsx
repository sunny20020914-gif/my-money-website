import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildAllListDefinitions } from "@/lib/list-definitions"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import Link from "next/link"
import { Metadata } from "next"

export const revalidate = REVALIDATE_STABLE

export const metadata: Metadata = {
  title: `条件で探す企業一覧【${FISCAL_YEAR}年最新】業界×初任給で絞り込み`,
  description: `${FISCAL_YEAR}年度の初任給データを「業界×給与水準」のクロス条件で絞り込み。メーカーで40万円以上、大手で35万円以上など、条件に合う企業をすぐに探せます。`,
  alternates: {
    canonical: `${SITE_URL}/lists`,
  },
}

export default async function ListsIndexPage() {
  const all = await fetchAllUniqueCompanies()
  const defs = buildAllListDefinitions(all)

  // セグメント単位にグループ化（該当数の多いセグメント順）
  const groups = new Map<string, typeof defs>()
  for (const d of defs) {
    const g = groups.get(d.segmentLabel) ?? []
    g.push(d)
    groups.set(d.segmentLabel, g)
  }
  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => Math.max(...b[1].map((d) => d.count)) - Math.max(...a[1].map((d) => d.count)),
  )

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "条件で探す", item: `${SITE_URL}/lists` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <section>
              <h1 className="text-xl md:text-3xl font-bold text-primary">
                条件で探す企業一覧【{FISCAL_YEAR}年最新】
              </h1>
              <p className="mt-4 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                業界×初任給水準のクロス条件で企業を絞り込めます。現在{defs.length}通りの条件を掲載。データはスプレッドシートの更新に合わせて自動で最新に保たれます。
              </p>
            </section>

            <AdBanner />

            <section className="space-y-6">
              {sortedGroups.map(([label, groupDefs]) => (
                <div key={label} className="space-y-2">
                  <h2 className="text-base md:text-lg font-bold">{label}</h2>
                  <div className="flex flex-wrap gap-2">
                    {groupDefs
                      .sort((a, b) => a.threshold - b.threshold)
                      .map((d) => (
                        <Button key={d.slug} asChild variant="outline" size="sm" className="bg-transparent">
                          <Link href={`/lists/${encodeURIComponent(d.slug)}`}>
                            初任給{d.threshold / 10000}万円以上（{d.count}社）
                          </Link>
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </section>

            <AdBanner />

            <section className="border-t pt-6">
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
