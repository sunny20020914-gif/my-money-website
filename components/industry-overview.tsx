import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Building2 } from "lucide-react"

const industries = [
  {
    name: "総合商社",
    averageSalary: 24800000,
    change: 4.8,
    companies: 7,
    description: "グローバルな事業展開と高い収益性が特徴。多様な事業領域でのキャリア形成が可能。",
    outlook: "positive",
    color: "bg-chart-1",
  },
  {
    name: "情報・通信業",
    averageSalary: 18500000,
    change: 8.2,
    companies: 15,
    description: "DX推進により成長が続く業界。技術革新とビジネス創造の最前線。",
    outlook: "positive",
    color: "bg-chart-2",
  },
  {
    name: "金融業",
    averageSalary: 16800000,
    change: 2.1,
    companies: 12,
    description: "安定性と専門性を重視。フィンテックなど新分野への展開も活発。",
    outlook: "stable",
    color: "bg-chart-3",
  },
  {
    name: "製造業",
    averageSalary: 15200000,
    change: 3.5,
    companies: 25,
    description: "日本経済の基盤となる業界。グローバル展開と技術革新が進む。",
    outlook: "stable",
    color: "bg-chart-4",
  },
  {
    name: "不動産業",
    averageSalary: 14600000,
    change: -1.2,
    companies: 8,
    description: "都市開発と資産運用が主軸。市場環境の影響を受けやすい。",
    outlook: "neutral",
    color: "bg-chart-5",
  },
]

export function IndustryOverview() {
  return (
    <div className="space-y-8 mb-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            業界別概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-4 lg:w-1/3">
                    <div className={`w-4 h-4 rounded-full ${industry.color}`} />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{industry.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{industry.companies}社掲載</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-1/4">
                    <div className="text-sm text-muted-foreground">平均初任給</div>
                    <div className="text-xl font-bold text-foreground">
                      ¥{(industry.averageSalary / 10000).toFixed(0)}万円
                    </div>
                    <div
                      className={`text-sm font-medium flex items-center gap-1 ${
                        industry.change > 0
                          ? "text-accent"
                          : industry.change < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {industry.change > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : industry.change < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {industry.change > 0 ? "+" : ""}
                      {industry.change}%
                    </div>
                  </div>

                  <div className="lg:w-1/4">
                    <div className="text-sm text-muted-foreground mb-1">将来性</div>
                    <Badge
                      variant={
                        industry.outlook === "positive"
                          ? "default"
                          : industry.outlook === "stable"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {industry.outlook === "positive" ? "成長" : industry.outlook === "stable" ? "安定" : "注視"}
                    </Badge>
                  </div>

                  <div className="lg:w-1/4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{industry.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
