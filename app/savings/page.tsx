import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { buildSavingsPage, SAVINGS_AMOUNTS, savingsManLabel, periodLabel } from "@/lib/savings-page"
import { SAVINGS_BENCHMARK } from "@/lib/savings"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

export const revalidate = REVALIDATE_STABLE

/**
 * 手取り別ページのハブ。
 * 一覧そのものが「手取り別 貯金 目安」として検索需要を持ち、
 * 26本の個別ページへの内部リンクも集約できる。
 */
const MIN_LABEL = savingsManLabel(SAVINGS_AMOUNTS[0])
const MAX_LABEL = savingsManLabel(SAVINGS_AMOUNTS[SAVINGS_AMOUNTS.length - 1])

export const metadata: Metadata = {
  title: `手取り別の貯金額の目安【${FISCAL_YEAR}年版】${MIN_LABEL}〜${MAX_LABEL}`,
  description:
    `手取り${MIN_LABEL}から${MAX_LABEL}まで、毎月いくら貯金するのが目安かを一覧にしました。` +
    `100万円貯まるまでの期間、生活防衛資金の目標額、20代の貯蓄額の実態（中央値${Math.round(SAVINGS_BENCHMARK.median20s / 10_000)}万円・非保有${SAVINGS_BENCHMARK.nonHolderRate20s}%）まで掲載。`,
  alternates: { canonical: `${SITE_URL}/savings` },
}

export default function SavingsIndexPage() {
  const updated = updatedAt()

  const rows = SAVINGS_AMOUNTS.map((amount) => {
    const d = buildSavingsPage(amount, [])!
    return {
      amount,
      label: d.amountLabel,
      low: d.paces[0].monthly,
      high: d.paces[1].monthly,
      annualHigh: d.paces[1].annual,
      toMillion: d.paces[1].monthsToMillion,
    }
  })

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `手取り別の貯金額の目安 ${FISCAL_YEAR}`,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `手取り${r.label}の貯金の目安`,
      url: `${SITE_URL}/savings/${r.amount}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <span>/</span>
              <span className="text-foreground font-medium">貯金の目安</span>
            </nav>

            <header className="mb-6">
              <h1 className="jp-heading text-2xl md:text-4xl font-bold text-primary mb-3 leading-[1.35]">
                手取り別の貯金額の目安
              </h1>
              <p className="jp-lead text-[15px] md:text-lg text-muted-foreground leading-[1.8] mb-3">
                毎月いくら貯めるのが現実的か、手取り{MIN_LABEL}〜{MAX_LABEL}で一覧にしました
              </p>
              <p className="text-xs text-muted-foreground">
                最終更新日: <time dateTime={updated.iso}>{updated.label}</time>
              </p>
            </header>

            <section className="mb-8 rounded-2xl border bg-card p-5 md:p-6 border-l-4 border-l-primary/50">
              <p className="text-[16px] leading-[1.95] text-muted-foreground">
                {SAVINGS_BENCHMARK.assetSurvey}によると、
                {SAVINGS_BENCHMARK.assetTarget}の金融資産の中央値は
                <strong className="text-foreground">
                  {Math.round(SAVINGS_BENCHMARK.median20s / 10_000)}万円
                </strong>
                です。同じ調査で金融資産を持たない世帯が
                <strong className="text-foreground">{SAVINGS_BENCHMARK.nonHolderRate20s}%</strong>
                あり、20代の貯蓄額は人によって大きく開いているのが実態です。
                平均値は一部の高額保有者に引き上げられるため、実感に近いのは中央値のほうです。
              </p>
            </section>

            <AdBanner />

            <section className="mt-8">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">手取り別の一覧</h2>
              <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th scope="col" className="p-3 text-left font-medium">手取り（月）</th>
                      <th scope="col" className="p-3 text-right font-medium">月の貯金目安</th>
                      <th scope="col" className="p-3 text-right font-medium hidden sm:table-cell">年間</th>
                      <th scope="col" className="p-3 text-right font-medium hidden sm:table-cell">100万円まで</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.amount} className="border-b last:border-b-0 hover:bg-accent transition-colors">
                        <th scope="row" className="p-0 text-left">
                          <Link
                            href={`/savings/${r.amount}`}
                            className="block p-3 font-bold text-primary hover:underline"
                          >
                            {r.label}
                          </Link>
                        </th>
                        <td className="p-3 text-right font-semibold tabular text-foreground whitespace-nowrap">
                          {r.low.toLocaleString()}〜{r.high.toLocaleString()}円
                        </td>
                        <td className="p-3 text-right tabular text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                          〜{Math.round(r.annualHigh / 10_000)}万円
                        </td>
                        <td className="p-3 text-right tabular text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                          {periodLabel(r.toMillion)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                ※ 月の貯金目安は手取りの{SAVINGS_BENCHMARK.ruleOfThumbMin}〜
                {SAVINGS_BENCHMARK.ruleOfThumbMax}%（先取り貯蓄の一般的な目安）、
                「100万円まで」は{SAVINGS_BENCHMARK.ruleOfThumbMax}%で貯めた場合の期間です。
                賞与は含めていないため、支給がある企業ではこれより早く貯まります。
              </p>
            </section>

            <section className="mt-10 border-t pt-6">
              <h2 className="text-lg font-bold mb-3">あわせて見る</h2>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/take-home">額面から手取りを調べる</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking">初任給ランキング</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/simulator">手取りシミュレーター</Link>
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
