import { ArrowRightIcon, DatabaseIcon } from "lucide-react"
import Link from "next/link"
import { FISCAL_YEAR } from "@/lib/config"
import { Button } from "@/components/ui/button"

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
/**
 * 【データ取得をやめた】
 * 統計ブロックのために掲載企業を全件取得して平均・最高額を計算していたが、
 * ブロックごと削除したため不要になった。
 *
 * これでヒーローはスプレッドシートに依存しない純粋な静的コンポーネントになり、
 *   ・ホームページの生成がSheets APIの状態に左右されない
 *   ・APIの呼び出しが1つ減る
 * という副次的な利点もある。
 */
export function HeroSection() {
  /**
   * 【統計ブロックを削除した経緯】
   *
   * もともと「掲載企業数・掲載平均の初任給・最高額・全国平均」の4枚を
   * grid-cols-2 md:grid-cols-4 で並べていた。
   * のちに掲載企業数（全企業数185社とランキング側159社が食い違うため）を
   * 外したが、グリッドの列数を直さなかったので3枚が2+1で折り返し、
   * 見た目が崩れていた。
   *
   * そこで列数を直すのではなく、ブロックごと削除する判断をした。
   * 残り3枚の数字はいずれも他の場所に出ているため。
   *   掲載平均の初任給 … /ranking の集計カード
   *   最高額 ………………… すぐ下のTOP5の1位（企業名つきで出る）
   *   全国平均 ……………… /ranking のリード文、下部の「データについて」
   *
   * 重複を消したうえ、ランキングへのボタンが1画面目に上がる。
   * 数字を再掲するより、実際の順位を早く見せるほうが用に適う。
   */

  return (
    <section className="relative pt-16 lg:pt-24 pb-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <DatabaseIcon className="w-4 h-4 mr-2" />
            {FISCAL_YEAR}年度データ／有価証券報告書・公的統計準拠
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
            確認できるデータサイトです。
          </p>

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
