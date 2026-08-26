import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { CompanyLogo } from "@/components/company-logo"
import { ArrowRightIcon } from "lucide-react"
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

            {/* --- 住まい方による差 ---
                【独自の切り口】銀行のコラムは「手取りの1〜2割を貯めましょう」で終わる。
                実際に効くのは住まいの選択で、統計上は年110万円以上の差がつく。
                初任給が月5万円高い企業でも年60万円の差にしかならないため、
                就活生にとってはこちらのほうがインパクトが大きい。 */}
            <section className="mt-10">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                実家暮らしなら、いくら変わる？
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {d.livingScenarios.map((s) => (
                  <div
                    key={s.key}
                    className={`rounded-2xl border p-4 md:p-5 ${
                      s.beatsAverage ? "border-primary/40 bg-primary/5" : "bg-card"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p
                      className={`text-2xl md:text-3xl font-bold tabular mb-1 ${
                        s.annualSurplus > 0 ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {s.annualSurplus > 0
                        ? Math.round(s.annualSurplus / 10_000).toLocaleString()
                        : "0"}
                      <span className="text-sm font-normal text-muted-foreground">万円/年</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      年間支出 約{Math.round(s.annualCost / 10_000).toLocaleString()}万円
                    </p>
                    <p className="text-[13px] leading-[1.8] text-muted-foreground">{s.note}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border-l-4 border-l-primary/50 bg-card p-4">
                <p className="text-[16px] leading-[1.95] text-foreground">
                  その差は年
                  <strong className="text-primary text-xl mx-1 tabular">
                    {Math.round(d.livingDiff / 10_000).toLocaleString()}万円
                  </strong>
                  。初任給が月5万円高い企業に入っても年60万円の差なので、
                  住まいの選択は企業選びと同じくらい貯蓄額を左右します。
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                ※ 家賃補助や社宅がある企業なら、一人暮らしでもこの差をかなり埋められます。
                福利厚生は求人票だけでは分かりにくいので、説明会や面接で確認してください。
              </p>
            </section>

            {/* --- 30歳時点の目標額 --- */}
            <section className="mt-10">
              <h2 className="jp-heading text-xl md:text-2xl font-bold mb-4">
                30歳までに1,000万円は貯まる？
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">必要なペース</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground tabular">
                    年{Math.round(d.goalAt30.requiredAnnual / 10_000).toLocaleString()}万円
                  </p>
                </div>
                <div
                  className={`rounded-2xl border p-4 ${
                    d.goalAt30.achievable ? "border-primary/40 bg-primary/5" : "bg-card"
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    手取りの{SAVINGS_BENCHMARK.ruleOfThumbMax}%なら
                  </p>
                  <p
                    className={`text-xl md:text-2xl font-bold tabular ${
                      d.goalAt30.achievable ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    年{Math.round(d.goalAt30.actualAnnual / 10_000).toLocaleString()}万円
                  </p>
                </div>
              </div>
              <p className="text-[16px] leading-[1.95] text-muted-foreground">
                {SAVINGS_BENCHMARK.firstYearSurvey}によると、社会人1年目の平均貯蓄額は
                {Math.round(SAVINGS_BENCHMARK.firstYearAverage / 10_000)}万円、
                社会人2年目が考える30歳時点の目標額は平均
                {Math.round(d.goalAt30.goal / 10_000).toLocaleString()}万円です。
                {d.goalAt30.achievable
                  ? "手取りの20%を貯め続けられれば、計算上はこのペースに乗ります。"
                  : `手取り${d.amountLabel}の20%では年${Math.round(d.goalAt30.shortfallAnnual / 10_000).toLocaleString()}万円足りませんが、給与は年次とともに上がるため、昇給と賞与でこの差は縮まります。`}
                目標額はアンケートの平均値であり、全員が目指すべき金額ではありません。
              </p>
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
              </div>

              {/* 【回遊】貯蓄ページから企業選びへ戻す。
                  「貯められる額を増やしたい」→「初任給の高い企業を見る」は
                  読者の関心が自然につながる流れで、当サイトの本体でもある。 */}
              <div className="mt-6 rounded-2xl border bg-card p-5">
                <h2 className="jp-heading text-lg md:text-xl font-bold text-foreground mb-2">
                  貯められる額を増やすには
                </h2>
                <p className="text-[15px] leading-[1.9] text-muted-foreground mb-4">
                  支出を削るより、そもそもの手取りを上げるほうが確実です。
                  当サイトでは掲載企業の初任給・手取り・入社後の平均年収まで比較できます。
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    href="/ranking"
                    className="group flex h-14 items-center justify-between gap-2 rounded-xl border-2 bg-card px-4 text-[15px] font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    初任給が高い企業ランキング
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <Link
                    href="/ranking/growth"
                    className="group flex h-14 items-center justify-between gap-2 rounded-xl border-2 bg-card px-4 text-[15px] font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    入社後に伸びる企業
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <Link
                    href="/ranking/average"
                    className="group flex h-14 items-center justify-between gap-2 rounded-xl border-2 bg-card px-4 text-[15px] font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    平均年収ランキング
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <Link
                    href="/companies"
                    className="group flex h-14 items-center justify-between gap-2 rounded-xl border-2 bg-card px-4 text-[15px] font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    企業名から探す
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </div>
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
