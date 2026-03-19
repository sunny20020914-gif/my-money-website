"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Building2, BookOpen, ArrowRight } from "lucide-react"
import { useFavorites } from "@/hooks/use-favorites"
import type { CompanyData, ArticleData } from "@/lib/sheets"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function SavedClient({
  initialCompanies,
  initialArticles,
}: {
  initialCompanies: CompanyData[]
  initialArticles: ArticleData[]
}) {
  const { favorites } = useFavorites()
  const [mounted, setMounted] = useState(false)

  // ハイドレーションエラー防止のため、マウント後にレンダリング
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null 
  }

  // ローカルストレージのIDと全データを照合して、保存されたデータのみを抽出
  const savedCompanies = initialCompanies.filter(c => c.id && favorites.companies.includes(c.id))
  const savedArticles = initialArticles.filter(a => a.id && favorites.articles.includes(a.id))

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-balance mb-4 text-primary flex items-center justify-center gap-2">
          <Bookmark className="h-6 w-6" />
          お気に入り一覧
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          保存した企業や記事をいつでも確認できます。
        </p>
      </div>

      <Tabs defaultValue="companies" className="space-y-8">
        <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            企業 ({savedCompanies.length})
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            記事 ({savedArticles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          {savedCompanies.length > 0 ? (
             <div className="grid gap-4">
               {savedCompanies.map(company => (
                 <Card key={company.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-6">
                      <Image
                        src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                        alt={`${company.company}のロゴ`}
                        className="w-16 h-16 rounded-lg object-contain bg-muted/50 shrink-0"
                        width={64}
                        height={64}
                      />
                      <div className="flex-grow text-center sm:text-left w-full">
                        <h3 className="text-xl font-bold text-foreground mb-1">{company.company}</h3>
                        <Badge variant="secondary" className="text-xs">{company.industry}</Badge>
                      </div>
                      <div className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/companies/${company.id}`}>詳細を見る<ArrowRight className="w-3 h-3 ml-2"/></Link>
                        </Button>
                      </div>
                    </CardContent>
                 </Card>
               ))}
             </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border rounded-lg border-dashed">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>保存された企業はありません。</p>
              <Button asChild variant="link" className="mt-2 text-primary">
                 <Link href="/ranking">ランキングから企業を探す</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="articles">
          {savedArticles.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {savedArticles.map(article => (
                 <Card key={article.id} className="flex flex-col hover:shadow-md transition-shadow">
                    {article.image && (
                      <div className="relative w-full h-48 sm:h-56">
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover rounded-t-lg"
                        />
                      </div>
                    )}
                    <CardContent className="p-5 flex flex-col flex-grow">
                      <div className="mb-3">
                        <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{article.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">{article.excerpt}</p>
                      <Button asChild variant="outline" className="w-full mt-auto">
                        <Link href={`/articles/${article.id}`}>記事を読む<ArrowRight className="w-3 h-3 ml-2"/></Link>
                      </Button>
                    </CardContent>
                 </Card>
               ))}
             </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border rounded-lg border-dashed">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>保存された記事はありません。</p>
              <Button asChild variant="link" className="mt-2 text-primary">
                 <Link href="/articles">就活記事を探す</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
