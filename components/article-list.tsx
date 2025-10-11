"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowRight, Eye } from "lucide-react"
import Link from "next/link"

const articles = [
  {
    id: 1,
    title: "2025年就活スケジュール完全ガイド",
    excerpt:
      "2025年卒の就活スケジュールを詳しく解説。エントリー開始から内定まで、重要な時期を見逃さないためのポイントをまとめました。",
    category: "就活準備",
    publishedAt: "2024-12-15",
    readTime: "8分",
    views: 1250,
    image: "/article-job-hunting-schedule.jpg",
    author: "就活アドバイザー 田中",
    featured: true,
  },
  {
    id: 2,
    title: "初任給だけじゃない！企業選びの重要ポイント",
    excerpt:
      "初任給の高さだけで企業を選ぶのは危険？長期的なキャリア形成を考えた企業選びのポイントを専門家が解説します。",
    category: "企業研究",
    publishedAt: "2024-12-10",
    readTime: "6分",
    views: 980,
    image: "/article-company-selection.jpg",
    author: "キャリアコンサルタント 佐藤",
    featured: true,
  },
  {
    id: 3,
    title: "面接で差がつく！志望動機の作り方",
    excerpt:
      "採用担当者の心に響く志望動機の作り方を実例とともに紹介。ありきたりな内容から脱却して、印象に残る志望動機を作成しましょう。",
    category: "面接対策",
    publishedAt: "2024-12-08",
    readTime: "10分",
    views: 1580,
    image: "/article-motivation-letter.jpg",
    author: "人事コンサルタント 山田",
    featured: false,
  },
  {
    id: 4,
    title: "エントリーシート（ES）で差をつける書き方のコツ",
    excerpt:
      "通過率を上げるESの書き方を徹底解説。採用担当者が注目するポイントと、印象に残る文章の作り方をお教えします。",
    category: "ES対策",
    publishedAt: "2024-12-05",
    readTime: "12分",
    views: 2100,
    image: "/article-entry-sheet.jpg",
    author: "就活コーチ 鈴木",
    featured: false,
  },
  {
    id: 5,
    title: "業界研究の進め方｜効率的な情報収集方法",
    excerpt:
      "業界研究を効率的に進めるための具体的な方法を紹介。情報収集のコツから分析方法まで、実践的なアドバイスをお届けします。",
    category: "企業研究",
    publishedAt: "2024-12-03",
    readTime: "9分",
    views: 750,
    image: "/article-industry-research.jpg",
    author: "業界アナリスト 高橋",
    featured: false,
  },
  {
    id: 6,
    title: "グループディスカッション攻略法",
    excerpt:
      "GDで評価されるポイントと実践的な対策方法を解説。チームワークを活かしながら個性をアピールする方法をお教えします。",
    category: "面接対策",
    publishedAt: "2024-11-28",
    readTime: "7分",
    views: 890,
    image: "/article-group-discussion.jpg",
    author: "面接対策専門家 渡辺",
    featured: false,
  },
]

export function ArticleList() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const articlesPerPage = 6

  const filteredArticles = articles.filter(
    (article) => selectedCategory === "all" || article.category === selectedCategory,
  )

  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage)
  const startIndex = (currentPage - 1) * articlesPerPage
  const currentArticles = filteredArticles.slice(startIndex, startIndex + articlesPerPage)

  return (
    <div className="space-y-6">
      {/* Featured Articles */}
      {selectedCategory === "all" && currentPage === 1 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">注目記事</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles
              .filter((article) => article.featured)
              .slice(0, 2)
              .map((article) => (
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
                          <Eye className="h-3 w-3" />
                          {article.views.toLocaleString()}
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {article.readTime}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* All Articles */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">
          {selectedCategory === "all" ? "すべての記事" : `${selectedCategory}の記事`}
        </h2>
        <div className="space-y-6">
          {currentArticles.map((article) => (
            <Card key={article.id} className="group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-48 flex-shrink-0">
                    <div className="aspect-video overflow-hidden rounded-lg">
                      <img
                        src={article.image || "/placeholder.svg?height=120&width=200"}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {article.category}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(article.publishedAt).toLocaleDateString("ja-JP")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.views.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      <Link href={`/articles/${article.id}`}>{article.title}</Link>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{article.author}</span>
                      <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
                        <Link href={`/articles/${article.id}`}>
                          続きを読む
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              前へ
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              次へ
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
