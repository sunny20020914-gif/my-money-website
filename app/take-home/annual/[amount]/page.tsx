import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { CompanyLogo } from "@/components/company-logo"
import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildAnnualTakeHome, ANNUAL_AMOUNTS, annualManLabel } from "@/lib/annual-take-home"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

type Props = { params: { amount: string } }

export const revalidate = REVALIDATE_STABLE

/**
 * 年収別の手取りページ。
 *
 * 月額別（/take-home/[amount]）が公開数日で6〜10位に入ったため、
 * 同じ型を年収軸に広げる。「年収500万 手取り」系は月額版より検索数が大きい。
 *
 * 【ルーティングの注意】親の /take-home/[amount] は数値以外を受け付けないため、
 * /take-home/annual というパスがそちらに吸われることはない。
 */

export function generateStaticParams() {
  return ANNUAL_AMOUNTS.map((amount) => ({ amount: String(amount) }))
}

const parseAmount = (raw: string): number | null => {
  const n = Number(raw)
  return Number.isInteger(n) && ANNUAL_AMOUNTS.includes(n) ? n : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const amount = parseAmount(params.amount)
  if (amount === null) return { title: "ページが見つかりません" }

  const all = await fetchAllUniqueCompanies().catch(() => [])
  const d = buildAnnualTakeHome(amount, all)
  if (!d) return { title: "ページが見つかりません" }

  return {
    title: `年収${d.amountLabel}の手取りはいくら？月${Math.round(d.netMonthly / 10_000)}万円台【${FISCAL_YEAR}年版】`,
    description:
      `年収${d.amountLabel}の手取りは年間約${d.netAnnual.toLocaleString()}円（月あたり約${d.netMonthly.toLocaleString()}円）。` +
      `健康保険・厚生年金・雇用保険・所得税・住民税の内訳と手取り率${d.ratio}%の根拠を解説。` +
      `平均年収がこの水準の企業も掲載しています。`,
    alternates: { canonical: `${SITE_URL}/take-home/annual/${amount}` },
  }
}

export default async function AnnualTakeHomePage({ params }: Props) {
  const amount = parseAmount(params.amount)
  if (amount === null) notFound()

  const all = await fetchAllUniqueCompanies().catch(() => [])
  const d = buildAnnualTakeHome(amount, all)
  if (!d) notFound()

  const updated = updatedAt()
  const yen = (v: number) => `${Math.round(v).toLocaleString()}円`

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "手取り早見表", item: `${SITE_URL}/take-home` },
      {
        "@type": "ListItem",
        position: 3,
        name: `年収${d.amountLabel}の手取り`,
        item: `${SITE_URL}/take-home/annual/${amount}`,
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <span>/</span>
              <Link href="/take-home" className="hover:text-primary transition-colors">手取り早見表</Link>
              <span>/</span>
              <span className="text-foreground font-medium">年収{d.amountLabel}</span>
            </nav>

            <header className="mb-6">
              <h1 className="jp-heading text-2xl md:text-4xl font-bold text-primary mb-3 leading-[1.35]">
                年収{d.amountLabel}の手取りはいくら？
              </h1>
              <p className="text-xs text-muted-foreground">
                最終更新日: <time dateTime={updated.iso}>{updated.label}</time>
              </p>
            </header>

            {/* 結論を先に置く。検索結果から来た読者が最初に見る位置 */}
            <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 md:p-7 mb-8">
              <p className="text-sm text-muted-foreground mb-1">年間の手取り</p>
              <p className="text-4xl md:text-5xl font-bold text-primary tabular mb-4">
                約{d.netAnnual.toLocaleString()}
                <span className="text-xl md:text-2xl font-normal">円</span>
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-card p-3">
                  <dt className="text-xs text-muted-foreground mb-0.5">月あたりの目安</dt>
                  <dd className="text-lg font-bold text-foreground tabular">
                    約{d.netMonthly.toLocaleString()}円
                  </dd>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <dt className="text-xs text-muted-foreground mb-0.5">手取り率</dt>
                  <dd className="text-lg font-bold text-foreground tabular">約{d.ratio}%</dd>
                </div>
              </dl>
            </section>

            <AdBanner />

            <section className="mt-8">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                年間いくら引かれる？内訳を見る
              </h2>
              <div className="rounded-2xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {d.breakdown.map((row) => (
                      <tr key={row.label} className="border-b last:border-b-0">
                        <th scope="row" className="p-4 text-left align-top">
                          <span className="block font-semibold text-foreground">{row.label}</span>
                          <span className="mt-1 block text-xs font-normal text-muted-foreground leading-relaxed">
                            {row.note}
                          </span>
                        </th>
                        <td className="p-4 text-right align-top whitespace-nowrap font-bold tabular text-foreground">
                          −{yen(row.value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50">
                      <th scope="row" className="p-4 text-left font-bold">天引きの合計（年間）</th>
                      <td className="p-4 text-right font-bold tabular text-foreground whitespace-nowrap">
                        −{yen(d.deductionAnnual)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 space-y-5">
              {d.paragraphs.map((p, i) => (
                <p key={i} className="text-[16px] md:text-base leading-[1.95] text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>

            {/* 【内部リンク】平均年収がこの水準にある掲載企業。
                その年収帯が実在することの裏付けにもなる */}
            {d.nearbyCompanies.length > 0 && (
              <section className="mt-10">
                <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                  平均年収が{d.amountLabel}前後の企業
                </h2>
                <ul className="space-y-2">
                  {d.nearbyCompanies.map((r) => (
                    <li key={r.company.id}>
                      <Link
                        href={`/companies/${r.company.id}`}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:bg-accent transition-colors"
                      >
                        <CompanyLogo
                          logo={r.company.logo}
                          domain={r.company.domain}
                          company={r.company.company}
                          size={40}
                          className="h-10 w-10 shrink-0 rounded-lg object-contain"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-foreground">
                            {r.company.company}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.company.industry.split("/").map((s) => s.trim()).filter(Boolean).join("・")}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-bold text-primary tabular">
                          {Math.round(r.averageMan).toLocaleString()}万円
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  ※ 平均年収は有価証券報告書の「平均年間給与」に基づくため、原則として上場企業の数値です。
                  管理職を含む全社員の平均であり、新卒入社時の年収とは異なります。
                </p>
              </section>
            )}

            <div className="mt-10">
              <AdBanner />
            </div>

            <section className="mt-10">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">よくある質問</h2>
              <div className="space-y-4">
                {d.faq.map((f) => (
                  <div key={f.question} className="rounded-xl border bg-card p-4">
                    <h3 className="font-bold text-foreground mb-2 text-[16px]">{f.question}</h3>
                    <p className="text-[15px] leading-[1.9] text-muted-foreground">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 前後の年収へのページ送り＝クロール導線 */}
            <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
              {d.prevAmount !== null ? (
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href={`/take-home/annual/${d.prevAmount}`}>
                    ← 年収{annualManLabel(d.prevAmount)}
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              {d.nextAmount !== null && (
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href={`/take-home/annual/${d.nextAmount}`}>
                    年収{annualManLabel(d.nextAmount)} →
                  </Link>
                </Button>
              )}
            </nav>

            <section className="mt-8 border-t pt-6">
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/take-home">月額の手取り早見表</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking/average">平均年収ランキング</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/simulator">条件を変えて計算する</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                ※ 扶養なし・40歳未満・年収を12等分した額を標準報酬月額とみなして算出した概算値です。
                賞与にかかる保険料の料率は月給とわずかに異なるため、実際の金額は前後します。
                40歳以上は介護保険料が加わり、手取りはこれより少なくなります。
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
