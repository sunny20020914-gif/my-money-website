import { fetchAllUniqueCompanies, fetchCompanyById } from "@/lib/sheets"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { DollarSign, TrendingUp, Sparkles, Info, ExternalLink } from "lucide-react"
import { Metadata } from "next"
import dynamic from "next/dynamic"
import { Remarkable } from "remarkable"
import { CommentSection } from "@/components/comment-section"
import { RecentlyViewed } from "@/components/recently-viewed"
import { CompanyLogo } from "@/components/company-logo"
import { ShareButtons } from "@/components/share-buttons"
import Link from "next/link"
import { computeCompanyStats, buildLeadSummary, buildFaq, rankedIndustries, getRankNeighbors, getCompareCandidates } from "@/lib/company-stats"
import { pairSlug } from "@/lib/compare"
import { buildAllListDefinitions } from "@/lib/list-definitions"
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
    // 【SEO】「企業名 初任給 手取り」は実測でCTR50%・6.5位を取れている勝ち筋。
    // 大手就活サイトは手取りを扱わないため差別化でき、
    // 「初任給」単体より競合が薄い。タイトルに手取りを明示して取りにいく。
    // 【年度表記の注意】「${FISCAL_YEAR}年新卒」と書くと26卒向けサイトだと誤読される。
    // FISCAL_YEARはデータの年度なので「年最新」と組み合わせ、卒業年度と切り離す。
    title: netForMeta
      ? `${company.company}の初任給と手取り【${FISCAL_YEAR}年最新】`
      : `${company.company}の初任給・年収【${FISCAL_YEAR}年最新】`,
    description,
    alternates: {
      canonical: `https://www.mymoneyweb.com/companies/${params.id}`,
    },
    openGraph: {
      title: `${company.company}の初任給・年収・採用情報`,
      description,
      // ロゴが無い場合は images を指定しない。
      // 以前は存在しない /og-image.jpg にフォールバックして404になっていた。
      // 未指定なら app/opengraph-image.tsx の自動生成画像が使われる。
      ...(company.logo ? { images: [company.logo] } : {}),
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
  // この企業が属する業界のクロス条件一覧ページ（内部リンク用）
  const industryListDefs = buildAllListDefinitions(allCompanies).filter(
    (d) => d.industry && company.industry.split("/").map((i) => i.trim()).includes(d.industry),
  )
  // 回遊導線: 初任給ランキングで前後の企業 + 同業界の比較候補
  const neighbors = getRankNeighbors(allCompanies, company)
  const compareCandidates = getCompareCandidates(allCompanies, company, 3)
  const primaryIndustry = company.industry.split("/")[0]?.trim() || null
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

  /**
   * FAQのテキスト内に現れる企業名を <strong> で強調して返す。
   * 【重要】この加工は「表示側」だけに適用する。FAQPageスキーマ（JSON-LD）には
   * 加工前のプレーンテキストを渡すこと。構造化データにHTMLタグが混ざると
   * リッチリザルトの判定に悪影響が出るため。
   * dangerouslySetInnerHTML は使わず、配列を返してReactに描画させる（XSS耐性）。
   */
  const emphasizeCompanyName = (text: string, name: string): React.ReactNode[] => {
    if (!name) return [text]
    const parts = text.split(name)
    // 企業名が含まれていなければそのまま返す
    if (parts.length === 1) return [text]
    return parts.flatMap((part, i) =>
      i === 0
        ? [part]
        : [
            <strong key={i} className="font-bold text-foreground">
              {name}
            </strong>,
            part,
          ],
    )
  }

  // 記事ページと同じ設定でMarkdownパーサーを初期化
  const md = new Remarkable({
    html: true, // HTMLタグを有効化
  })

  /**
   * 【重要・折り返しの根本原因だった箇所】
   * 以前は content.replace(/\n+/g, "\n\n") としており、
   * 「単一の改行」まで段落区切りに変換していた。
   * スプレッドシートのセル内で読みやすさのために手動改行していると、
   * その1行ごとが独立した<p>になり、著者が改行した位置で必ず行が終わる。
   * 結果、画面幅に関係なく右側が大きく空いた不自然な折り返しに見えていた。
   *
   * 標準のMarkdownの規則に戻す:
   *   ・空行（\n\n）… 段落の区切り
   *   ・単一の改行 …… 同じ段落内。ブラウザが画面幅に合わせて自然に折り返す
   * \r\n はGoogle Sheets由来で混ざることがあるため \n に正規化しておく。
   */
  const renderMarkdown = (content: string) => {
    return md.render(content.replace(/\r\n/g, "\n"))
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

  // 可視パンくずと同一内容にする（業界ページをハブとして経由）
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      primaryIndustry
        ? { "@type": "ListItem", position: 2, name: `${primaryIndustry}業界`, item: `${SITE_URL}/industries/${encodeURIComponent(primaryIndustry)}` }
        : { "@type": "ListItem", position: 2, name: "初任給ランキング", item: `${SITE_URL}/ranking` },
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
      {/* 【可読性】他ページは px-4 sm:px-6 lg:px-8 だが、ここは px-4 のみで
          スマホだと本文が画面端ギリギリまで伸びて読みにくかった。
          長文を扱うページなので、スマホの左右余白を 16px → 20px に広げる。 */}
      <main className="container mx-auto px-5 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* 【スマホの並び替え】スマホでは企業概要に辿り着くまでのスクロールが長かったため、
            order ユーティリティで「ヘッダー → 給与 → 企業概要 → …」の順に並べ替える。
            md 以上では全要素を order-none(=0) に戻すので、PC表示はDOM順のまま変わらない。
            ※ space-y-8 は「DOM順で」上マージンを付けるため並び替えと相性が悪い。
              並び替え後の見た目の間隔が崩れないよう gap-8 に変更している。 */}
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          {/* --- 企業ヘッダー --- */}
          <section className="order-1 md:order-none">
            {/* 可視パンくず（業界ページへの回遊導線・BreadcrumbList JSON-LDと同一内容） */}
            <nav aria-label="パンくずリスト" className="text-xs text-muted-foreground mb-4">
              <Link href="/" className="hover:underline">ホーム</Link>
              <span className="mx-1.5">›</span>
              {primaryIndustry ? (
                <Link href={`/industries/${encodeURIComponent(primaryIndustry)}`} className="hover:underline">
                  {primaryIndustry}業界
                </Link>
              ) : (
                <Link href="/ranking" className="hover:underline">初任給ランキング</Link>
              )}
              <span className="mx-1.5">›</span>
              <span>{company.company}</span>
            </nav>
            {/* 🌟 flex-wrap を追加して、画面幅に収まらない長い企業名は自動でロゴの下に回り込むように調整 */}
            <div className="flex flex-wrap items-start gap-4 sm:gap-6">
              <CompanyLogo
                logo={company.logo}
                domain={company.domain}
                company={company.company}
                size={100}
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
            <div className="mt-3">
              <ShareButtons url={pageUrl} text={`${company.company}の初任給・年収・手取り情報`} />
            </div>
          </section>

          {/* --- 給与情報 --- */}
          <section className="order-2 md:order-none">
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
                  <>
                    <p className="mt-4 pt-3 border-t text-xs text-muted-foreground leading-relaxed">
                      ※手取りは独身・扶養なしを前提に、社会保険料（健康保険・厚生年金・雇用保険）と所得税を差し引いた概算です。新卒1年目は住民税がかからないため、2年目以降は住民税（月約¥{netSalary.residentTaxMonthly.toLocaleString()}）を差し引いた約¥{roundNet(netSalary.netMonthlySecondYear).toLocaleString()}が目安になります。
                    </p>
                    <p className="mt-2">
                      <Link
                        href={`/simulator?monthly=${netSalary.grossMonthly}&name=${encodeURIComponent(company.company)}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {company.company}の初任給で手取りを詳しくシミュレーション →
                      </Link>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* --- 手取りの内訳（「企業名 初任給 手取り」で流入を取るための中核セクション）---
              大手就活サイトは額面しか載せないため、控除の内訳まで示せるのが差別化点。
              実測でこの系統のクエリは6.5位・CTR50%を記録しており、伸ばす価値が高い。 */}
          {netSalary && (
            <section className="order-3 md:order-none space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                {company.company}の初任給の手取りはいくら？
              </h2>
              <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                {company.company}の初任給（額面）は月額
                <strong className="text-foreground">¥{netSalary.grossMonthly.toLocaleString()}</strong>
                で、ここから社会保険料と所得税が差し引かれます。
                新卒1年目の手取りは月額
                <strong className="text-foreground">約¥{roundNet(netSalary.netMonthlyFirstYear).toLocaleString()}</strong>
                が目安です（独身・扶養なしの概算）。
              </p>

              <Card className="py-0 gap-0">
                <CardContent className="p-4 md:p-5">
                  <table className="w-full text-sm md:text-[15px]">
                    <caption className="sr-only">
                      {company.company}の初任給から差し引かれる控除の内訳
                    </caption>
                    <tbody>
                      <tr className="border-b">
                        <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                          額面（月額総支給）
                        </th>
                        <td className="py-2 text-right font-semibold">
                          ¥{netSalary.grossMonthly.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                          健康保険料
                        </th>
                        <td className="py-2 text-right">−¥{netSalary.healthInsurance.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                          厚生年金保険料
                        </th>
                        <td className="py-2 text-right">−¥{netSalary.pension.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                          雇用保険料
                        </th>
                        <td className="py-2 text-right">−¥{netSalary.employmentInsurance.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b">
                        <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                          所得税
                        </th>
                        <td className="py-2 text-right">−¥{netSalary.incomeTaxMonthly.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b-2 border-primary/50">
                        <th scope="row" className="py-2.5 text-left font-bold">
                          手取り（1年目）
                        </th>
                        <td className="py-2.5 text-right text-lg font-bold text-primary">
                          約¥{roundNet(netSalary.netMonthlyFirstYear).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                          手取り（2年目以降・住民税込み）
                        </th>
                        <td className="py-2 text-right font-semibold">
                          約¥{roundNet(netSalary.netMonthlySecondYear).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="mt-3 pt-3 border-t text-xs text-muted-foreground leading-relaxed">
                    新卒1年目は前年の所得が無いため住民税がかかりません。2年目からは住民税（月約¥
                    {netSalary.residentTaxMonthly.toLocaleString()}）が加わるため、手取りは1年目より少なくなります。
                    賞与・残業代・各種手当は含まない月給ベースの概算です。
                  </p>

                  <p className="mt-3">
                    <Link
                      href={`/simulator?monthly=${netSalary.grossMonthly}&name=${encodeURIComponent(company.company)}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      扶養人数を変えて手取りを詳しく計算する →
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* --- ランキング前後の企業＋比較導線（給与を見た直後の自然な次クリック） --- */}
          {(neighbors.prev || neighbors.next || compareCandidates.length > 0) && (
            <section className="order-5 md:order-none">
              <Card className="py-0 gap-0">
                <CardContent className="p-4 md:p-5 space-y-4">
                  {neighbors.rank !== null && (neighbors.prev || neighbors.next) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        初任給ランキング {neighbors.rank}位 / {neighbors.total}社中 — 前後の企業
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {neighbors.prev ? (
                          <Link
                            href={`/companies/${neighbors.prev.id}`}
                            className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors min-w-0"
                          >
                            <span className="text-xs text-muted-foreground flex-shrink-0">↑{neighbors.rank - 1}位</span>
                            <span className="text-sm font-semibold truncate">{neighbors.prev.company}</span>
                            {typeof neighbors.prev.baseMonthly === "number" && (
                              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 hidden sm:inline">
                                ¥{neighbors.prev.baseMonthly.toLocaleString()}
                              </span>
                            )}
                          </Link>
                        ) : <div />}
                        {neighbors.next ? (
                          <Link
                            href={`/companies/${neighbors.next.id}`}
                            className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors min-w-0"
                          >
                            <span className="text-xs text-muted-foreground flex-shrink-0">↓{neighbors.rank + 1}位</span>
                            <span className="text-sm font-semibold truncate">{neighbors.next.company}</span>
                            {typeof neighbors.next.baseMonthly === "number" && (
                              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 hidden sm:inline">
                                ¥{neighbors.next.baseMonthly.toLocaleString()}
                              </span>
                            )}
                          </Link>
                        ) : <div />}
                      </div>
                    </div>
                  )}
                  {compareCandidates.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {primaryIndustry ? `${primaryIndustry}業界の企業と比較する` : "同業界の企業と比較する"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {compareCandidates.map((c) => (
                          <Button key={c.id} asChild variant="outline" size="sm" className="bg-transparent">
                            <Link href={`/compare/${pairSlug(company.id, c.id)}`}>
                              vs {c.company}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* --- 業界内比較（取得済みランキングデータから算出・所属する全業界分を表示） --- */}
          {industryComparisons.length > 0 && (
            <section className="space-y-4 order-6 md:order-none">
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
              {/* 【SEO】業界×給与のクロス条件一覧への内部リンク */}
              {industryListDefs.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
                  {industryListDefs.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/lists/${encodeURIComponent(d.slug)}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {d.shortName}の企業一覧（{d.count}社）→
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 広告1/2: 給与・業界内比較を見た直後の自然な区切り（ページ上部で唯一の広告） */}
          <div className="order-7 md:order-none">
            <DynamicAdBanner />
          </div>

          {/* --- 企業概要（スマホでは手取りセクションの直後に繰り上げる） --- */}
          <section className="space-y-7 order-4 md:order-none">
            {company.long_description && <div className="space-y-3">
              <h3 className="flex items-center gap-3 text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2"><Info className="w-6 h-6" />企業概要</h3>
              <div
                /* 幅は制限しない。下の「強み」「将来性」カードと左右の位置を揃えるため、
                   親要素の幅いっぱいに広げる（max-w-[42em]を入れると幅が揃わず不自然になる）。 */
                className="prose prose-p:text-[17px] md:prose-p:text-lg dark:prose-invert max-w-none leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(company.long_description) }}
              />
            </div>}

            {/* 強み・将来性は短文のため2カラムのカード形式で表示（レイアウトの均等化） */}
            {(company.strength || company.future_potential) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {company.strength && (
                  <Card className="py-0 gap-0">
                    <CardContent className="p-4 md:p-5">
                      <h3 className="flex items-center gap-2 text-base md:text-lg font-bold text-primary mb-2">
                        <TrendingUp className="w-5 h-5" />強み
                      </h3>
                      <div
                        className="prose prose-sm md:prose-base dark:prose-invert max-w-none leading-relaxed text-foreground"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(company.strength) }}
                      />
                    </CardContent>
                  </Card>
                )}
                {company.future_potential && (
                  <Card className="py-0 gap-0">
                    <CardContent className="p-4 md:p-5">
                      <h3 className="flex items-center gap-2 text-base md:text-lg font-bold text-primary mb-2">
                        <Sparkles className="w-5 h-5" />将来性
                      </h3>
                      <div
                        className="prose prose-sm md:prose-base dark:prose-invert max-w-none leading-relaxed text-foreground"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(company.future_potential) }}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {company.salary_details && <div className="space-y-3">
              <h3 className="flex items-center gap-2.5 text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                <DollarSign className="w-5 h-5" />給与に関する補足
              </h3>
              <div
                className="prose prose-p:text-[17px] md:prose-p:text-base dark:prose-invert max-w-none md:max-w-[42em] leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(company.salary_details) }}
              />
            </div>}
          </section>

          {/* --- よくある質問（FAQPageスキーマと同一内容・データ穴埋めで自動生成） --- */}
          {faq.length > 0 && (
            <section className="space-y-4 order-8 md:order-none">
              <h2 className="text-xl md:text-2xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                {company.company}に関するよくある質問
              </h2>
              <dl className="space-y-5">
                {faq.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    {/* 社名を太字にして視認性を上げる（JSON-LD側は加工前のプレーンテキスト） */}
                    <dt className="font-bold text-[16px] md:text-lg">
                      Q. {emphasizeCompanyName(item.question, company.company)}
                    </dt>
                    <dd className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      A. {emphasizeCompanyName(item.answer, company.company)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* 広告2/2: 記事本文・FAQを読み終えた後、関連企業への回遊直前（上部広告との隣接を避けるため本文がある場合のみ） */}
          {(faq.length > 0 || company.long_description || company.strength || company.future_potential || company.salary_details) && (
            <div className="order-9 md:order-none">
              <DynamicAdBanner />
            </div>
          )}

          {/* --- 同業界の関連企業（全所属業界から統合・内部リンク強化） --- */}
          {stats.relatedCompanies.length > 0 && (
            <section className="space-y-4 order-10 md:order-none">
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
                    <CompanyLogo
                      logo={c.logo}
                      domain={c.domain}
                      company={c.company}
                      size={40}
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

          {/* --- 閲覧履歴（localStorage・回遊導線） --- */}
          <div className="order-11 md:order-none">
            <RecentlyViewed
              current={{
                id: company.id,
                name: company.company,
                monthly: typeof company.baseMonthly === "number" ? company.baseMonthly : null,
              }}
            />
          </div>

          {/* --- コメント欄 --- */}
          <section className="mt-16 border-t pt-10 order-12 md:order-none">
            <CommentSection companyId={company.id} />
          </section>
        </div>
      </main>
      <Footer />
    </div>
    </>
  )
}