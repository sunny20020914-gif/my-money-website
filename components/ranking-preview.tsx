import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, Building2Icon, ArrowRightIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { fetchRankingDataServer } from "@/lib/sheets"

async function getTopCompanies() {
  try {
    const data = await fetchRankingDataServer("monthly")
    return data.slice(0, 5) // 上位5社のみ取得
  } catch (error) {
    console.error("[v0] ランキングプレビューデータの取得に失敗:", error)
    return []
  }
}

export async function RankingPreview() {
  const topCompanies = await getTopCompanies()

  if (topCompanies.length === 0) return null

  return (
    <section className="pt-8 pb-20 bg-card/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <TrendingUpIcon className="w-4 h-4 mr-2" />
            最新ランキング
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-balance mb-4">初任給・年収ランキング</h2>
          <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
            2026年度の最新データに基づく、初任給と想定年収ランキング上位企業をご紹介します。
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2Icon className="h-5 w-5 text-primary" />
                初任給・年収ランキング TOP 5
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              <div className="divide-y divide-border">
                {topCompanies.map((company: any) => (
                  <div key={company.rank} className="hover:bg-muted/30 transition-colors">
                    {/* PC (lg以上) 用のレイアウト */}
                    <div className="hidden lg:flex items-center justify-between p-8">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                          {company.rank}
                        </div>
                        {company.logo || company.domain ? (
                          <Image
                            src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                            alt={`${company.company}のロゴ`}
                            className="w-16 h-16 rounded-lg object-contain"
                            width={64}
                            height={64}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted/50" />
                        )}
                        <div>
                          <h3 className="font-semibold text-foreground text-xl mb-2">{company.company}</h3>
                          <div className="flex flex-wrap gap-1">
                            {company.industry.split('/').map((industry: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-sm">{industry}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mb-3">
                          <div className="text-sm text-muted-foreground mb-1">初任給（月額）</div>
                          <div className="text-3xl font-bold text-foreground">
                            {typeof company.baseMonthly === 'number' ? `¥${company.baseMonthly.toLocaleString()}` : company.baseMonthly || '-'}
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="text-sm text-muted-foreground mb-1">想定年収</div>
                          <div className="text-lg font-semibold text-muted-foreground">
                            {typeof company.annualSalary === 'number' ? `¥${company.annualSalary.toLocaleString()}` : company.annualSalary || '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* スマホ・タブレット (lg未満) 用のレイアウト */}
                    <div className="p-4 md:p-6 lg:hidden">
                      <div className="flex flex-col gap-4 py-2">
                        {/* 上段：企業情報 */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                            {company.rank}
                          </div>
                          {company.logo || company.domain ? (
                            <Image
                              src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                              alt={`${company.company}のロゴ`}
                              className="w-10 h-10 rounded-lg object-contain"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted/50" />
                          )}
                          <div className="ml-1">
                            <h3 className="text-base font-bold text-foreground leading-tight">{company.company}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {company.industry.split('/').map((industry: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[11px] px-1.5">{industry}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* 下段：詳細情報 */}
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-x-12 gap-y-3 items-start pl-[52px]">
                            <div>
                              <div className="text-sm text-muted-foreground">初任給（月額）</div>
                              <div className="text-2xl font-bold text-primary">
                                {typeof company.baseMonthly === 'number' ? `¥${company.baseMonthly.toLocaleString()}` : company.baseMonthly || '-'}
                              </div>
                              <div className="mt-4">
                                <div className="text-xs text-muted-foreground">想定年収</div>
                                <div className="text-xs font-semibold text-foreground">
                                  {typeof company.annualSalary === 'number' ? `¥${company.annualSalary.toLocaleString()}` : company.annualSalary || '-'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div>
                                <div className="text-xs text-muted-foreground">従業員数</div>
                                <div className="text-xs font-semibold text-foreground">
                                  {typeof company.employees === 'number' ? `${company.employees.toLocaleString()}人` : company.employees || '-'}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">設立: {company.founded}年</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0 leading-relaxed pl-[52px]">{company.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-4">
            <Button asChild size="lg" variant="outline" className="bg-transparent">
              <Link href="/ranking">
                完全なランキングを見る
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
