import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { CompanyLogo } from "@/components/company-logo"
import { fetchAllUniqueCompanies } from "@/lib/sheets"
import {
  buildSavingsPage,
  SAVINGS_AMOUNTS,
  savingsManLabel,
  periodLabel,
} from "@/lib/savings-page"
import { SAVINGS_BENCHMARK } from "@/lib/savings"
import { nearestTakeHomeAmount } from "@/lib/take-home"
import { SITE_URL, FISCAL_YEAR, REVALIDATE_STABLE } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

type Props = { params: { amount: string } }

export const revalidate = REVALIDATE_STABLE

/**
 * 【ロングテール】手取り別の貯蓄ページ。
 *
 * 手取りページが公開数日で6〜10位に入ったため、同じ型を貯蓄に広げる。
 * 「手取り20万 貯金」「新卒 貯金 いくら」といった検索の受け皿。
 *
 * 手取りページとは扱う話が違う（あちらは引かれる話、こちらは残す話）ので
 * 内容は重複しない。相互リンクで回遊させる。
 */

export function generateStaticParams() {
  return SAVINGS_AMOUNTS.map((amount) => ({ amount: String(amount) }))
}

const parseAmount = (raw: string): number | null => {
  const n = Number(raw)
  return Number.isInteger(n) && SAVINGS_AMOUNTS.includes(n) ? n : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const amount = parseAmount(params.amount)
  if (amount === null) return { title: "ページが見つかりません" }

  const all = await fetchAllUniqueCompanies().catch(() => [])
  const d = buildSavingsPage(amount, all)
  if (!d) return { title: "ページが見つかりません" }

  const [low, high] = d.paces
  return {
    title: `手取り${d.amountLabel}の貯金はいくら？月${Math.round(high.monthly / 10_000)}万円が目安【${FISCAL_YEAR}年版】`,
    description:
      `手取り${d.amountLabel}なら毎月${low.monthly.toLocaleString()}〜${high.monthly.toLocaleString()}円、` +
      `年間${Math.round(low.annual / 10_000)}〜${Math.round(high.annual / 10_000)}万円が貯金の目安です。` +
      `100万円貯まるまでの期間、生活防衛資金の目標額、20代の貯蓄額の実態（中央値${Math.round(SAVINGS_BENCHMARK.median20s / 10_000)}万円）まで解説します。`,
    alternates: { canonical: `${SITE_URL}/savings/${amount}` },
  }
}

export default async function SavingsPage({ params }: Props) {
  const amount = parseAmount(params.amount)
  if (amount === null) notFound()

  const all = await fetchAllUniqueCompanies().catch(() => [])
  const d = buildSavingsPage(amount, all)
  if (!d) notFound()

  const updated = updatedAt()
  const yen = (v: number) => `${Math.round(v).toLocaleString()}円`
  const takeHomeLink = nearestTakeHomeAmount(d.grossEstimate)

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
      { "@type": "ListItem", position: 2, name: "貯金の目安", item: `${SITE_URL}/savings` },
      {
        "@type": "ListItem",
        position: 3,
        name: `手取り${d.amountLabel}の貯金`,
        item: `${SITE_URL}/savings/${amount}`,
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
              <Link href="/savings" className="hover:text-primary transition-colors">貯金の目安</Link>
              <span>/</span>
              <span className="text-foreground font-medium">手取り{d.amountLabel}</span>
            </nav>

            <header className="mb-6">
              <h1 className="jp-heading text-2xl md:text-4xl font-bold text-primary mb-3 leading-[1.35]">
                手取り{d.amountLabel}の貯金はいくらが目安？
              </h1>
              <p className="text-xs text-muted-foreground">
                最終更新日: <time dateTime={updated.iso}>{updated.label}</time>
              </p>
            </header>

            {/* 結論を先に。1つの数字ではなく幅で示す */}
            <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 md:p-7 mb-8">
              <p className="text-sm text-muted-foreground mb-1">毎月の貯金額の目安</p>
              <p className="text-3xl md:text-4xl font-bold text-primary tabular mb-1">
                {d.paces[0].monthly.toLocaleString()}〜{d.paces[1].monthly.toLocaleString()}
                <span className="text-lg md:text-xl font-normal">円</span>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                手取りの{SAVINGS_BENCHMARK.ruleOfThumbMin}〜{SAVINGS_BENCHMARK.ruleOfThumbMax}%を
                先取り貯蓄に回した場合
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-card p-3">
                  <dt className="text-xs text-muted-foreground mb-0.5">年間では</dt>
                  <dd className="text-lg font-bold text-foreground tabular">
                    {Math.round(d.paces[0].annual / 10_000)}〜{Math.round(d.paces[1].annual / 10_000)}万円
                  </dd>
                </div>
                <div className="rounded-xl bg-card p-3">
                  <dt className="text-xs text-muted-foreground mb-0.5">100万円貯まるまで</dt>
                  <dd className="text-lg font-bold text-foreground tabular">
                    {periodLabel(d.paces[1].monthsToMillion)}
                  </dd>
                </div>
              </dl>
            </section>

            <AdBanner />

            {/* --- ペース別 --- */}
            <section className="mt-8">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                ペース別に見るとどうなる？
              </h2>
              <div className="space-y-3">
                {d.paces.map((p) => (
                  <div key={p.label} className="rounded-2xl border bg-card p-4 md:p-5">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <h3 className="font-bold text-foreground text-[16px] md:text-lg">
                        {p.label}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          手取りの{p.rate}%
                        </span>
                      </h3>
                      <p className="shrink-0 text-xl md:text-2xl font-bold text-primary tabular">
                        月{p.monthly.toLocaleString()}円
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 tabular">
                      年間{Math.round(p.annual / 10_000)}万円／100万円まで{periodLabel(p.monthsToMillion)}
                    </p>
                    <p className="text-[15px] leading-[1.9] text-muted-foreground">{p.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* --- 目標額と到達期間 --- */}
            <section className="mt-10">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                目標額に届くまでの期間
              </h2>
              <p className="text-[15px] md:text-base text-muted-foreground mb-4 leading-relaxed">
                手取りの{SAVINGS_BENCHMARK.ruleOfThumbMax}%（月{yen(d.paces[1].monthly)}）を
                貯めた場合の到達期間です。賞与から上乗せすればこれより早くなります。
              </p>
              <div className="space-y-3">
                {d.goals.map((g) => (
                  <div key={g.label} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <h3 className="font-bold text-foreground text-[15px] md:text-base">{g.label}</h3>
                      <p className="shrink-0 font-bold text-primary tabular">
                        {periodLabel(g.months)}
                      </p>
                    </div>
                    <p className="text-[14px] leading-[1.85] text-muted-foreground">{g.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* --- 解説 --- */}
            <section className="mt-10 space-y-5">
              {d.paragraphs.map((p, i) => (
                <p key={i} className="text-[16px] md:text-base leading-[1.95] text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>

            {/* --- 近い手取りの企業（内部リンク） --- */}
            {d.nearbyCompanies.length > 0 && (
              <section className="mt-10">
                <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                  手取りが{d.amountLabel}前後になる企業
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
                          手取り{r.netMonthly.toLocaleString()}円
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

            <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
              {d.prevAmount !== null ? (
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href={`/savings/${d.prevAmount}`}>
                    ← 手取り{savingsManLabel(d.prevAmount)}
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              {d.nextAmount !== null && (
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href={`/savings/${d.nextAmount}`}>
                    手取り{savingsManLabel(d.nextAmount)} →
                  </Link>
                </Button>
              )}
            </nav>

            <section className="mt-8 border-t pt-6">
              <div className="flex flex-wrap gap-3">
                {/* 手取りページへ戻す導線。「引かれる話」と「残す話」で
                    内容が被らないため、相互リンクしても重複にならない */}
                {takeHomeLink !== null && (
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href={`/take-home/${takeHomeLink}`}>
                      この手取りになる額面を見る
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/savings">貯金の目安一覧</Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent">
                  <Link href="/ranking">初任給ランキング</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                ※ 先取り貯蓄の{SAVINGS_BENCHMARK.ruleOfThumbMin}〜{SAVINGS_BENCHMARK.ruleOfThumbMax}%と
                生活防衛資金の3〜6か月分は、公的統計ではなくファイナンシャルプランニングの慣行値です。
                黒字率は{SAVINGS_BENCHMARK.surplusSurvey}、金融資産の中央値は
                {SAVINGS_BENCHMARK.assetSurvey}によります。
                家賃・奨学金の返済・実家暮らしかどうかで実際に貯められる金額は大きく変わります。
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
