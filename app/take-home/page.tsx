import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"
import { TAKE_HOME_AMOUNTS, manLabel } from "@/lib/take-home"
import { ANNUAL_AMOUNTS, annualManLabel } from "@/lib/annual-take-home"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

export const revalidate = REVALIDATE_STABLE

/**
 * 額面別ページのハブ。
 * 一覧そのものが「手取り早見表」として検索需要を持つうえ、
 * 41本の個別ページへの内部リンクを1か所に集約できるので
 * クロール導線としても機能する。
 */
export const metadata: Metadata = {
  title: `給料の手取り早見表【${FISCAL_YEAR}年版】額面20万〜60万円`,
  description:
    "月給の額面から手取りがいくらになるかを一覧にしました。20万円から60万円まで1万円刻みで、社会人1年目と2年目それぞれの手取りを掲載。健康保険・厚生年金・雇用保険・所得税・住民税の内訳も確認できます。",
  alternates: { canonical: `${SITE_URL}/take-home` },
}

export default function TakeHomeIndexPage() {
  const updated = updatedAt()

  const rows = TAKE_HOME_AMOUNTS.map((amount) => {
    const est = estimateNetSalary(amount)!
    return {
      amount,
      label: manLabel(amount),
      first: roundNet(est.netMonthlyFirstYear),
      second: roundNet(est.netMonthlySecondYear),
      ratio: Math.round((est.netMonthlyFirstYear / amount) * 1000) / 10,
    }
  })

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `給料の手取り早見表 ${FISCAL_YEAR}`,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `額面${r.label}の手取り`,
      url: `${SITE_URL}/take-home/${r.amount}`,
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
              <span className="text-foreground font-medium">手取り早見表</span>
            </nav>

            <header className="mb-6">
              <h1 className="jp-heading text-2xl md:text-4xl font-bold text-primary mb-3 leading-[1.35]">
                給料の手取り早見表
              </h1>
              <p className="jp-lead text-[15px] md:text-lg text-muted-foreground leading-[1.8] mb-3">
                額面20万円から60万円まで、1万円刻みの手取り一覧です
              </p>
              <p className="text-xs text-muted-foreground">
                最終更新日: <time dateTime={updated.iso}>{updated.label}</time>
              </p>
            </header>

            <section className="mb-8 rounded-2xl border bg-card p-5 md:p-6 border-l-4 border-l-primary/50">
              <p className="text-[16px] leading-[1.95] text-muted-foreground">
                求人票に書かれているのは額面の金額です。実際に振り込まれるのは、そこから
                健康保険料・厚生年金保険料・雇用保険料・所得税を差し引いた金額になります。
                さらに2年目からは住民税が加わるため、給与が変わっていなくても手取りは減ります。
                金額をクリックすると、内訳とその額面前後の企業まで確認できます。
              </p>
            </section>

            <AdBanner />

            <section className="mt-8">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">額面別の手取り一覧</h2>
              <div className="overflow-hidden rounded-2xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th scope="col" className="p-3 text-left font-medium">額面（月）</th>
                      <th scope="col" className="p-3 text-right font-medium">1年目の手取り</th>
                      <th scope="col" className="p-3 text-right font-medium hidden sm:table-cell">2年目以降</th>
                      <th scope="col" className="p-3 text-right font-medium hidden sm:table-cell">割合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.amount} className="border-b last:border-b-0 hover:bg-accent transition-colors">
                        <th scope="row" className="p-0 text-left">
                          <Link
                            href={`/take-home/${r.amount}`}
                            className="block p-3 font-bold text-primary hover:underline"
                          >
                            {r.label}
                          </Link>
                        </th>
                        <td className="p-3 text-right font-semibold tabular text-foreground">
                          {r.first.toLocaleString()}円
                        </td>
                        <td className="p-3 text-right tabular text-muted-foreground hidden sm:table-cell">
                          {r.second.toLocaleString()}円
                        </td>
                        <td className="p-3 text-right tabular text-muted-foreground hidden sm:table-cell">
                          {r.ratio}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                ※ 扶養なし・40歳未満で算出した概算値です。お住まいの自治体や企業独自の控除によって前後します。
                扶養家族がいる場合や条件を変えて計算したい場合は
                <Link href="/simulator" className="text-primary hover:underline mx-1">シミュレーター</Link>
                をご利用ください。
              </p>
            </section>

            {/* 【年収軸への導線】月額版で結果が出たので年収版を追加した。
                「年収500万 手取り」系は月額版より検索数が大きい。
                ハブから全ページへリンクしてクロール導線にする。 */}
            <section className="mt-10">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-3">年収別の手取り</h2>
              <p className="text-[15px] md:text-base text-muted-foreground mb-4 leading-relaxed">
                賞与を含めた年収から手取りを知りたい場合はこちらです。住民税を含めた通年の金額を掲載しています。
              </p>
              <ul className="flex flex-wrap gap-2">
                {ANNUAL_AMOUNTS.map((a) => (
                  <li key={a}>
                    <Link
                      href={`/take-home/annual/${a}`}
                      className="inline-flex h-10 items-center rounded-lg border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      年収{annualManLabel(a)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 border-t pt-6">
              <h2 className="text-lg font-bold mb-3">あわせて見る</h2>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/simulator">手取りシミュレーター</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking">初任給ランキング</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/companies">掲載企業一覧</Link>
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
