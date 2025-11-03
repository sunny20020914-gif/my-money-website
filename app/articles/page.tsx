import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { AdBanner } from "@/components/ad-banner"
import { fetchArticleDataServer, type ArticleData } from "@/lib/sheets"

export const metadata = {
  title: "記事一覧",
  description: "就職活動に役立つ記事の一覧です。最新の就活情報や専門家によるアドバイスを提供します。",
}

export default async function ArticlesPage() {
  const articles: ArticleData[] = await fetchArticleDataServer()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4">記事一覧</h1>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              就活のプロが実践的なアドバイスと最新の就活情報をお届けします。
            </p>
          </div>

          <AdBanner />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Card key={article.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col bg-card">
                <Link href={`/articles/${article.id}`} className="block aspect-video overflow-hidden relative">
                  <Image
                    src={article.image || "/placeholder.svg?height=200&width=400"}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </Link>
                <CardHeader className="pb-3">
                  <Badge variant="secondary" className="text-xs mb-2 w-fit">{article.category}</Badge>
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    <Link href={`/articles/${article.id}`}>{article.title}</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-grow flex flex-col">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-grow">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                     <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.publishedAt).toLocaleDateString("ja-JP")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}分
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
