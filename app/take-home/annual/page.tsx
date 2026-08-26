import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { estimateAnnualNet, ANNUAL_AMOUNTS, annualManLabel } from "@/lib/annual-take-home"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

export const revalidate = REVALIDATE_STABLE

/**
 * 年収別ページのハブ。
 * 一覧そのものが「年収 手取り 早見表」として検索需要を持ち、
 * 20本の個別ページへの内部リンクも集約できる。
 */
// 【重要】範囲は必ず ANNUAL_AMOUNTS から導出すること。
// 「300万〜1500万円」と直書きしていたが実際の上限は2000万円で、
// タイトルと中身が食い違っていた。定数を変えたときに直し忘れる。
const MIN_LABEL = annualManLabel(ANNUAL_AMOUNTS[0])
const MAX_LABEL = annualManLabel(ANNUAL_AMOUNTS[ANNUAL_AMOUNTS.length - 1])

export const metadata: Metadata = {
  title: `年収別の手取り早見表【${FISCAL_YEAR}年版】${MIN_LABEL}〜${MAX_LABEL}`,
  description:
    `年収の額面から手取りがいくらになるかを一覧にしました。${MIN_LABEL}から${MAX_LABEL}まで、` +
    "年間の手取りと月あたりの金額、額面に対する割合を掲載。社会保険料・所得税・住民税の内訳も確認できます。",
  alternates: { canonical: `${SITE_URL}/take-home/annual` },
}

const manYen = (v: number) => `${Math.round(v / 10_000).toLocaleString()}万円`

export default function AnnualTakeHomeIndexPage() {
  const updated = updatedAt()

  const rows = ANNUAL_AMOUNTS.map((amount) => {
    const est = estimateAnnualNet(amount)!
    return { amount, label: annualManLabel(amount), est }
  })

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `年収別の手取り早見表 ${FISCAL_YEAR}`,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `年収${r.label}の手取り`,
      url: `${SITE_URL}/take-home/annual/${r.amount}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <span>/</span>
              <Link href="/take-home" className="hover:text-primary transition-colors">手取り早見表</Link>
              <span>/</span>
              <span className="text-foreground font-medium">年収別</span>
            </nav>

            <header className="mb-6">
              <h1 className="jp-heading text-2xl md:text-4xl font-bold text-primary mb-3 leading-[1.35]">
                年収別の手取り早見表
              </h1>
              <p className="jp-lead text-[15px] md:text-lg text-muted-foreground leading-[1.8] mb-3">
                年収300万円から1,500万円までの手取り一覧です
              </p>
              <p className="text-xs text-muted-foreground">
                最終更新日: <time dateTime={updated.iso}>{updated.label}</time>
              </p>
            </header>

            <section className="mb-8 rounded-2xl border bg-card p-5 md:p-6 border-l-4 border-l-primary/50">
              <p className="text-[16px] leading-[1.95] text-muted-foreground">
                年収から差し引かれるのは、社会保険料（健康保険・厚生年金・雇用保険）と
                所得税・住民税です。所得税は累進課税なので年収が上がるほど負担率も上がりますが、
                厚生年金の保険料は年収780万円あたりで頭打ちになります。
                そのため手取りの割合が最も急に下がるのは、年収300万円台から800万円台にかけての区間です。
                金額をクリックすると内訳を確認できます。
              </p>
            </section>

            <AdBanner />

            <section className="mt-8">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">年収別の手取り一覧</h2>
              <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th scope="col" className="p-3 text-left font-medium">年収（額面）</th>
                      <th scope="col" className="p-3 text-right font-medium">年間の手取り</th>
                      <th scope="col" className="p-3 text-right font-medium hidden sm:table-cell">月あたり</th>
                      <th scope="col" className="p-3 text-right font-medium hidden sm:table-cell">割合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.amount} className="border-b last:border-b-0 hover:bg-accent transition-colors">
                        <th scope="row" className="p-0 text-left">
                          <Link
                            href={`/take-home/annual/${r.amount}`}
                            className="block p-3 font-bold text-primary hover:underline"
                          >
                            {r.label}
                          </Link>
                        </th>
                        <td className="p-3 text-right font-semibold tabular text-foreground">
                          {manYen(r.est.netAnnual)}
                        </td>
                        <td className="p-3 text-right tabular text-muted-foreground hidden sm:table-cell">
                          {r.est.netMonthlyAverage.toLocaleString()}円
                        </td>
                        <td className="p-3 text-right tabular text-muted-foreground hidden sm:table-cell">
                          {r.est.ratio}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                ※ 扶養なし・40歳未満で算出した概算値です。実際の社会保険料は月給と賞与に分けて計算されるため、
                その配分によって前後します。条件を変えて計算したい場合は
                <Link href="/simulator" className="text-primary hover:underline mx-1">シミュレーター</Link>
                をご利用ください。
              </p>
            </section>

            <section className="mt-10 border-t pt-6">
              <h2 className="text-lg font-bold mb-3">あわせて見る</h2>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/take-home">月額別の手取り早見表</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking/average">平均年収ランキング</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking">初任給ランキング</Link>
                </Button>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
