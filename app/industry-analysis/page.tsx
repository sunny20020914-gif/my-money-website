import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { fetchIndustryDataServer } from "@/lib/sheets"
import { Building2 } from "lucide-react"

export const metadata = {
  title: "業界別 初任給・年収分析",
  description:
    "日本の主要な業界ごとの平均年収、企業数、特徴を分析。あなたのキャリア選択に役立つデータを提供します。",
}

export default async function IndustryAnalysisPage() {
  const industryData = await fetchIndustryDataServer()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4">
              業界別 初任給・年収分析
            </h1>
            <p className="text-lg text-muted-foreground text-balance max-w-3xl">
              各業界の平均年収や特徴を比較し、あなたのキャリアパスの参考にしてください。
            </p>
          </div>

          {industryData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {industryData.map((industry) => (
                <Card
                  key={industry.industry}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-xl">{industry.industry}</CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {industry.companyCount}社
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">平均想定年収</p>
                      <p className="text-3xl font-bold text-primary">
                        ¥{industry.averageAnnualSalary.toLocaleString()}
                      </p>
                    </div>
                    <CardDescription>{industry.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  業界データが見つかりません
                </h3>
                <p className="text-muted-foreground">現在、表示できる業界データがありません。</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
