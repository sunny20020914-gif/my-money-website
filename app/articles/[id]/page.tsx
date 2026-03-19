import { fetchArticleDataServer, fetchArticleById } from "@/lib/sheets"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Metadata } from "next"
import { StructuredData } from "@/components/structured-data"
import Image from "next/image"
import { AdBanner } from "@/components/ad-banner"
import { Remarkable } from "remarkable"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FavoriteArticleButton } from "@/components/favorite-article-button"

type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await fetchArticleById(params.id)

  if (!article) {
    return {
      title: "記事が見つかりません",
    }
  }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.image || "/og-image.jpg"],
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author],
    },
  }
}

// ビルド時に全記事ページを静的に生成
export async function generateStaticParams() {
  const articles = await fetchArticleDataServer()
  return articles.map((article) => ({
    id: article.id,
  }))
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const article = await fetchArticleById(params.id)

  if (!article) {
    notFound()
  }

  // ページ分割処理
  // スプレッドシート内で [[NEXT_PAGE]] と書かれた場所でページを分割します
  const SPLIT_MARKER = "[[NEXT_PAGE]]"
  const contentPages = article.content.split(SPLIT_MARKER)

  // 現在のページ番号を取得（デフォルトは1ページ目）
  const pageParam = searchParams.page
  const currentPage = typeof pageParam === 'string' ? parseInt(pageParam, 10) : 1

  // 有効なページ番号であることを確認
  const safePage = Math.max(1, Math.min(currentPage, contentPages.length))
  const totalPages = contentPages.length

  // 表示するコンテンツを取得
  const currentContent = contentPages[safePage - 1] || ""

  const md = new Remarkable({
    html: true, // HTMLタグを有効にして、文字色やサイズ指定を反映させる
  })
  // スプレッドシートからの改行をMarkdownの段落として正しく解釈させるための処理
  // 1つ以上の連続した改行を2つの改行に置き換える
  const formattedContent = currentContent.replace(/\n+/g, "\n\n")
  const htmlContent = md.render(formattedContent)

  return (
    <>
      <StructuredData type="article" data={article} />
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="py-12 flex-grow">
          <article className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <header className="mb-12 text-center">
              <Badge variant="secondary" className="mb-4">
                {article.category}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4">{article.title}</h1>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(article.publishedAt).toLocaleDateString("ja-JP")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{article.readTime}分で読めます</span>
                </div>
              </div>
              <div className="flex justify-center">
                <FavoriteArticleButton articleId={article.id} />
              </div>
            </header>

            {article.image && (
              <div className="relative w-full aspect-video my-8 overflow-hidden rounded-lg shadow-lg">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              </div>
            )}

            {/* 1ページ目の場合のみ、記事上部に広告を表示 */}
            {safePage === 1 && <AdBanner />}

            <div
              className="prose prose-sm md:prose-lg dark:prose-invert max-w-none [&_p]:text-[16px] [&_p]:leading-8 [&_li]:text-[16px] [&_li]:leading-8 md:[&_p]:text-lg md:[&_p]:leading-8 md:[&_li]:text-lg md:[&_li]:leading-8"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* 記事本文の下に広告を表示 */}
            <AdBanner />

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 my-12">
                <Button variant="outline" disabled={safePage <= 1} asChild={safePage > 1}>
                  {safePage > 1 ? (
                    <Link href={`/articles/${article.id}?page=${safePage - 1}`}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> 前のページ
                    </Link>
                  ) : (
                    <span><ChevronLeft className="mr-2 h-4 w-4" /> 前のページ</span>
                  )}
                </Button>

                <span className="text-sm font-medium mx-2">
                  {safePage} / {totalPages}
                </span>

                <Button variant="default" disabled={safePage >= totalPages} asChild={safePage < totalPages}>
                  {safePage < totalPages ? (
                    <Link href={`/articles/${article.id}?page=${safePage + 1}`}>
                      次のページ <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  ) : (
                    <span>次のページ <ChevronRight className="ml-2 h-4 w-4" /></span>
                  )}
                </Button>
              </div>
            )}

            {/* 記事一覧に戻るボタン（一番下） */}
            <div className="mt-12 mb-8 text-center">
              <Button asChild variant="outline" size="lg">
                <Link href="/articles">
                  <ChevronLeft className="mr-2 h-4 w-4" /> 記事一覧に戻る
                </Link>
              </Button>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </>
  )
}