"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2Icon,
  SearchIcon,
  ExternalLinkIcon,
} from "lucide-react"
import type { CompanyData } from "@/lib/sheets"

interface RankingClientProps {
  initialCompanies: CompanyData[]
}

export function RankingClient({ initialCompanies }: RankingClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("all")

  const industries = useMemo(() => {
    return Array.from(new Set(initialCompanies.map((c) => c.industry)))
  }, [initialCompanies])

  const filteredCompanies = useMemo(() => {
    return initialCompanies.filter((company) => {
      const matchesSearch =
        company.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesIndustry = selectedIndustry === "all" || company.industry === selectedIndustry
      return matchesSearch && matchesIndustry
    })
  }, [initialCompanies, searchTerm, selectedIndustry])

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <SearchIcon className="h-5 w-5" />
              検索・フィルター
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="企業名または業界で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
            >
              <option value="all">すべての業界</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid gap-4">
        {filteredCompanies.map((company) => (
          <Card key={company.rank} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {company.rank}
                  </div>
                  <img
                    src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
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

                <div className="flex-shrink-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 md:text-right">
                    <div>
                      <div className="mb-2 md:mb-3">
                        <div className="text-sm text-muted-foreground">想定年収</div>
                        <div className="text-2xl font-bold text-foreground">
                          ¥{company.annualSalary.toLocaleString()}
                        </div>
                      </div>
                      <div className="mb-2 md:mb-0">
                        <div className="text-sm text-muted-foreground">初任給（月額）</div>
                        <div className="text-lg font-semibold text-muted-foreground">
                          ¥{company.baseMonthly.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">従業員数</div>
                      <div className="text-lg font-semibold text-foreground">
                        {company.employees.toLocaleString()}人
                      </div>
                      <div className="text-sm text-muted-foreground">設立: {company.founded}年</div>
                    </div>
                    {company.url && (
                      <div className="flex items-center">
                        <Button asChild variant="outline" size="sm" className="w-full md:w-auto md:ml-auto bg-transparent">
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
              <p className="text-sm text-muted-foreground mt-6 leading-relaxed">{company.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">検索結果が見つかりません</h3>
            <p className="text-muted-foreground">検索条件を変更して再度お試しください。</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}