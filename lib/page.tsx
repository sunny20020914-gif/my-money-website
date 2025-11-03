import { fetchRankingDataServer, fetchCompanyById } from "@/lib/sheets"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { DollarSign, TrendingUp, TrendingDown, Info } from "lucide-react"
import { Metadata } from "next"

type Props = {
  params: { id: string }
}

// 各企業のメタデータを動的に生成
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await fetchCompanyById(params.id)

  if (!company) {
    return {
      title: "企業情報が見つかりません",
    }
  }

  return {
    title: `${company.company}の初任給・年収・採用情報`,
    description: `${company.company}の初任給、想定年収、事業内容、強み・弱みを解説。就活生向けに企業の詳細情報を提供します。`,
    openGraph: {
      title: `${company.company}の初任給・年収・採用情報`,
      description: `${company.company}の初任給、想定年収、事業内容、強み・弱みを解説。`,
      images: [company.logo || "/og-image.jpg"],
    },
  }
}

// ビルド時に全企業ページを静的に生成
export async function generateStaticParams() {
  const companies = await fetchRankingDataServer("annual")
  return companies.map((company) => ({
    id: company.id,
  }))
}

export default async function CompanyPage({ params }: Props) {
  const company = await fetchCompanyById(params.id)

  if (!company) {
    notFound()
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* --- 企業ヘッダー --- */}
          <section>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Image
                src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                alt={`${company.company}のロゴ`}
                width={100}
                height={100}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-contain border bg-card flex-shrink-0"
              />
              <div className="flex-grow">
                <h1 className="text-2xl md:text-4xl font-bold">{company.company}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  {company.industry.split("/").map((industry, i) => (
                    <Badge key={i} variant="secondary">{industry}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* --- 給与情報 --- */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><DollarSign className="w-5 h-5" />給与情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">想定年収</p>
                    <p className="text-2xl font-bold text-primary">¥{company.annualSalary.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">初任給（月額）</p>
                    <p className="text-xl font-semibold">¥{company.baseMonthly.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center sm:text-left">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">設立年</p>
                    <p className="text-lg font-semibold">{company.founded}年</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">従業員数</p>
                    <p className="text-lg font-semibold">
                      {typeof company.employees === 'number' ? `${company.employees.toLocaleString()}人` : company.employees}
                    </p>
                  </div>
                </div>
                {company.salary_details && <p className="text-sm text-muted-foreground leading-relaxed pt-2">{company.salary_details}</p>}
              </CardContent>
            </Card>
          </section>

          {/* --- 企業概要 --- */}
          <section className="prose prose-slate dark:prose-invert max-w-none">
            <h2 className="flex items-center gap-2"><Info className="w-6 h-6" />企業概要</h2>
            <p>{company.long_description || company.description}</p>

            {company.strength && <>
              <h3 className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />強み</h3>
              <p>{company.strength}</p>
            </>}
            {company.weakness && <>
              <h3 className="flex items-center gap-2"><TrendingDown className="w-5 h-5" />弱み</h3>
              <p>{company.weakness}</p>
            </>}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}