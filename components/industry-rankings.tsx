import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, ExternalLink } from "lucide-react"
import Link from "next/link"

const industryRankings = [
  {
    industry: "総合商社",
    topCompanies: [
      { name: "三菱商事", salary: 25500000, rank: 1 },
      { name: "三井物産", salary: 25000000, rank: 2 },
      { name: "伊藤忠商事", salary: 24800000, rank: 3 },
    ],
  },
  {
    industry: "情報・通信業",
    topCompanies: [
      { name: "ソフトバンクグループ", salary: 22800000, rank: 9 },
      { name: "NTTドコモ", salary: 19500000, rank: 15 },
      { name: "KDDI", salary: 18800000, rank: 18 },
    ],
  },
  {
    industry: "製造業",
    topCompanies: [
      { name: "キーエンス", salary: 23000000, rank: 8 },
      { name: "ファナック", salary: 22500000, rank: 10 },
      { name: "トヨタ自動車", salary: 20200000, rank: 12 },
    ],
  },
]

export function IndustryRankings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">業界別トップ企業</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {industryRankings.map((industryData) => (
          <Card key={industryData.industry} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-4 w-4 text-primary" />
                {industryData.industry}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {industryData.topCompanies.map((company, index) => (
                  <div key={company.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{company.name}</div>
                        <div className="text-xs text-muted-foreground">全体 {company.rank}位</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground text-sm">
                        ¥{(company.salary / 10000).toFixed(0)}万
                      </div>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                  <Link href={`/ranking?industry=${encodeURIComponent(industryData.industry)}`}>
                    {industryData.industry}の全企業を見る
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
