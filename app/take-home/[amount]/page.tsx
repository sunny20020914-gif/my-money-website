import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { CompanyLogo } from "@/components/company-logo"
import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildTakeHomePage, TAKE_HOME_AMOUNTS, manLabel } from "@/lib/take-home"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

type Props = { params: { amount: string } }

export const revalidate = REVALIDATE_STABLE

/**
 * 【ロングテール】額面別の手取りページ。
 *
 * 「初任給30万 手取り」「額面25万円 手取り」のような検索は数が多く、
 * かつ金融ジャンルとして広告単価も高い。
 * 計算ロジックは既にあったのに、その答えを受け止めるURLが無かった。
 *
 * 動的ルートにしているのは、金額の刻みを変えたくなったときに
 * lib/take-home.ts の配列を書き換えるだけで済むようにするため。
 */

export function generateStaticParams() {
  return TAKE_HOME_AMOUNTS.map((amount) => ({ amount: String(amount) }))
}

const parseAmount = (raw: string): number | null => {
  const n = Number(raw)
  return Number.isInteger(n) && TAKE_HOME_AMOUNTS.includes(n) ? n : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const amount = parseAmount(params.amount)
  if (amount === null) return { title: "ページが見つかりません" }

  const all = await fetchAllUniqueCompanies().catch(() => [])
  const data = buildTakeHomePage(amount, all)
  if (!data) return { title: "ページが見つかりません" }

  const label = manLabel(amount)
  return {
    title: `額面${label}の手取りはいくら？月${data.netFirstYear.toLocaleString()}円【${FISCAL_YEAR}年版】`,
    description:
      `月給の額面が${label}のときの手取りは約${data.netFirstYear.toLocaleString()}円（1年目）。` +
      `健康保険・厚生年金・雇用保険・所得税の内訳と、住民税が加わる2年目の手取り（約${data.netSecondYear.toLocaleString()}円）まで解説します。` +
      `初任給が${label}前後の企業も掲載。`,
    alternates: { canonical: `${SITE_URL}/take-home/${amount}` },
  }
}

export default async function TakeHomePage({ params }: Props) {
  const amount = parseAmount(params.amount)
  if (amount === null) notFound()

  const all = await fetchAllUniqueCompanies().catch(() => [])
  const data = buildTakeHomePage(amount, all)
  if (!data) notFound()

  const updated = updatedAt()
  const yen = (v: number) => `${Math.round(v).toLocaleString()}円`

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
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
        name: `額面${data.amountLabel}の手取り`,
        item: `${SITE_URL}/take-home/${amount}`,
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
              <span className="text-foreground font-medium">額面{data.amountLabel}</span>
            </nav>

            <header className="mb-6">
              <h1 className="jp-heading text-2xl md:text-4xl font-bold text-primary mb-3 leading-[1.35]">
                額面{data.amountLabel}の手取りはいくら？
              </h1>
              <p className="text-xs text-muted-foreground">
                最終更新日: <time dateTime={updated.iso}>{updated.label}</time>
              </p>
            </header>

            {/* 【結論を先に】検索結果から来た読者が最初に見る位置に答えを置く */}
            <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 md:p-7 mb-8">
              <p className="text-sm text-muted-foreground mb-1">1年目の手取り（月）</p>
              <p className="text-4xl md:text-5xl font-bold text-primary tabular mb-4">
                約{data.netFirstYear.toLocaleString()}
                <span className="text-xl md:text-2xl font-normal">円</span>
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-card p-3">
                  <dt className="text-xs text-muted-foreground mb-0.5">2年目以降（住民税あり）</dt>
                  <dd className="text-lg font-bold text-foreground tabular">
                    約{data.netSecondYear.toLocaleString()}円
                  </dd>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <dt className="text-xs text-muted-foreground mb-0.5">額面に対する割合</dt>
                  <dd className="text-lg font-bold text-foreground tabular">約{data.ratio}%</dd>
                </div>
              </dl>
            </section>

            <AdBanner />

            {/* --- 天引きの内訳 --- */}
            <section className="mt-8">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                毎月いくら引かれる？内訳を見る
              </h2>
              <div className="rounded-2xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {data.breakdown.map((row) => (
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
                      <th scope="row" className="p-4 text-left font-bold">天引きの合計（1年目）</th>
                      <td className="p-4 text-right font-bold tabular text-foreground whitespace-nowrap">
                        −{yen(data.deductionFirstYear)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <th scope="row" className="p-4 text-left align-top">
                        <span className="block font-semibold text-foreground">住民税（2年目から）</span>
                        <span className="mt-1 block text-xs font-normal text-muted-foreground leading-relaxed">
                          前年の所得に対してかかるため、1年目は引かれません。
                        </span>
                      </th>
                      <td className="p-4 text-right align-top whitespace-nowrap font-bold tabular text-muted-foreground">
                        −{yen(data.residentTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* --- 解説 --- */}
            <section className="mt-8 space-y-5">
              {data.paragraphs.map((p, i) => (
                <p key={i} className="text-[16px] md:text-base leading-[1.95] text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>

            {/* --- 近い額面の企業（内部リンク） --- */}
            {data.nearbyCompanies.length > 0 && (
              <section className="mt-10">
                <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                  初任給が{data.amountLabel}前後の企業
                </h2>
                <ul className="space-y-2">
                  {data.nearbyCompanies.map((r) => (
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
                          {yen(r.monthly)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-10">
              <AdBanner />
            </div>

            {/* --- FAQ --- */}
            <section className="mt-10">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">よくある質問</h2>
              <div className="space-y-4">
                {data.faq.map((f) => (
                  <div key={f.question} className="rounded-xl border bg-card p-4">
                    <h3 className="font-bold text-foreground mb-2 text-[16px]">{f.question}</h3>
                    <p className="text-[15px] leading-[1.9] text-muted-foreground">{f.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* --- 前後の額面（ページ送り＝クロール導線） --- */}
            <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
              {data.prevAmount !== null ? (
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href={`/take-home/${data.prevAmount}`}>← 額面{manLabel(data.prevAmount)}</Link>
                </Button>
              ) : (
                <span />
              )}
              {data.nextAmount !== null && (
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href={`/take-home/${data.nextAmount}`}>額面{manLabel(data.nextAmount)} →</Link>
                </Button>
              )}
            </nav>

            <section className="mt-8 border-t pt-6">
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/take-home">手取り早見表</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/simulator">条件を変えて計算する</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking">初任給ランキング</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                ※ 健康保険・厚生年金・雇用保険・所得税・住民税を額面から差し引いて算出した概算値です。
                扶養の有無、お住まいの自治体、企業独自の控除（社宅費・組合費など）によって実際の金額は前後します。
                40歳以上は介護保険料が加わるため、手取りはこれより少なくなります。
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
