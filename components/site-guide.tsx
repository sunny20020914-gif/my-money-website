import Link from "next/link"
import {
  TrophyIcon,
  CoinsIcon,
  Building2Icon,
  LayersIcon,
  SlidersHorizontalIcon,
  CalculatorIcon,
  BookOpenIcon,
  GraduationCapIcon,
  TrendingUpIcon,
  WalletIcon,
  ScaleIcon,
  PiggyBankIcon,
} from "lucide-react"
import { FISCAL_YEAR, TARGET_GRADS } from "@/lib/config"
import { MARKET_BENCHMARK } from "@/lib/market-benchmark"
import { LISTED_COMPANY_NOTE } from "@/lib/financials"

/**
 * 【トップページ＝ポータル】目的別の入口一覧。
 *
 * 役割は2つある。
 *
 * ① 検索意図の分離
 *    トップが「ランキングを見せるページ」だと /ranking と食い合う。
 *    「サイトの案内図」に徹することで、トップは
 *    ブランド検索と回遊クエリだけを受け止めるようになる。
 *
 * ② クロール導線
 *    Googlebotはトップページを最も高い頻度で訪れる。
 *    そこから主要な一覧ページ全てへ1クリックで到達できるようにしておくと、
 *    その先の企業詳細ページまでの深さが浅くなり発見されやすくなる。
 *    （フッターにもリンクはあるが、本文中のリンクの方が強く評価される）
 */

const ENTRIES = [
  {
    href: "/ranking",
    icon: TrophyIcon,
    title: "初任給ランキング",
    desc: "月額の初任給が高い順。額面と手取りの目安を並べて比較できます。",
  },
  {
    href: "/ranking/annual",
    icon: CoinsIcon,
    title: "想定年収ランキング",
    desc: "賞与を含めた年収ベース。初任給とは順位が大きく入れ替わります。",
  },
  {
    href: "/industries",
    icon: LayersIcon,
    title: "業界別に見る",
    desc: "業界ごとの初任給・平均年収・伸び率・収益力をまとめて比較できます。",
  },
  {
    href: "/ranking/balanced",
    icon: ScaleIcon,
    title: "初任給×平均年収",
    desc: "入社時も入社後も高い企業。両方が高い会社は実は多くありません。",
  },
  {
    href: "/ranking/growth",
    icon: TrendingUpIcon,
    title: "賃金の伸び率ランキング",
    desc: "初任給から平均年収まで何倍に伸びるか。初任給だけでは見えない指標。",
  },
  {
    href: "/ranking/average",
    icon: WalletIcon,
    title: "平均年収ランキング",
    desc: "有価証券報告書に基づく全社員の平均年収。口コミではない実額。",
  },
  {
    href: "/companies",
    icon: Building2Icon,
    title: "掲載企業一覧",
    desc: "社名から直接探す。各社の初任給・平均年収・業績をまとめています。",
  },
  {
    href: "/lists",
    icon: SlidersHorizontalIcon,
    title: "条件で絞り込む",
    desc: "月30万円以上、平均年収1,000万円超など、条件別のまとめ。",
  },
  {
    href: "/savings",
    icon: PiggyBankIcon,
    title: "貯金の目安",
    desc: "手取り別に毎月いくら貯めるのが現実的か。20代の実態データつき。",
  },
  {
    href: "/take-home",
    icon: CalculatorIcon,
    title: "手取り早見表",
    desc: "額面20万〜60万円の手取りを1万円刻みで一覧。内訳も確認できます。",
  },
  {
    href: "/take-home/annual",
    icon: CoinsIcon,
    title: "年収別の手取り",
    desc: "年収300万〜1,500万円の手取りを一覧。社会保険料と税金の内訳つき。",
  },
  {
    href: "/simulator",
    icon: SlidersHorizontalIcon,
    title: "手取りシミュレーター",
    desc: "扶養人数など条件を変えて、自分に合わせた手取りを計算。",
  },
  {
    href: "/articles",
    icon: BookOpenIcon,
    title: "就活記事",
    desc: "初任給の読み解き方や企業選びの考え方を解説しています。",
  },
]

export function SiteGuide() {
  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-3xl font-bold mb-3">目的から探す</h2>
            <p className="text-[15px] md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              知りたいことに合わせて入口を分けています。初任給の順位を見たいのか、
              入社後の年収まで知りたいのか、特定の企業を調べたいのかで選んでください。
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {ENTRIES.map(({ href, icon: Icon, title, desc }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-5 transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-bold text-foreground text-[15px] md:text-base">
                      {title}
                    </span>
                  </span>
                  <span className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                    {desc}
                  </span>
                </Link>
              </li>
            ))}

            {/* 卒年別ページ。「27卒 初任給」のようなクエリの受け皿への導線 */}
            {TARGET_GRADS.map((g) => (
              <li key={g}>
                <Link
                  href={`/grad/${g}`}
                  className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-5 transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <GraduationCapIcon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-bold text-foreground text-[15px] md:text-base">
                      {String(g).padStart(2, "0")}卒向けまとめ
                    </span>
                  </span>
                  <span className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                    20{g}年卒の就職活動に向けた、初任給データと企業選びの要点。
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/**
 * 【E-E-A-T】データの出どころと算出方法の説明。
 *
 * 給与情報はYMYL（お金に関わる領域）に近く、
 * 「誰がどの一次情報を使って作ったか」が評価に直結する。
 * この説明はトップページ固有の文章であり、
 * ランキングページのリード文とは切り口が重ならないようにしている
 * （あちらは「相場と傾向の解説」、こちらは「データの素性の開示」）。
 */
export function DataPolicy() {
  return (
    <section className="py-14 md:py-20 bg-card/30 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-3xl font-bold mb-6 text-center">
            このサイトのデータについて
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-foreground mb-2 text-[16px] md:text-lg">
                初任給データの出どころ
              </h3>
              <p className="text-[16px] md:text-base text-muted-foreground leading-[1.95]">
                各企業が公開している採用ページ・募集要項に記載された金額を、
                職種ごとに個別に収集しています。同じ企業でも職種によって初任給が異なる場合は、
                それぞれ別の行として掲載しています。{FISCAL_YEAR}年度の募集内容に基づき、
                1時間ごとに最新のデータへ更新されます。
              </p>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-2 text-[16px] md:text-lg">
                平均年収・業績データの出どころ
              </h3>
              <p className="text-[16px] md:text-base text-muted-foreground leading-[1.95]">
                平均年収・売上高・営業利益・従業員数は、金融庁のEDINETで公開されている
                有価証券報告書から取得しています。
                {/* 有報の提出義務は原則として上場企業にあるため、
                    この数値は上場企業の水準である。母集団を書かないと
                    日本企業全体の相場だと誤解される。 */}
                {LISTED_COMPANY_NOTE}
                一人あたりの売上高などの指標は連結従業員数を
                もとに算出しているため、持株会社のように単体と連結で人数が大きく異なる企業では
                実態とずれることがあります。その場合は各企業のページで注意書きを表示しています。
              </p>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-2 text-[16px] md:text-lg">
                掲載企業の偏りについて
              </h3>
              <p className="text-[16px] md:text-base text-muted-foreground leading-[1.95]">
                当サイトは初任給の高い企業を中心に収録しているため、掲載企業の平均は
                日本全体の相場より高く出ます。世間一般の水準は
                {MARKET_BENCHMARK.surveyName}が示すとおり、
                大学卒で月額{MARKET_BENCHMARK.universityGraduate.toLocaleString()}円
                （{MARKET_BENCHMARK.yearLabel}）です。
                相場を知りたい場合はこの数値を、高待遇の企業を探したい場合は
                当サイトのランキングを基準にしてください。
              </p>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-2 text-[16px] md:text-lg">
                手取り額の計算方法
              </h3>
              <p className="text-[16px] md:text-base text-muted-foreground leading-[1.95]">
                健康保険・厚生年金・雇用保険・所得税・住民税を額面から差し引いて算出した
                概算値です。扶養の有無や自治体、企業独自の控除によって実際の金額は前後します。
                目安としてご利用ください。
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/about" className="underline hover:text-foreground transition-colors">
              サイトの運営方針について詳しく見る
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
