import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildComparePairs, parsePairSlug, pairSlug } from "@/lib/compare"
import { getRankNeighbors, getCompareCandidates } from "@/lib/company-stats"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"
import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { CompanyLogo } from "@/components/company-logo"
import Image from "next/image"
import Link from "next/link"
import { Metadata } from "next"
import type { CompanyData } from "@/lib/sheets"

type Props = {
  params: { pair: string }
}

export const revalidate = 3600

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

export async function generateStaticParams() {
  const all = await fetchAllUniqueCompanies()
  return buildComparePairs(all).map((pair) => ({ pair }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.pair)
  const ids = parsePairSlug(slug)
  if (!ids) return { title: "ページが見つかりません" }
  const all = await fetchAllUniqueCompanies()
  const a = all.find((c) => c.id === ids[0])
  const b = all.find((c) => c.id === ids[1])
  if (!a || !b) return { title: "ページが見つかりません" }

  const fmt = (v: number | string | null | undefined) =>
    typeof v === "number" ? `¥${v.toLocaleString()}` : "要確認"
  const title = `${a.company}と${b.company}の初任給・年収比較【${FISCAL_YEAR}年】どちらが高い？`
  const description = `${a.company}（初任給${fmt(a.baseMonthly)}/月）と${b.company}（初任給${fmt(b.baseMonthly)}/月）を比較。手取り目安・想定年収・従業員数・業界内順位を一覧で確認できます。`

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/compare/${pairSlug(a.id, b.id)}`,
    },
    openGraph: { title, description },
  }
}

export default async function ComparePage({ params }: Props) {
  const slug = decodeURIComponent(params.pair)
  const ids = parsePairSlug(slug)
  if (!ids) notFound()

  // ID辞書順に正規化したURLへリダイレクト（重複ページ防止）
  const canonical = pairSlug(ids[0], ids[1])
  if (slug !== canonical) redirect(`/compare/${canonical}`)

  const all = await fetchAllUniqueCompanies()
  const a = all.find((c) => c.id === ids[0])
  const b = all.find((c) => c.id === ids[1])
  if (!a || !b) notFound()

  const aMonthly = num(a.baseMonthly)
  const bMonthly = num(b.baseMonthly)
  const aNet = estimateNetSalary(a.baseMonthly)
  const bNet = estimateNetSalary(b.baseMonthly)
  const aRank = getRankNeighbors(all, a).rank
  const bRank = getRankNeighbors(all, b).rank
  const lastUpdated = new Date()

  // 冒頭で答えを言い切るサマリー
  let leadSummary = ""
  if (aMonthly !== null && bMonthly !== null) {
    if (aMonthly === bMonthly) {
      leadSummary = `${a.company}と${b.company}の初任給はともに月額${aMonthly.toLocaleString()}円で同水準です（${FISCAL_YEAR}年度）。`
    } else {
      const [hi, lo] = aMonthly > bMonthly ? [a, b] : [b, a]
      const diff = Math.abs(aMonthly - bMonthly)
      leadSummary = `初任給は${hi.company}が月額${(num(hi.baseMonthly) as number).toLocaleString()}円、${lo.company}が月額${(num(lo.baseMonthly) as number).toLocaleString()}円で、${hi.company}のほうが${diff.toLocaleString()}円高い水準です（${FISCAL_YEAR}年度）。`
    }
  }

  const fmtYen = (v: number | null) => (v !== null ? `¥${v.toLocaleString()}` : "—")
  const rows: { label: string; a: string; b: string; higher: 0 | 1 | -1 }[] = []
  const pushRow = (label: string, av: number | null, bv: number | null, fmt: (v: number | null) => string = fmtYen, higherWins = true) => {
    let higher: 0 | 1 | -1 = 0
    if (av !== null && bv !== null && av !== bv && higherWins) higher = av > bv ? -1 : 1
    rows.push({ label, a: fmt(av), b: fmt(bv), higher })
  }
  pushRow("初任給（月額）", aMonthly, bMonthly)
  pushRow(
    "手取り目安（1年目）",
    aNet ? roundNet(aNet.netMonthlyFirstYear) : null,
    bNet ? roundNet(bNet.netMonthlyFirstYear) : null,
    (v) => (v !== null ? `約¥${v.toLocaleString()}` : "—"),
  )
  pushRow("想定年収", num(a.annualSalary), num(b.annualSalary))
  rows.push({
    label: "初任給 全体順位",
    a: aRank !== null ? `${aRank}位` : "—",
    b: bRank !== null ? `${bRank}位` : "—",
    higher: aRank !== null && bRank !== null && aRank !== bRank ? (aRank < bRank ? -1 : 1) : 0,
  })
  rows.push({
    label: "従業員数",
    a: typeof a.employees === "number" ? `${a.employees.toLocaleString()}人` : "—",
    b: typeof b.employees === "number" ? `${b.employees.toLocaleString()}人` : "—",
    higher: 0,
  })
  rows.push({
    label: "設立",
    a: a.founded ? `${a.founded}年` : "—",
    b: b.founded ? `${b.founded}年` : "—",
    higher: 0,
  })
  rows.push({
    label: "業界",
    a: a.industry.split("/").join("・"),
    b: b.industry.split("/").join("・"),
    higher: 0,
  })

  // 関連する比較ページ（両社それぞれの比較候補・現ペアを除く）
  const relatedPairs = Array.from(
    new Set(
      [...getCompareCandidates(all, a, 3).map((c) => pairSlug(a.id, c.id)),
       ...getCompareCandidates(all, b, 3).map((c) => pairSlug(b.id, c.id))],
    ),
  )
    .filter((p) => p !== canonical)
    .slice(0, 6)
  const pairLabel = (p: string) => {
    const pIds = parsePairSlug(p)
    if (!pIds) return p
    const c1 = all.find((c) => c.id === pIds[0])
    const c2 = all.find((c) => c.id === pIds[1])
    return c1 && c2 ? `${c1.company} vs ${c2.company}` : p
  }

  const faq =
    aMonthly !== null && bMonthly !== null
      ? [
          {
            question: `${a.company}と${b.company}はどちらの初任給が高いですか？`,
            answer: leadSummary,
          },
        ]
      : []

  const faqLd = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "初任給ランキング", item: `${SITE_URL}/ranking` },
      { "@type": "ListItem", position: 3, name: `${a.company} vs ${b.company}`, item: `${SITE_URL}/compare/${canonical}` },
    ],
  }

  const CompanyHeader = ({ c }: { c: CompanyData }) => (
    <Link href={`/companies/${c.id}`} className="flex flex-col items-center gap-2 group">
      <CompanyLogo
        logo={c.logo}
        domain={c.domain}
        company={c.company}
        size={56}
        className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-contain border bg-card"
      />
      <span className="text-sm md:text-base font-bold text-center leading-tight group-hover:text-primary transition-colors">
        {c.company}
      </span>
    </Link>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-3xl mx-auto space-y-8">
            <section>
              <nav aria-label="パンくずリスト" className="text-xs text-muted-foreground mb-3">
                <Link href="/" className="hover:underline">ホーム</Link>
                <span className="mx-1.5">›</span>
                <Link href="/ranking" className="hover:underline">ランキング</Link>
                <span className="mx-1.5">›</span>
                <span>{a.company} vs {b.company}</span>
              </nav>
              <h1 className="text-xl md:text-3xl font-bold text-primary">
                {a.company}と{b.company}の初任給・年収比較【{FISCAL_YEAR}年】
              </h1>
              {leadSummary && (
                <p className="mt-4 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                  {leadSummary}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                最終更新日: <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleDateString("ja-JP")}</time>
              </p>
            </section>

            {/* --- 比較表 --- */}
            <section>
              <Card className="py-0 gap-0 overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full text-sm md:text-base">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 md:p-4 text-left font-medium text-muted-foreground w-[30%]">項目</th>
                        <th className="p-3 md:p-4"><CompanyHeader c={a} /></th>
                        <th className="p-3 md:p-4"><CompanyHeader c={b} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <th scope="row" className="p-3 md:p-4 text-left text-xs md:text-sm font-medium text-muted-foreground">
                            {row.label}
                          </th>
                          <td className={`p-3 md:p-4 text-center ${row.higher === -1 ? "font-bold text-primary" : ""}`}>
                            {row.a}
                          </td>
                          <td className={`p-3 md:p-4 text-center ${row.higher === 1 ? "font-bold text-primary" : ""}`}>
                            {row.b}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                ※手取りは独身・扶養なし・新卒1年目（住民税なし）を前提とした概算です。データは{FISCAL_YEAR}年度・当サイト調べ。
              </p>
            </section>

            <AdBanner />

            {/* --- 各社の詳細ページへ --- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="bg-transparent">
                <Link href={`/companies/${a.id}`}>{a.company}の詳細を見る →</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href={`/companies/${b.id}`}>{b.company}の詳細を見る →</Link>
              </Button>
            </section>

            {/* --- 関連する比較 --- */}
            {relatedPairs.length > 0 && (
              <section className="space-y-3 border-t pt-8">
                <h2 className="text-base md:text-lg font-bold">関連する比較</h2>
                <div className="flex flex-wrap gap-2">
                  {relatedPairs.map((p) => (
                    <Button key={p} asChild variant="outline" size="sm" className="bg-transparent">
                      <Link href={`/compare/${p}`}>{pairLabel(p)}</Link>
                    </Button>
                  ))}
                </div>
                <p className="text-sm">
                  <Link href="/ranking" className="text-primary hover:underline">全企業の初任給ランキングを見る →</Link>
                </p>
              </section>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
