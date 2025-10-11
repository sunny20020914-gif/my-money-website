import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import Link from "next/link"

const relatedArticles = [
  {
    id: 2,
    title: "初任給だけじゃない！企業選びの重要ポイント",
    category: "企業研究",
    publishedAt: "2024-12-10",
    readTime: "6分",
    image: "/article-company-selection.jpg",
  },
  {
    id: 3,
    title: "面接で差がつく！志望動機の作り方",
    category: "面接対策",
    publishedAt: "2024-12-08",
    readTime: "10分",
    image: "/article-motivation-letter.jpg",
  },
]

interface RelatedArticlesProps {
  currentArticleId: number
}

export function RelatedArticles({ currentArticleId }: RelatedArticlesProps) {
  const filtered = relatedArticles.filter((article) => article.id !== currentArticleId)

  return (
    <section className="mt-16 pt-8 border-t border-border">
      <h2 className="text-2xl font-bold text-foreground mb-6">関連記事</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.slice(0, 2).map((article) => (
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
                    {article.readTime}
                  </div>
                </div>
              </div>
              <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                <Link href={`/articles/${article.id}`}>{article.title}</Link>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
