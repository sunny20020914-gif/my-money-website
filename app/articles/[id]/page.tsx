import { fetchArticleDataServer } from "@/lib/sheets"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import { Metadata } from "next"
import { StructuredData } from "@/components/structured-data"
import { AdBanner } from "@/components/ad-banner"
import { Remarkable } from "remarkable"

type Props = {
  params: { id: string }
}

// IDで記事を取得するヘルパー関数
async function fetchArticleById(id: string) {
  const articles = await fetchArticleDataServer()
  return articles.find((article) => article.id === id)
}

// 各記事のメタデータを動的に生成
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

export default async function ArticlePage({ params }: Props) {
  const article = await fetchArticleById(params.id)

  if (!article) {
    notFound()
  }

  const md = new Remarkable()
  // スプレッドシートからの改行をMarkdownの段落として正しく解釈させるための処理
  // 1つ以上の連続した改行を2つの改行に置き換える
  const formattedContent = article.content.replace(/\n+/g, "\n\n")
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
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(article.publishedAt).toLocaleDateString("ja-JP")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{article.readTime}分で読めます</span>
                </div>
              </div>
            </header>

            {article.image && (
              <figure className="mb-12">
                <img src={article.image} alt={article.title} className="w-full h-auto rounded-lg shadow-lg" />
              </figure>
            )}

            <AdBanner />

            <div
              className="prose dark:prose-invert max-w-none mx-auto mt-12 prose-2xl prose-p:leading-loose prose-p:my-10 prose-h2:text-3xl prose-h3:text-2xl prose-a:text-primary hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </article>
        </main>
        <Footer />
      </div>
    </>
  )
}