import { FISCAL_YEAR } from "@/lib/config"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Star } from "lucide-react"
import Image from "next/image"
import { fetchFeaturedCompaniesDataServer } from "@/lib/sheets"
import { AdBanner } from "@/components/ad-banner"

export const metadata = {
  title: `注目の非公開企業ランキング | 初任給ランキング ${FISCAL_YEAR}`,
  description:
    "公式な初任給データは非公開ではあるものの、業界水準や企業規模から高額な給与が期待される注目企業の一覧です。",
  // canonicalは必ず自ページを指す。未指定だとルートlayoutの値を継承してしまう
  alternates: { canonical: "https://www.mymoneyweb.com/featured" },
}

export default async function FeaturedPage() {
  const featuredCompanies = await fetchFeaturedCompaniesDataServer()
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-4">
              <Star className="w-4 h-4 mr-2" />
              注目企業
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4 text-primary">
              初任給非公開の注目企業
            </h1>
            <p className="text-lg text-muted-foreground text-balance max-w-3xl mx-auto">
              公式な初任給データは非公開であるものの、高額な給与が期待される企業をご紹介します。金額は独自に推定を行なっているため実態とは異なる場合があります。
            </p>
          </div>

          <AdBanner />

          {featuredCompanies.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">現在、注目の企業データはありません。</p>
              <p className="text-sm text-muted-foreground mt-2">Googleスプレッドシートの「注目企業」シートにデータを追加してください。</p>
            </div>
          ) : (
          <div className="grid gap-6 md:grid-cols-2 max-w-6xl mx-auto">
            {featuredCompanies.map((company, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Image
                        src={company.logoUrl || (company.domainUrl ? `https://logo.clearbit.com/${company.domainUrl}` : "/placeholder.svg")}
                        alt={`${company.company}のロゴ`}
                        className="w-12 h-12 rounded-lg object-contain bg-muted"
                        width={48}
                        height={48}
                      />
                      <div>
                        <CardTitle className="text-lg">{company.company}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {company.industry.split('/').map((industry, i) => (
                            <Badge key={i} variant="secondary" className="text-sm">{industry.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      <Eye className="w-3 h-3 mr-1" />
                      推定
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground mb-1">推定年収</div>
                    <div className="text-2xl font-bold text-foreground">¥{company.estimatedAnnualSalary}</div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{company.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
