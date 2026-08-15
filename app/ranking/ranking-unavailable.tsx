import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { METRIC_RANKING_LINKS } from "@/lib/metric-ranking-links"

// ------------------------------------------------------------------
// 【ビルドが落ちた原因と、この画面が必要な理由】
//
// 指標ランキングの5ページは、データが揃わないとき notFound() を呼んでいた。
// 動的ルート（/companies/[id] など）ならこれで問題ないが、
// これらは静的ルートなので、ビルド時の事前レンダリングで notFound() が
// 発生すると Next.js は書き出すHTMLを決められず、
//   Export encountered errors on following paths: /ranking/average ...
// としてビルド全体を失敗させる。
//
// しかも lib/sheets.ts は取得エラーを握りつぶして [] を返す設計のため、
// Googleスプレッドシート側の一時的な失敗やAPIの回数制限だけで
//   [] → 集計対象0社 → null → notFound() → デプロイ失敗
// という連鎖が起きていた。データの一時的な不調でデプロイ全体が
// 止まるのは明らかに脆すぎる。
//
// そこで notFound() をやめ、この代替画面を返す。
//   ・ビルドは必ず成功する
//   ・noindex を付けるので検索結果には出ない（中身の薄いページを
//     インデックスさせない、という当初の狙いは維持できる）
//   ・sitemap も同じ判定で除外しているので不整合は起きない
//   ・他のランキングへの導線があるため、訪問者は行き止まりにならない
// データが復旧すれば、次の再生成で通常のランキング表示に戻る。
// ------------------------------------------------------------------

/** データが揃わないときに返す代替画面。必ず noindex とセットで使う */
export function RankingUnavailable({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4">{title}</h1>
          <p className="text-[16px] md:text-lg text-muted-foreground leading-[1.9] mb-8">
            現在このランキングのデータを準備しています。
            集計に必要な件数が揃い次第、自動的に表示されます。
            お手数ですが、しばらくしてから再度ご確認ください。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/ranking">初任給ランキングを見る</Link>
            </Button>
            {METRIC_RANKING_LINKS.map((l) => (
              <Button key={l.slug} asChild variant="outline" className="bg-transparent">
                <Link href={l.path}>{l.shortLabel}</Link>
              </Button>
            ))}
            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/companies">掲載企業一覧</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

/**
 * データが無いときのメタデータ。
 * noindex を必ず付けること。これが無いと中身の薄いページが
 * インデックスされ、サイト全体の評価を下げる。
 * follow は残すのでリンク先のクロールは通常どおり行われる。
 */
export const UNAVAILABLE_ROBOTS = { index: false, follow: true } as const
