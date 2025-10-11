"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building2Icon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from "@/components/icons"
import { useRankingData } from "@/hooks/use-sheets-data"
import type { CompanyData, RankingType } from "@/lib/sheets"
import { RankingFilters } from "./ranking-filters"

export function RankingTable() {
  const [rankingType, setRankingType] = useState<RankingType>("annual")
  const { data: companies, loading, error, refreshData } = useRankingData(rankingType)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");

  const { filteredCompanies, industries } = useMemo(() => {
    const filtered = companies.filter((company) => {
      const matchesSearch =
        company.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesIndustry = selectedIndustry === "all" || company.industry === selectedIndustry
      return matchesSearch && matchesIndustry
    })
    const uniqueIndustries = Array.from(new Set(companies.map((c) => c.industry)))
    return { filteredCompanies: filtered, industries: uniqueIndustries }
  }, [companies, searchTerm, selectedIndustry])

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">データを読み込み中...</p>
          </CardContent>
        </Card>
      )
    }
  
    if (error) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">データの取得に失敗しました</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => refreshData()} variant="outline">
              <RefreshCwIcon className="mr-2 h-4 w-4" /> 
              再試行
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
    <>
      <div className="grid gap-4">
        {filteredCompanies.map((company) => (
          <Card key={company.rank} className="hover:shadow-lg transition-shadow">
            <div className="hover:bg-muted/30 transition-colors">
              {/* PC (lg以上) 用のレイアウト */}
              <div className="hidden lg:block">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-4 lg:w-1/3">
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                        {company.rank}
                      </div>
                      <img
                        src={company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg"}
                        alt={`${company.company}のロゴ`}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{company.company}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {company.industry}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 items-start">
                        <div className="col-span-2 md:col-span-1">
                          <div className="mb-4">
                            <div className="text-sm text-muted-foreground">想定年収</div>
                            <div className="text-2xl font-bold text-foreground">
                              ¥{company.annualSalary.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">初任給（月額）</div>
                            <div className="text-lg font-semibold text-muted-foreground">
                              ¥{company.baseMonthly.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-4">
                            <div className="text-sm text-muted-foreground">従業員数</div>
                            <div className="text-lg font-semibold text-foreground">
                              {company.employees.toLocaleString()}人
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">設立: {company.founded}年</div>
                        </div>
                        {company.url && (
                          <div className="flex items-start md:items-center md:justify-end">
                            <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
                              <Link href={company.url} target="_blank" rel="noopener noreferrer">
                                詳しく見る
                                <ExternalLinkIcon className="ml-2 h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 leading-relaxed lg:pl-24">{company.description}</p>
                </CardContent>
              </div>

              {/* スマホ・タブレット (lg未満) 用のレイアウト */}
              <CardContent className="p-4 md:p-6 lg:hidden">
                <div className="flex flex-row gap-4">
                  <div className="flex flex-col items-center gap-1.5 w-12 flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {company.rank}
                    </div>
                    <img
                      src={company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg"}
                      alt={`${company.company}のロゴ`}
                      className="w-8 h-8 rounded-md object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-2">
                      <h3 className="text-lg font-bold text-foreground leading-tight">{company.company}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {company.industry}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 items-start">
                      <div>
                        <div className="mb-2 md:mb-4">
                          <div className="text-sm text-muted-foreground">想定年収</div>
                          <div className="text-xl font-bold text-foreground">
                            ¥{company.annualSalary.toLocaleString()}
                          </div>
                        </div>
                        <div className="mb-2 md:mb-4">
                          <div className="text-sm text-muted-foreground">初任給（月額）</div>
                          <div className="text-base font-semibold text-muted-foreground">
                            ¥{company.baseMonthly.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 md:mb-4">
                          <div className="text-sm text-muted-foreground">従業員数</div>
                          <div className="text-base font-semibold text-foreground">
                            {company.employees.toLocaleString()}人
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">設立: {company.founded}年</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p>
                  {company.url && (
                    <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                      <Link href={company.url} target="_blank" rel="noopener noreferrer">
                        詳しく見る
                        <ExternalLinkIcon className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">検索結果が見つかりません</h3>
            <p className="text-muted-foreground">検索条件を変更して再度お試しください。</p>
          </CardContent>
        </Card>
      )}
    </>
    )
  }

  return (
    <div className="space-y-6">
      <RankingFilters
        rankingType={rankingType}
        setRankingType={setRankingType}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        onRefresh={() => refreshData()}
      />
      {renderContent()}
    </div>
  )
}
