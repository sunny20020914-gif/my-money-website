import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Search, Home, TrendingUp, Building2, FileText } from "lucide-react"

// 【ソフト404対策】
// これまでカスタム404ページが無く、Next.jsの既定の空に近いページが表示されていた。
// 中身のないページはGoogleに「ソフト404（実質エラーなのに200を返している）」と
// 判定されやすい。実際にGSCで旧記事URL（/articles/article-13 等）が
// ソフト404として検出されていた。
//
// ここで十分な内容と回遊導線を持つ404ページを用意することで、
// ・利用者を行き止まりにしない（他ページへ誘導できる）
// ・エラーページであることが明確になる
// の両方を満たす。
// ※ notFound() 経由でこのページが表示される際、Next.jsが自動的に
//   HTTPステータス404 と <meta name="robots" content="noindex"> を付与する。

// 【計測のため必須】タイトルを明示しないと、ルートlayoutの既定タイトル
// （＝ホームページと同じ文字列）が使われ、GA4の「ページタイトル」レポートで
// 404がホームと区別できなくなる。
// 「404」を含むタイトルにしておくことで、どれだけ404が踏まれているかを
// GA4でそのまま追跡できる。
export const metadata: Metadata = {
  title: "404 ページが見つかりません",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
          <p className="text-6xl md:text-7xl font-bold text-primary/30 mb-4">404</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            お探しのページが見つかりませんでした
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-10">
            URLが変更されたか、削除された可能性があります。
            お探しの情報は、以下のページから見つかるかもしれません。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-10">
            <Link
              href="/ranking"
              className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">初任給ランキング</p>
                <p className="text-sm text-muted-foreground">全掲載企業を初任給順に比較</p>
              </div>
            </Link>

            <Link
              href="/industries"
              className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">業界別分析</p>
                <p className="text-sm text-muted-foreground">業界ごとの平均初任給を比較</p>
              </div>
            </Link>

            <Link
              href="/articles"
              className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">就活記事</p>
                <p className="text-sm text-muted-foreground">給与や企業選びの解説記事</p>
              </div>
            </Link>

            <Link
              href="/simulator"
              className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <Search className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">手取り計算</p>
                <p className="text-sm text-muted-foreground">初任給から手取り額を試算</p>
              </div>
            </Link>
          </div>

          <Button asChild size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              ホームに戻る
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
