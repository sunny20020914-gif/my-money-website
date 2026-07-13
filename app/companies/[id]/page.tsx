import { fetchAllUniqueCompanies, fetchCompanyById } from "@/lib/sheets"
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
import Link from "next/link"
import { computeCompanyStats, buildLeadSummary, buildFaq, rankedIndustries } from "@/lib/company-stats"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"

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

  const fmtSalary = (v: number | string | null | undefined) =>
    typeof v === "number" ? `¥${v.toLocaleString()}` : v ?? "要確認"

  const monthly = company.baseMonthly ?? company.monthlySalary ?? company.baseSalary
  const netForMeta = estimateNetSalary(monthly)
  const parts = [
    `初任給${fmtSalary(monthly)}/月`,
    ...(netForMeta ? [`手取り目安¥${roundNet(netForMeta.netMonthlyFirstYear).toLocaleString()}`] : []),
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

// ビルド時に全企業ページを静的に生成（年俸・月額両シートの全企業が対象）
export async function generateStaticParams() {
  const companies = await fetchAllUniqueCompanies()
  return companies.map((company) => ({
    id: company.id,
  }))
}

export default async function CompanyPage({ params }: Props) {
  // fetchCompanyById は内部で fetchAllUniqueCompanies を呼ぶため、
  // Next.js の fetch 重複排除により追加のAPIコールは発生しない
  const [company, allCompanies] = await Promise.all([
    fetchCompanyById(params.id),
    fetchAllUniqueCompanies(),
  ])

  if (!company) {
    notFound()
  }

  // 取得済みデータから業界内順位・平均・FAQ・関連企業を計算（AI不使用）
  // 複数業界（"IT/通信"等）に属する場合は全業界分の統計を計算する
  const stats = computeCompanyStats(allCompanies, company)
  const industryComparisons = rankedIndustries(stats)
  const leadSummary = buildLeadSummary(company, stats, FISCAL_YEAR)
  const faq = buildFaq(company, stats, FISCAL_YEAR)
  const netSalary = estimateNetSalary(company.baseMonthly)
  const lastUpdated = new Date() // ISR再生成のたびに更新される

  const SalaryDisplay = (props: { value: number | string | null | undefined, url?: string, isPrimary?: boolean }) => {
    const { value, url, isPrimary = false } = props;
    const isNumberValue = typeof value === 'number';

    const valueComponent = (
      <p className={
        isNumberValue
          ? (isPrimary ? "text-xl md:text-2xl font-bold text-primary" : "text-lg md:text-xl font-semibold")
          : "text-lg font-semibold"
      }>
        {isNumberValue ? `¥${(value as number).toLocaleString()}` : value}
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
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "初任給ランキング", item: `${SITE_URL}/ranking` },
      { "@type": "ListItem", position: 3, name: company.company, item: pageUrl },
    ],
  }

  // 【SEO】FAQリッチリザルト獲得用。表示しているFAQと完全に同一内容にする
  const faqLd = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null

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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
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
            {/* 【AI SEO】答えを先に書く自己完結型サマリー。AI検索がこの一文だけで引用できる */}
            {leadSummary && (
              <p className="mt-4 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                {leadSummary}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              最終更新日: <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleDateString("ja-JP")}</time>
            </p>
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
                  {/* 手取り目安（1年目・概算） */}
                  {netSalary && (
                    <div className="space-y-1 md:text-center">
                      <p className="text-sm text-muted-foreground">手取り目安（1年目）</p>
                      <p className="text-lg md:text-xl font-semibold whitespace-nowrap">
                        約¥{roundNet(netSalary.netMonthlyFirstYear).toLocaleString()}
                      </p>
                    </div>
                  )}
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
                {netSalary && (
                  <p className="mt-4 pt-3 border-t text-xs text-muted-foreground leading-relaxed">
                    ※手取りは独身・扶養なしを前提に、社会保険料（健康保険・厚生年金・雇用保険）と所得税を差し引いた概算です。新卒1年目は住民税がかからないため、2年目以降は住民税（月約¥{netSalary.residentTaxMonthly.toLocaleString()}）を差し引いた約¥{roundNet(netSalary.netMonthlySecondYear).toLocaleString()}が目安になります。
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* --- 業界内比較（取得済みランキングデータから算出・所属する全業界分を表示） --- */}
          {industryComparisons.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                業界内での初任給の位置づけ
              </h2>
              {industryComparisons.map((s) => (
                <Card key={s.industry} className="py-0 gap-0">
                  <CardContent className="p-4 md:p-6">
                    <p className="text-sm font-semibold text-primary mb-3">
                      <Link href={`/industries/${encodeURIComponent(s.industry)}`} className="hover:underline">
                        {s.industry}業界
                      </Link>
                      <span className="text-muted-foreground font-normal">（掲載{s.totalInIndustry}社）</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1 md:text-center">
                        <p className="text-sm text-muted-foreground">業界内順位</p>
                        <p className="text-lg md:text-xl font-bold text-primary">
                          {s.rankInIndustry}位<span className="text-sm font-normal text-muted-foreground"> / {s.totalInIndustry}社中</span>
                        </p>
                      </div>
                      {s.industryAvgMonthly !== null && (
                        <div className="space-y-1 md:text-center">
                          <p className="text-sm text-muted-foreground">業界平均（初任給）</p>
                          <p className="text-lg md:text-xl font-semibold">¥{s.industryAvgMonthly.toLocaleString()}</p>
                        </div>
                      )}
                      {s.diffFromAvgMonthly !== null && (
                        <div className="space-y-1 md:text-center col-span-2 md:col-span-1">
                          <p className="text-sm text-muted-foreground">業界平均との差</p>
                          <p className={`text-lg md:text-xl font-semibold ${s.diffFromAvgMonthly >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                            {s.diffFromAvgMonthly >= 0 ? "+" : "-"}¥{Math.abs(s.diffFromAvgMonthly).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}

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

          {/* --- よくある質問（FAQPageスキーマと同一内容・データ穴埋めで自動生成） --- */}
          {faq.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                {company.company}に関するよくある質問
              </h2>
              <dl className="space-y-5">
                {faq.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <dt className="font-bold text-[16px] md:text-lg">Q. {item.question}</dt>
                    <dd className="text-[15px] md:text-base leading-relaxed text-muted-foreground">A. {item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* --- 同業界の関連企業（全所属業界から統合・内部リンク強化） --- */}
          {stats.relatedCompanies.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                同じ業界の他の企業
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.relatedCompanies.map((c) => (
                  <Link
                    key={c.id}
                    href={`/companies/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <Image
                      src={c.logo || (c.domain ? `https://logo.clearbit.com/${c.domain}` : "/placeholder.svg")}
                      alt={`${c.company}のロゴ`}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded object-contain border bg-background flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.company}</p>
                      <p className="text-sm text-muted-foreground">
                        {typeof c.baseMonthly === "number"
                          ? `初任給 ¥${c.baseMonthly.toLocaleString()}/月`
                          : typeof c.annualSalary === "number"
                            ? `想定年収 ¥${c.annualSalary.toLocaleString()}`
                            : c.industry.split("/")[0]}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-x-6 gap-y-1">
                {stats.industryStats.map((s) => (
                  <Link
                    key={s.industry}
                    href={`/industries/${encodeURIComponent(s.industry)}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {s.industry}業界のランキングをすべて見る →
                  </Link>
                ))}
              </div>
            </section>
          )}

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