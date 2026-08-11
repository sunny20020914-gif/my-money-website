import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CompanyLogo } from "@/components/company-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AdBanner } from "@/components/ad-banner"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"
import type { Metadata } from "next"

export const revalidate = 3600

/**
 * 【クロール対策】掲載企業の一覧ハブ。
 *
 * これまで /companies は存在せず404だった（/companies/[id] のみ）。
 * その結果、企業詳細ページへの内部リンクはランキング・業界・条件一覧に
 * 分散しており、クローラーから見て「全企業を一望できる入口」が無かった。
 *
 * 全企業へのリンクを1ページに集約することで、
 * ・どの企業ページもトップから2クリックで到達できる
 * ・Googlebotが未クロールの企業を発見しやすくなる
 * ようにする。ユーザーにとっても社名から直接探せる導線になる。
 */
export const metadata: Metadata = {
  title: `掲載企業一覧｜初任給・平均年収を調べる【${FISCAL_YEAR}年最新】`,
  description: `当サイトに掲載している企業の一覧です。社名から各企業の初任給・手取り・平均年収・業績データのページに移動できます。${FISCAL_YEAR}年最新データ。`,
  alternates: { canonical: `${SITE_URL}/companies` },
}

/** 社名の頭文字でグループ分けするためのキーを返す */
function initialKey(name: string): string {
  const c = (name ?? "").trim().charAt(0)
  if (!c) return "その他"
  // 英数字始まりは A-Z / 0-9 でまとめる
  if (/[A-Za-z]/.test(c)) return c.toUpperCase()
  if (/[0-9０-９]/.test(c)) return "0-9"
  // ひらがな・カタカナ・漢字はまとめて「日本語社名」に寄せる
  // （読み仮名を持っていないため五十音順には並べられない）
  return "日本語"
}

export default async function CompaniesIndexPage() {
  const all = await fetchAllUniqueCompanies()

  // 初任給の高い順。データが無い企業は末尾に回す
  const num = (v: number | string | null | undefined) =>
    typeof v === "number" && v > 0 ? v : null
  const companies = [...all].sort(
    (a, b) => (num(b.baseMonthly) ?? -1) - (num(a.baseMonthly) ?? -1),
  )

  // 頭文字でグルーピング（英字 → 数字 → 日本語 の順）
  const groups = new Map<string, typeof companies>()
  for (const c of companies) {
    const k = initialKey(c.company)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(c)
  }
  const orderedKeys = Array.from(groups.keys()).sort((a, b) => {
    const rank = (k: string) => (k === "日本語" ? 2 : k === "0-9" ? 1 : 0)
    return rank(a) - rank(b) || a.localeCompare(b)
  })

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `掲載企業一覧 ${FISCAL_YEAR}`,
    numberOfItems: companies.length,
    itemListElement: companies.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.company,
      url: `${SITE_URL}/companies/${c.id}`,
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "掲載企業一覧", item: `${SITE_URL}/companies` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">

            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <span>/</span>
              <span className="text-foreground font-medium">掲載企業一覧</span>
            </nav>

            <div className="mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-primary mb-3">
                掲載企業一覧【{FISCAL_YEAR}年最新】
              </h1>
              <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                当サイトに掲載している{companies.length}社の一覧です。
                社名をクリックすると、その企業の初任給・手取りの目安・全社員の平均年収・
                業績データをまとめたページに移動します。
                初任給の高い順に並べています。
              </p>
            </div>

            <AdBanner />

            <div className="mt-8 space-y-8">
              {orderedKeys.map((key) => (
                <section key={key}>
                  <h2 className="text-lg font-bold text-foreground border-b pb-2 mb-3">
                    {key}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {groups.get(key)!.length}社
                    </span>
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {groups.get(key)!.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/companies/${c.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          <CompanyLogo
                            logo={c.logo}
                            domain={c.domain}
                            company={c.company}
                            size={32}
                            className="w-8 h-8 rounded object-contain shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {c.company}
                            </p>
                            {typeof c.baseMonthly === "number" && (
                              <p className="text-xs text-muted-foreground tabular">
                                初任給 ¥{c.baseMonthly.toLocaleString()}/月
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/ranking">初任給ランキングを見る</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/industries">業界別に探す</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/lists">条件で絞り込む</Link>
              </Button>
            </div>

          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
