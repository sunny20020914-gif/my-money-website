import { ArrowRightIcon, DatabaseIcon } from "lucide-react"
import Link from "next/link"
import { FISCAL_YEAR } from "@/lib/config"
import { MARKET_BENCHMARK } from "@/lib/market-benchmark"
import { Button } from "@/components/ui/button"
import { fetchAllUniqueCompanies } from "@/lib/sheets"

/**
 * 【重要・カニバリゼーション対策】
 *
 * 以前このヒーローの h1 は「2026年最新 初任給ランキング」だった。
 * 一方 /ranking の h1 も「初任給が高い企業ランキング」であり、
 * トップページとランキングページが同じキーワード・同じ検索意図を
 * 取り合う状態になっていた。
 *
 * 中身は /ranking の方が圧倒的に厚い（リード文・全社の表・解説セクション）ため、
 * Googleは「重複。別のページを正規と判断」としてトップページ側を
 * インデックスから落としていた（実際に / は未登録のままだった）。
 *
 * トップページは「ランキングを見せるページ」ではなく
 * 「サイト全体の入口＝どんなデータがあるのかを示すページ」に役割を変える。
 * h1 から『ランキング』という主要語を外し、
 *   ・ブランド検索（My Money Web）
 *   ・「初任給 調べる」「初任給 データベース」といった回遊型のクエリ
 * を受け止める設計にすることで /ranking と競合しなくなる。
 *
 * ※ トップページを消して /ranking に301する案は採らない。
 *   検索結果に出るサイト名（My Money Web）はトップページの
 *   WebSite構造化データからしか読まれず、サイトリンクやブランド検索も失うため。
 */
export async function HeroSection() {
  const all = await fetchAllUniqueCompanies().catch(() => [])

  const monthlyValues = all
    .map((c) => c.baseMonthly)
    .filter((v): v is number => typeof v === "number" && v > 0)

  const avgMonthly =
    monthlyValues.length > 0
      ? Math.round(monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length)
      : null
  const maxMonthly = monthlyValues.length > 0 ? Math.max(...monthlyValues) : null

  // トップ固有の指標。/ranking には無い切り口にする。
  //
  // 【掲載企業数を外した理由】
  // ここだけ全企業数（185社）を出しており、ランキングや業界ページが使う
  // 「初任給データがある企業数」（159社）と食い違っていた。
  // 数え方が違うだけで誤りではないが、同じサイトで違う数字が出るのは
  // 読み手にもGoogleにも不親切。
  //
  // そもそも185社は規模として誇れる数ではなく、出す意味が薄い。
  // 外した結果、残る3つはすべて「円」の金額になり、
  // 「掲載平均 → 最高額 → 全国平均」と横に読める組み合わせになった。
  // 掲載社数が十分に増えたら戻すことを検討する。
  const stats = [
    {
      label: "掲載平均の初任給",
      value: avgMonthly ? `${avgMonthly.toLocaleString()}円` : "—",
    },
    {
      label: "最高額",
      value: maxMonthly ? `${maxMonthly.toLocaleString()}円` : "—",
    },
    {
      label: "全国平均（大学卒）",
      value: `${MARKET_BENCHMARK.universityGraduate.toLocaleString()}円`,
    },
  ]

  return (
    <section className="relative pt-16 lg:pt-24 pb-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <DatabaseIcon className="w-4 h-4 mr-2" />
            {FISCAL_YEAR}年度データ／有価証券報告書・公的統計に基づく
          </div>

          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-5 leading-[1.3]">
            <span className="bg-gradient-to-r from-primary from-30% via-primary-foreground to-primary to-70% bg-[length:200%_auto] bg-clip-text text-transparent animate-[animate-gradient_9s_ease_infinite]">
              企業の初任給と平均年収を、
              <br className="md:hidden" />
              データで調べる
            </span>
          </h1>

          <p className="jp-lead text-[17px] md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-[1.85]">
            初任給の額面だけでなく、手取り・入社後の平均年収・業績まで
            <br className="hidden md:block" />
            一社ずつ確認できる就活生向けのデータサイトです。
          </p>

          {/* 【トップ固有コンテンツ】サイト全体の規模と出典を先に示す。
              /ranking のリード文とは重複しない切り口（データベースとしての説明）にする */}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border bg-card/70 px-3 py-4 backdrop-blur-sm"
              >
                <dt className="text-xs md:text-sm text-muted-foreground mb-1">{s.label}</dt>
                <dd className="text-lg md:text-2xl font-bold text-foreground tabular">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Button asChild size="lg" className="text-base px-8 py-6 bg-primary">
              <Link href="/ranking">
                初任給ランキングを見る
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8 py-6 bg-transparent border-border"
            >
              <Link href="/companies">企業名から探す</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
