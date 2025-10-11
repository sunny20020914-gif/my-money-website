"use client"

import { useState, useMemo, CSSProperties } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { useRankingData } from "@/hooks/use-sheets-data"
import type { CompanyData } from "@/lib/sheets"

type RankingType = "annual" | "monthly" | "base"

const rankingTypes: { id: RankingType; label: string; description: string }[] = [
  {
    id: "annual",
    label: "想定年収",
    description:
      "企業の公開情報や口コミサイトのデータを基に算出した、新卒入社時の想定年収ランキングです。賞与や残業代を含んだ理論値であり、実際の支給額とは異なる場合があります。",
  },
  {
    id: "monthly",
    label: "月額額面",
    description: "月々の給与額面（税金や社会保険料が引かれる前）に基づいたランキングです。住宅手当などの固定手当を含んでいる場合があります。",
  },
  { id: "base", label: "基本給", description: "各種手当を含まない、基本給の高さに基づいたランキングです。企業の安定性や給与体系の基礎を知る上での参考になります。" },
]

export default function RankingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRanking, setSelectedRanking] = useState<RankingType>("annual")
  const { data: companies, loading, error, refreshData } = useRankingData(selectedRanking)

  const sortedAndFilteredCompanies = useMemo(() => {
    // APIから取得したrankプロパティでソート
    return [...companies]
      .sort((a, b) => a.rank - b.rank)
      .filter(
        (company) =>
          company.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company.industry.toLowerCase().includes(searchTerm.toLowerCase())
      )
  }, [companies, searchTerm])

  const renderValue = (company: CompanyData) => {
    switch (selectedRanking) {
      case "annual":
        return `¥${company.annualSalary.toLocaleString()}`
      case "monthly":
        return `¥${company.baseMonthly.toLocaleString()}`
      case "base":
        return `¥${company.baseMonthly.toLocaleString()}`
    }
  }

  const renderUnit = () => {
    switch (selectedRanking) {
      case "annual":
        return "年"
      case "monthly":
      case "base":
        return "月"
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">データの取得に失敗しました</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => refreshData()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  再試行
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 max-w-3xl mx-auto text-center md:mx-0 md:text-left">
              <h1 className="text-2xl md:text-4xl font-bold text-balance mb-4">
                初任給・年収ランキング
              </h1>
              <p className="text-base md:text-lg text-muted-foreground text-balance max-w-3xl">
                日本の主要企業の初任給と想定年収を詳細に比較できます。ランキングの種類を切り替えたり、企業名や業界で検索して、あなたの興味のある企業を見つけてください。
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  ランキングの種類・検索
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {rankingTypes.map((type) => (
                      <Button
                        key={type.id}
                        variant={selectedRanking === type.id ? "default" : "outline"}
                        onClick={() => setSelectedRanking(type.id)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg transition-all duration-300">
                    <p className="text-sm text-muted-foreground">
                      {rankingTypes.find((type) => type.id === selectedRanking)?.description}
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="企業名または業界で検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">データを読み込み中...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // 説明文の水平位置を 0 (左端) から 100 (右端) の間の数値で指定します
                  const descriptionPosition = 82
                  return sortedAndFilteredCompanies.map((company, index) => (
                  <Card key={`${selectedRanking}-${company.company}-${index}`} className="hover:shadow-lg transition-shadow">
                    {/* PC (lg以上) 用のレイアウト */}
                    <div className="hidden lg:block">
                      <CardContent className="p-6 flex flex-col">
                        {/* --- 上段エリア --- */}
                        <div className="flex flex-grow flex-col md:flex-row md:items-center md:justify-between gap-4">
                          {/* 左側: 企業情報 */}
                          <div className="flex items-center gap-6">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl shrink-0">
                              {company.rank || index + 1}
                            </div>
                            <img
                              src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                              alt={`${company.company}のロゴ`}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div>
                              <h3 className="text-xl font-bold text-foreground">{company.company}</h3>
                              <Badge variant="secondary" className="mt-2 text-sm">{company.industry}</Badge>
                            </div>
                          </div>
                          {/* 右側: 給与・従業員数・ボタン */}
                          <div className="flex-shrink-0 flex flex-wrap justify-start md:justify-end items-center gap-x-6 gap-y-4">
                            <div className="text-left md:text-right">
                              <p className="text-sm text-muted-foreground">{rankingTypes.find((r) => r.id === selectedRanking)?.label}</p>
                              <p className="text-3xl font-bold text-primary">{renderValue(company)}<span className="ml-1 text-base font-normal text-muted-foreground">/{renderUnit()}</span></p>
                            </div>
                            <div className="text-left md:text-right">
                              <p className="text-sm text-muted-foreground">従業員数</p>
                              <p className="text-xl font-semibold text-foreground">{company.employees.toLocaleString()}人</p>
                              <p className="text-sm text-muted-foreground">設立: {company.founded}年</p>
                            </div>
                            <div className="w-28 flex items-center justify-start md:justify-end">
                              {company.url && (
                                <Button asChild variant="outline" size="sm" className="bg-transparent w-full">
                                  <a href={company.url} target="_blank" rel="noopener noreferrer">
                                    詳しく見る<ExternalLink className="ml-2 h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* --- 下段エリア --- */}
                        <div className="min-h-[0.8rem] relative mt-4 w-full">
                          {company.description && (
                            <p
                              className="text-sm text-muted-foreground leading-relaxed max-w-xl absolute"
                              style={{
                                left: `${descriptionPosition}%`,
                                transform: `translateX(-${descriptionPosition}%)`,
                                textAlign: descriptionPosition < 5 ? 'left' : descriptionPosition > 95 ? 'right' : 'center',
                              } as CSSProperties
                              }
                            >{company.description}</p>
                          )}
                        </div>
                      </CardContent>
                    </div>

                    {/* スマホ・タブレット (lg未満) 用のレイアウト */}
                    <div className="p-4 md:p-6 lg:hidden" onClick={() => company.url && window.open(company.url, '_blank')}>
                      <div className="flex flex-col gap-4 py-2">
                        {/* 上段：企業情報 */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                            {company.rank || index + 1}
                          </div>
                          <img src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")} alt={`${company.company}のロゴ`} className="w-10 h-10 rounded-lg object-cover" />
                          <div className="ml-1 text-left">
                            <h3 className="text-base font-bold text-foreground leading-tight">{company.company}</h3>
                            <Badge variant="secondary" className="mt-1 text-[9px] px-1.5">{company.industry}</Badge>
                          </div>
                        </div>
                        {/* 下段：詳細情報 */}
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 items-start pl-[52px]">
                            <div>
                              <div className="text-sm text-muted-foreground">{rankingTypes.find((r) => r.id === selectedRanking)?.label}</div>
                              <div className="text-2xl font-bold text-primary">{renderValue(company)}</div>
                            </div>
                            <div>
                              <div>
                                <div className="text-xs text-muted-foreground">従業員数</div>
                                <div className="text-sm font-semibold text-foreground">{company.employees.toLocaleString()}<span className="text-sm">人</span></div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-3">設立: {company.founded}年</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {company.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed pl-[52px]">{company.description}</p>}
                      {company.url && (
                        <div className="mt-4">
                            <Button asChild variant="outline" size="sm" className="w-full bg-transparent" onClick={(e) => e.stopPropagation()}>
                              <a href={company.url} target="_blank" rel="noopener noreferrer">
                                詳しく見る<ExternalLink className="ml-2 h-3 w-3" />
                              </a>
                            </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
                })()}
              </div>
            )}

            {sortedAndFilteredCompanies.length === 0 && !loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">検索結果が見つかりません</h3>
                  <p className="text-muted-foreground">検索条件を変更して再度お試しください。</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
