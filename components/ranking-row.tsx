"use client"

import { Badge } from "@/components/ui/badge"
import { CompanyData } from "@/lib/sheets"

interface RankingRowProps {
  company: CompanyData
}

export function RankingRow({ company }: RankingRowProps) {
  const content = (
    <div className="p-4 md:p-6 lg:hidden">
      {/* PC (lg以上) 用のレイアウト */}
      <div className="hidden lg:flex items-center justify-between p-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
            {company.rank}
          </div>
          {company.logo || company.domain ? (
            <img
              src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
              alt={`${company.company}のロゴ`}
              className="w-16 h-16 rounded-lg object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted/50" />
          )}
          <div>
            <h3 className="font-semibold text-foreground text-xl mb-2">{company.company}</h3>
            <Badge variant="outline" className="text-sm">
              {company.industry}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-3">
            <div className="text-sm text-muted-foreground mb-1">想定年収</div>
            <div className="text-3xl font-bold text-foreground">
              ¥{company.annualSalary.toLocaleString()}
            </div>
          </div>
          <div className="mb-2">
            <div className="text-sm text-muted-foreground mb-1">初任給（月額）</div>
            <div className="text-lg font-semibold text-muted-foreground">
              ¥{company.baseMonthly.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* スマホ・タブレット (lg未満) 用のレイアウト */}
        <div className="flex flex-col gap-4 py-2">
          {/* 上段：企業情報 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
              {company.rank}
            </div>
            {company.logo || company.domain ? (
              <img
                src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                alt={`${company.company}のロゴ`}
                className="w-10 h-10 rounded-lg object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted/50" />
            )}
            <div className="ml-1">
              <h3 className="text-base font-bold text-foreground leading-tight">{company.company}</h3>
              <Badge variant="secondary" className="mt-1 text-[9px] px-1.5">
                {company.industry}
              </Badge>
            </div>
          </div>
          {/* 下段：詳細情報 */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 items-start pl-[52px]">
              {/* ... (ここは変更なし) ... */}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed pl-[52px]">{company.description}</p>
    </div>
  )

  if (company.url) {
    return (
      <a href={company.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted/30 transition-colors">{content}</a>
    )
  }
  return <div className="block">{content}</div>
}