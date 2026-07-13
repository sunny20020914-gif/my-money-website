import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, BarChart3, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { AdBanner } from "@/components/ad-banner"
import { fetchArticleDataServer, type ArticleData } from "@/lib/sheets"
import { LIST_DEFINITIONS } from "@/lib/list-definitions"

export const metadata = {
  title: "就活コラム・記事一覧 | 初任給ランキング 2026",
  description: "初任給・年収・企業選びに役立つ就活コラムを掲載。業界研究・面接対策・給与交渉まで、就職活動を成功に導く最新情報をお届けします。",
  alternates: {
    canonical: "https://www.mymoneyweb.com/articles",
  },
}

export default async function ArticlesPage() {
  const articles: ArticleData[] = await fetchArticleDataServer()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4 text-primary">記事一覧</h1>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              就活のプロが実践的なアドバイスと最新の就活情報をお届けします。
            </p>
          </div>

          <AdBanner />

          {/* --- データ特集（条件別一覧ページへの導線・スプシ更新で自動的に最新化） --- */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold">データで見る特集</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              最新の給与データから条件別に企業をまとめました。データは自動で更新されます。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {LIST_DEFINITIONS.map((def) => (
                <Link
                  key={def.slug}
                  href={`/lists/${def.slug}`}
                  className="group flex items-center justify-between gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all"
                >
                  <span className="font-semibold text-sm leading-snug">{def.shortName}の企業一覧</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>

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
