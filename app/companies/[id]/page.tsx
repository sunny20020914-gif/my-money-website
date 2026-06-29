import { fetchRankingDataServer, fetchCompanyById } from "@/lib/sheets"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { DollarSign, TrendingUp, Sparkles, Info, ExternalLink } from "lucide-react"
import { Metadata } from "next"
import dynamic from "next/dynamic"
import { Remarkable } from "remarkable"
import { CommentSection } from "@/components/comment-section"

// AdBannerをクライアントサイドでのみ動的に読み込む
const DynamicAdBanner = dynamic(() => import('@/components/ad-banner').then(mod => mod.AdBanner), { ssr: false });
type Props = {
  params: { id: string }
}

// 1時間（3600秒）ごとにデータを再検証して更新する設定（ISR）
export const revalidate = 3600

// 各企業のメタデータを動的に生成
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await fetchCompanyById(params.id)

  if (!company) {
    return {
      title: "企業情報が見つかりません",
    }
  }

  const fmtSalary = (v: number | string | undefined) =>
    typeof v === "number" ? `¥${v.toLocaleString()}` : v ?? "要確認"

  const monthly = company.baseMonthly ?? company.monthlySalary ?? company.baseSalary
  const parts = [
    `初任給${fmtSalary(monthly)}/月`,
    `想定年収${fmtSalary(company.annualSalary)}/年`,
    `従業員数${typeof company.employees === "number" ? company.employees.toLocaleString() : company.employees}人`,
  ]
  const description = `${company.company}の${parts.join("、")}。業界：${company.industry.split("/")[0]}。事業内容・強み・将来性を解説。`

  return {
    title: `${company.company}の初任給・年収・採用情報`,
    description,
    alternates: {
      canonical: `https://www.mymoneyweb.com/companies/${params.id}`,
    },
    openGraph: {
      title: `${company.company}の初任給・年収・採用情報`,
      description,
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

  const SalaryDisplay = (props: { value: number | string, url?: string, isPrimary?: boolean }) => {
    const { value, url, isPrimary = false } = props;
    const isNumberValue = typeof value === 'number';

    const valueComponent = (
      <p className={
        isNumberValue
          ? (isPrimary ? "text-xl md:text-2xl font-bold text-primary" : "text-lg md:text-xl font-semibold")
          : "text-lg font-semibold"
      }>
        {isNumberValue ? `¥${value.toLocaleString()}` : value}
      </p>
    );

    if (url && !isNumberValue) {
      return <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">{valueComponent}</a>;
    }
    return valueComponent;
  };

  // 記事ページと同じ設定でMarkdownパーサーを初期化
  const md = new Remarkable({
    html: true, // HTMLタグを有効化
  })

  // 記事ページと同じ改行処理ルールを適用する関数
  const renderMarkdown = (content: string) => {
    return md.render(content.replace(/\n+/g, "\n\n"))
  }

  const pageUrl = `https://www.mymoneyweb.com/companies/${company.id}`
  const logoUrl = company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : undefined)
  const fmtNum = (v: number | string | undefined) =>
    typeof v === "number" ? v : undefined

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.company,
    url: company.url || pageUrl,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(company.description ? { description: company.description } : {}),
    ...(company.founded ? { foundingDate: String(company.founded) } : {}),
    ...(company.employees !== undefined ? {
      numberOfEmployees: {
        "@type": "QuantitativeValue",
        value: fmtNum(company.employees) ?? company.employees,
      },
    } : {}),
    sameAs: company.url ? [company.url] : [],
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: "https://www.mymoneyweb.com/" },
      { "@type": "ListItem", position: 2, name: "初任給ランキング", item: "https://www.mymoneyweb.com/ranking" },
      { "@type": "ListItem", position: 3, name: company.company, item: pageUrl },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* --- 企業ヘッダー --- */}
          <section>
            {/* 🌟 flex-wrap を追加して、画面幅に収まらない長い企業名は自動でロゴの下に回り込むように調整 */}
            <div className="flex flex-wrap items-start gap-4 sm:gap-6">
              <Image
                src={company.logo || (company.domain ? `https://logo.clearbit.com/${company.domain}` : "/placeholder.svg")}
                alt={`${company.company}のロゴ`}
                width={100}
                height={100}
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg object-contain border bg-card flex-shrink-0"
              />
              {/* 🌟 最小幅（min-w-[200px]）を指定することで、自動折り返しの判定を最適化 */}
              <div className="flex-grow flex-shrink-0 min-w-[200px]">
                <h1 className="text-xl md:text-4xl font-bold">{company.company}</h1>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-3">
                  {company.industry.split("/").map((industry, i) => (
                    <Badge key={i} variant="secondary">{industry}</Badge>
                  ))}
                  {company.url && (
                    <a href={company.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                      公式サイト
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* --- 給与情報 --- */}
          <section>
            <Card className="py-0 gap-0">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-4 md:flex md:flex-wrap md:justify-around md:items-center md:gap-x-8 md:gap-y-6">
                  {/* 想定年収 */}
                  <div className="space-y-1 md:text-center">
                    <p className="text-sm text-muted-foreground">想定年収</p>
                    <SalaryDisplay value={company.annualSalary} url={company.salaryUrl} isPrimary />
                  </div>
                  {/* 初任給（月額） */}
                  <div className="space-y-1 md:text-center">
                    <p className="text-sm text-muted-foreground">初任給（月額）</p>
                    <SalaryDisplay value={company.baseMonthly} url={company.salaryUrl} />
                  </div>
                  {/* 設立 */}
                  <div className="space-y-1 md:text-center">
                    <p className="text-sm text-muted-foreground">設立</p>
                    <p className="text-lg font-semibold whitespace-nowrap">{company.founded}年</p>
                  </div>
                  {/* 従業員数 */}
                  <div className="space-y-1 md:text-center">
                    <p className="text-sm text-muted-foreground">従業員数</p>
                    <p className="text-lg font-semibold whitespace-nowrap">{typeof company.employees === 'number' ? `${company.employees.toLocaleString()}人` : `${company.employees}人`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* --- 企業概要 --- */}
          <section className="space-y-7">
            {company.long_description && <div className="space-y-3">
              <h3 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2"><Info className="w-6 h-6" />企業概要</h3>
              <div
                /* 🌟 スマホ版の本文のフォントサイズを 15px から 17px（text-[17px]）に一段階拡大 */
                className="prose prose-p:text-[17px] md:prose-p:text-lg dark:prose-invert max-w-none leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(company.long_description) }}
              />
              <DynamicAdBanner />
            </div>}
            {company.strength && <div className="space-y-3">
              <h3 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                <TrendingUp className="w-6 h-6" />強み
              </h3>
              <div
                /* 🌟 スマホ版の本文のフォントサイズを 17px に拡大 */
                className="prose prose-p:text-[17px] md:prose-p:text-lg dark:prose-invert max-w-none leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(company.strength) }}
              />
            </div>}
            {company.future_potential && <div className={`space-y-3 ${!company.salary_details ? 'mb-12' : ''}`}>
              <h3 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                <Sparkles className="w-6 h-6" />将来性
              </h3>
              <div
                /* 🌟 スマホ版の本文のフォントサイズを 17px に拡大 */
                className="prose prose-p:text-[17px] md:prose-p:text-lg dark:prose-invert max-w-none leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(company.future_potential) }}
              />
              {!company.salary_details && <DynamicAdBanner />}
            </div>}
            {company.salary_details && <div className="space-y-3 mb-12">
              <h3 className="flex items-center gap-2.5 text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                <DollarSign className="w-5 h-5" />給与に関する補足
              </h3>
              <div
                /* 🌟 補足部分もスマホで読みやすいよう 17px に調整 */
                className="prose prose-p:text-[17px] md:prose-p:text-base dark:prose-invert max-w-none leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(company.salary_details) }}
              />
              <DynamicAdBanner />
            </div>}
          </section>

          {/* --- コメント欄 --- */}
          <section className="mt-16 border-t pt-10">
            <CommentSection companyId={company.id} />
          </section>
        </div>
      </main>
      <Footer />
    </div>
    </>
  )
}