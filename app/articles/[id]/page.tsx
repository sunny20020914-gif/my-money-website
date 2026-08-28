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
import { splitIntoBlocks, withScrollableTables } from "@/lib/markdown"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FavoriteArticleButton } from "@/components/favorite-article-button"
import { SITE_URL, REVALIDATE_STABLE } from "@/lib/config"

type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export const revalidate = REVALIDATE_STABLE

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await fetchArticleById(params.id)

  if (!article) {
    // 【ソフト404対策】記事が存在しない場合は canonical を出さず noindex を明示する。
    // 以前はルートlayoutの canonical:"/" を継承し「この404はホームの複製」と
    // 宣言する形になっていたため、ソフト404と判定される一因になっていた。
    return {
      title: "記事が見つかりません",
      robots: { index: false, follow: false },
    }
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `${SITE_URL}/articles/${params.id}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      // 記事画像が無い場合は未指定にして、app/opengraph-image.tsx の
      // 自動生成画像にフォールバックさせる（/og-image.jpg は存在せず404だった）
      ...(article.image ? { images: [article.image] } : {}),
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

  /**
   * 【重要・表とリストが壊れていた原因】
   *
   * 以前はここで currentContent.replace(/\n+/g, "\n\n") としていた。
   * つまり単一の改行まですべて段落区切りに変換していた。
   *
   * Markdownの表は
   *   | 順位 | 企業名 |
   *   | --- | --- |
   *   | 1 | ○○ |
   * のように「連続した行」であることが構文の条件になっている。
   * 行の間に空行が入ると表として認識されず、ただの文字列になる。
   * 実際に検証したところ <table> が一切生成されなかった。
   * 箇条書きも各項目が別段落になり、間延びした表示になっていた。
   *
   * 企業詳細ページでは既に修正済みだったが、記事ページだけ古いままだった。
   * 標準のMarkdownの規則に戻す:
   *   ・空行（\n\n）… 段落の区切り
   *   ・単一の改行 …… 同じ段落内。表やリストの行はここで繋がる
   * \r\n はGoogle Sheets由来で混ざることがあるため \n に正規化しておく。
   */
  const formattedContent = currentContent.replace(/\r\n/g, "\n")

  // 本文中に広告を挟むため前半・後半に分割する
  // （薄いコンテンツに無理に挟まないよう、4ブロック以上の場合のみ）
  const blocks = splitIntoBlocks(formattedContent)
  const shouldSplitForInContentAd = blocks.length >= 4
  const splitIndex = Math.ceil(blocks.length / 2)
  const htmlContentTop = withScrollableTables(
    md.render(
      shouldSplitForInContentAd ? blocks.slice(0, splitIndex).join("\n\n") : formattedContent,
    ),
  )
  const htmlContentBottom = shouldSplitForInContentAd
    ? withScrollableTables(md.render(blocks.slice(splitIndex).join("\n\n")))
    : ""

  return (
    <>
      <StructuredData
        type="article"
        data={{
          title: article.title,
          description: article.excerpt,
          image: article.image,
          publishedAt: article.publishedAt,
          author: article.author,
          url: `${SITE_URL}/articles/${article.id}`,
        }}
      />
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
              dangerouslySetInnerHTML={{ __html: htmlContentTop }}
            />

            {/* 本文中（読み進めた最も読まれるタイミング）に広告を表示 */}
            {htmlContentBottom && <AdBanner />}

            {htmlContentBottom && (
              <div
                className="prose prose-sm md:prose-lg dark:prose-invert max-w-none [&_p]:text-[16px] [&_p]:leading-8 [&_li]:text-[16px] [&_li]:leading-8 md:[&_p]:text-lg md:[&_p]:leading-8 md:[&_li]:text-lg md:[&_li]:leading-8"
                dangerouslySetInnerHTML={{ __html: htmlContentBottom }}
              />
            )}

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