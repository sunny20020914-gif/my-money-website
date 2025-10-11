import { fetchArticleDataServer } from "@/lib/sheets"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User } from "lucide-react"
import { marked } from "marked"

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  const articles = await fetchArticleDataServer()
  const article = articles.find((p) => p.id === params.id)

  if (!article) {
    return {
      title: "記事が見つかりません",
    }
  }

  return {
    title: `${article.title} | 初任給ランキング 2025`,
    description: article.excerpt,
  }
}

export default async function ArticlePage({ params }: Props) {
  const articles = await fetchArticleDataServer()
  const article = articles.find((p) => p.id === params.id)

  if (!article) {
    notFound()
  }

  const contentHtml = await marked(article.content)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <article className="prose prose-invert mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <Badge variant="secondary" className="mb-4">
                {article.category}
              </Badge>
              <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
              <div className="flex items-center justify-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString("ja-JP")}
                  </time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{article.readTime}分</span>
                </div>
              </div>
            </div>

            {article.image && (
              <img
                src={article.image}
                alt={article.title}
                className="w-full rounded-lg mb-8"
              />
            )}

            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}