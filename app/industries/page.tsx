import { fetchRankingDataServer } from "@/lib/sheets"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Building2 } from "lucide-react"
import { AdBanner } from "@/components/ad-banner"

export const revalidate = 3600

export const metadata = {
  title: "業界別 初任給ランキング 2026 | 全業界の給与データを比較",
  description:
    "IT・金融・製造・商社など業界別の初任給・年収ランキング。各業界の掲載企業数・平均初任給を比較して、業界選択の参考にしてください。",
  alternates: {
    canonical: "https://www.mymoneyweb.com/industries",
  },
}

export default async function IndustriesPage() {
  const allCompanies = await fetchRankingDataServer("monthly")

  // 業界ごとに企業をグルーピング
  const industryMap = new Map<string, typeof allCompanies>()
  for (const company of allCompanies) {
    const industries = company.industry.split("/").map((i) => i.trim()).filter(Boolean)
    for (const ind of industries) {
      if (!industryMap.has(ind)) industryMap.set(ind, [])
      industryMap.get(ind)!.push(company)
    }
  }

  // 平均初任給で降順ソート
  const industryList = Array.from(industryMap.entries())
    .map(([name, companies]) => {
      const sorted = [...companies].sort((a, b) => a.rank - b.rank)
      const numericSalaries = companies
        .map((c) => (typeof c.baseMonthly === "number" ? c.baseMonthly : null))
        .filter((v): v is number => v !== null)
      const avg =
        numericSalaries.length > 0
          ? Math.round(numericSalaries.reduce((a, b) => a + b, 0) / numericSalaries.length)
          : null
      return { name, companies: sorted, count: sorted.length, avgSalary: avg }
    })
    .sort((a, b) => (b.avgSalary ?? 0) - (a.avgSalary ?? 0))

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: "https://www.mymoneyweb.com/" },
      { "@type": "ListItem", position: 2, name: "業界別分析", item: "https://www.mymoneyweb.com/industries" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
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

            <div className="mb-10 text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Building2 className="w-4 h-4 mr-2" />
                2026年最新データ
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-primary mb-3">
                業界別 初任給ランキング 2026
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                {industryList.length}業界・{allCompanies.length}社のデータを掲載。
                気になる業界をクリックして詳細ランキングをチェック。
              </p>
            </div>

            <AdBanner />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {industryList.map(({ name, count, avgSalary, companies }) => {
                const top3 = companies.slice(0, 3)
                return (
                  <Card key={name} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="text-lg font-bold text-foreground leading-tight">{name}</h2>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2 mt-0.5">{count}社</span>
                      </div>

                      {avgSalary && (
                        <div className="mb-3">
                          <div className="text-xs text-muted-foreground">平均初任給</div>
                          <div className="text-xl font-bold text-primary">
                            ¥{avgSalary.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">/月</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1 mb-4">
                        {top3.map((c, i) => (
                          <div key={c.company} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                            <span className="text-foreground truncate">{c.company}</span>
                          </div>
                        ))}
                      </div>

                      <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                        <Link href={`/industries/${encodeURIComponent(name)}`}>
                          {name}の詳細ランキング
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
