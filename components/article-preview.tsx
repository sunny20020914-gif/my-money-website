import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"
import { fetchArticleDataServer } from "@/lib/sheets"

export async function ArticlePreview() {
  const allArticles = await fetchArticleDataServer()
  const featuredArticles = allArticles.slice(0, 3) // 最新3件を取得

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4 mr-2" />
            就活情報
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4">就活に役立つ記事</h2>
          <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
            就活のプロが教える実践的なアドバイスと最新の就活情報をお届けします。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredArticles.map((article) => (
            <Card key={article.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="aspect-video overflow-hidden">
                <img
                  src={article.image || "/placeholder.svg?height=200&width=400"}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {article.category}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground gap-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.publishedAt).toLocaleDateString("ja-JP")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}分
                    </div>
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  <Link href={`/articles/${article.id}`}>{article.title}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{article.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{article.author}</span>
                  <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
                    <Link href={`/articles/${article.id}`}>
                      続きを読む
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg" variant="outline" className="bg-transparent">
            <Link href="/articles">
              すべての記事を見る
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
