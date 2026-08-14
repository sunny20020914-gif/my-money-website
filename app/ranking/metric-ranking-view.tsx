import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CompanyLogo } from "@/components/company-logo"
import { AdBanner } from "@/components/ad-banner"
import { Button } from "@/components/ui/button"
import { FISCAL_YEAR, TARGET_GRAD_LABEL } from "@/lib/config"
import { getMetricCopy } from "@/lib/metric-ranking-copy"
import { METRIC_RANKINGS, METRIC_RANKING_ORDER, type MetricRanking } from "@/lib/metric-rankings"

/**
 * 指標別ランキングページの描画。
 *
 * 【なぜ /ranking のカードを使い回さないか】
 * ランキングカードはPC用33要素＋モバイル用34要素と重く、
 * 全社を並べるとDOMが1万要素を超える。
 * このページの主役は「順位と数値の比較」であって企業の紹介ではないため、
 * 1行あたり10要素程度の軽い行で全社を掲載する。
 * こうすることで全企業がHTMLに載り、クロール導線としても機能する。
 *
 * サーバーコンポーネントとして描画し、クライアントJSを持たせない。
 */

/** 数値を強調表示する（自動生成の分析文を読みやすくする） */
function highlightNumbers(text: string): React.ReactNode[] {
  const SPLIT = /([+＋-−]?[\d,]+(?:\.\d+)?(?:円|%|社|倍|万円|億円|兆円))/g
  // 【注意】判定用の正規表現に g フラグを付けないこと。
  // g 付きの正規表現は .test() が lastIndex を保持するため、
  // 同じパターンを繰り返し呼ぶと結果が交互にずれる。
  const IS_NUMBER = /^[+＋-−]?[\d,]+(?:\.\d+)?(?:円|%|社|倍|万円|億円|兆円)$/
  return text.split(SPLIT).map((part, i) =>
    IS_NUMBER.test(part) ? (
      <strong key={i} className="font-bold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

/** ランキング種別の切り替えナビ。全6本を横並びにする */
function RankingSwitcher({ current }: { current: string }) {
  const items = [
    { path: "/ranking", label: "初任給" },
    { path: "/ranking/annual", label: "想定年収" },
    ...METRIC_RANKING_ORDER.map((slug) => ({
      path: METRIC_RANKINGS[slug].path,
      label: METRIC_RANKINGS[slug].shortLabel,
    })),
  ]

  return (
    <nav aria-label="ランキングの種類" className="mb-8">
      <p className="text-sm text-muted-foreground mb-2">別の切り口で見る</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.path === current
          const cls = active
            ? "px-4 py-2 rounded-full text-sm font-bold bg-primary text-primary-foreground"
            : "px-4 py-2 rounded-full text-sm font-medium border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          return (
            <li key={item.path}>
              {active ? (
                <span aria-current="page" className={cls}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.path} className={cls}>
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function MetricRankingView({ ranking }: { ranking: MetricRanking }) {
  const { def, entries, count, medianDisplay, industryAverages, analysis, faq } = ranking
  const copy = getMetricCopy(def.slug)
  const updated = new Date().toLocaleDateString("ja-JP")

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">
              ホーム
            </Link>
            <span>/</span>
            <Link href="/ranking" className="hover:text-primary transition-colors">
              初任給ランキング
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{def.shortLabel}</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-primary mb-4 leading-[1.35]">
              {def.h1}
            </h1>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <dt>最終更新</dt>
                <dd className="text-foreground">{updated}</dd>
              </div>
              <div className="flex gap-1">
                <dt>掲載</dt>
                <dd className="text-foreground">{count}社</dd>
              </div>
              <div className="flex gap-1">
                <dt>中央値</dt>
                <dd className="text-foreground">{medianDisplay}</dd>
              </div>
            </dl>
          </header>

          <RankingSwitcher current={def.path} />

          {/* 【自動生成】掲載データを実際に集計した結果。企業が増減しても追従する */}
          {analysis.length > 0 && (
            <section className="mb-8 rounded-2xl border bg-card p-5 md:p-7 border-l-4 border-l-primary/50">
              <div className="space-y-5">
                {analysis.map((p, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? "text-[17px] md:text-lg leading-[2.1] text-foreground"
                        : "text-[16px] md:text-base leading-[2.1] text-muted-foreground"
                    }
                  >
                    {highlightNumbers(p)}
                  </p>
                ))}
              </div>
            </section>
          )}

          <AdBanner />

          {/* --- ランキング本体 --- */}
          <section className="mt-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              {def.valueLabel}ランキング（{count}社）
            </h2>
            <ol className="space-y-2">
              {entries.map((e, i) => (
                <li key={`${e.company.id}-${i}`}>
                  <Link
                    href={`/companies/${e.company.id}`}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-accent transition-colors"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        e.rank <= 3
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {e.rank}
                    </span>
                    <CompanyLogo
                      logo={e.company.logo}
                      domain={e.company.domain}
                      company={e.company.company}
                      size={32}
                      className="h-8 w-8 shrink-0 rounded object-contain"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">
                        {e.company.company}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.extras.map((x) => `${x.label} ${x.value}`).join(" ／ ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-base md:text-lg font-bold text-primary tabular">
                      {e.display}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{def.note}</p>
          </section>

          {/* --- 業界別の中央値 --- */}
          {industryAverages.length >= 3 && (
            <section className="mt-10">
              <h2 className="text-xl md:text-2xl font-bold mb-4">
                業界別の{def.valueLabel}（中央値）
              </h2>
              <p className="text-[15px] md:text-base text-muted-foreground mb-4 leading-relaxed">
                3社以上を掲載している業界のみを対象にしています。業界ごとにビジネスの構造が違うため、
                比較は同じ業界どうしで行うのが適切です。
              </p>
              <ul className="divide-y rounded-xl border bg-card">
                {industryAverages.map((row) => (
                  <li key={row.industry} className="flex items-center justify-between gap-4 px-4 py-3">
                    <Link
                      href={`/industries/${encodeURIComponent(row.industry)}`}
                      className="text-[15px] font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {row.industry}
                      <span className="ml-2 text-xs text-muted-foreground">{row.count}社</span>
                    </Link>
                    <span className="text-[15px] font-bold text-foreground tabular">{row.display}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10">
            <AdBanner />
          </div>

          {/* --- 固定の解説 --- */}
          {copy.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl md:text-2xl font-bold mb-6">
                {def.shortLabel}の読み解き方
              </h2>
              <div className="space-y-8">
                {copy.map((section) => (
                  <article key={section.heading}>
                    <h3 className="text-lg md:text-xl font-bold text-foreground mb-3 leading-snug">
                      {section.heading}
                    </h3>
                    <div className="space-y-4">
                      {section.paragraphs.map((p, i) => (
                        <p key={i} className="text-[16px] md:text-base leading-[1.95] text-muted-foreground">
                          {p}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* --- FAQ --- */}
          {faq.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl md:text-2xl font-bold mb-4">よくある質問</h2>
              <div className="space-y-4">
                {faq.map((item) => (
                  <div key={item.question} className="rounded-xl border bg-card p-4">
                    <h3 className="font-bold text-foreground mb-2 text-[16px]">{item.question}</h3>
                    <p className="text-[15px] leading-[1.9] text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* --- 関連リンク --- */}
          <section className="mt-10 border-t pt-6">
            <h2 className="text-lg font-bold mb-3">他の切り口で企業を探す</h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/ranking">初任給ランキング</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/ranking/annual">想定年収ランキング</Link>
              </Button>
              {METRIC_RANKING_ORDER.filter((s) => s !== def.slug).map((slug) => (
                <Button key={slug} asChild variant="outline" className="bg-transparent">
                  <Link href={METRIC_RANKINGS[slug].path}>
                    {METRIC_RANKINGS[slug].shortLabel}ランキング
                  </Link>
                </Button>
              ))}
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/companies">掲載企業一覧</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/industries">業界別に見る</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {TARGET_GRAD_LABEL}向け・{FISCAL_YEAR}年度の掲載データに基づいています。
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
