import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Building2, Users, DollarSign } from "lucide-react"

const stats = [
  {
    title: "掲載企業数",
    value: "125",
    unit: "社",
    icon: Building2,
    change: "+12社",
    changeType: "increase" as const,
  },
  {
    title: "平均初任給",
    value: "18.2",
    unit: "百万円",
    icon: DollarSign,
    change: "+4.2%",
    changeType: "increase" as const,
  },
  {
    title: "最高初任給",
    value: "25.5",
    unit: "百万円",
    icon: TrendingUp,
    change: "+5.2%",
    changeType: "increase" as const,
  },
  {
    title: "業界数",
    value: "15",
    unit: "業界",
    icon: Users,
    change: "+2業界",
    changeType: "increase" as const,
  },
]

export function RankingStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.unit}</p>
                  </div>
                  <p
                    className={`text-xs font-medium ${
                      stat.changeType === "increase" ? "text-accent" : "text-destructive"
                    }`}
                  >
                    {stat.change}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
