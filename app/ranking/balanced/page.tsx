import type { Metadata } from "next"
import { RankingUnavailable, UNAVAILABLE_ROBOTS } from "../ranking-unavailable"
import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildBalancedRanking, BALANCED_DEF, type Quadrant } from "@/lib/balanced-ranking"
import { MetricRankingView } from "../metric-ranking-view"
import { SITE_URL, FISCAL_YEAR, TARGET_GRAD_LABEL, REVALIDATE_FRESH } from "@/lib/config"

export const revalidate = REVALIDATE_FRESH

/**
 * 初任給 × 平均年収の両立ランキング。
 *
 * 単一指標の4本（伸び率・平均年収・一人当たり利益・営業利益率）とは違い、
 * 2つの変数を合成するため専用のロジック（lib/balanced-ranking.ts）を使う。
 * 表示は共通の MetricRankingView を再利用し、
 * 4象限分類だけを extraSection として差し込む。
 */

/**
 * 【重要】ここで例外を投げないこと。
 * 静的ルートなのでビルド時の事前レンダリングで例外や notFound() が起きると
 * デプロイ全体が失敗する。データが無いときは null を返す。
 */
async function load() {
  try {
    const all = await fetchAllUniqueCompanies()
    return buildBalancedRanking(all)
  } catch (error) {
    console.error("[ranking] 初任給×平均年収の集計に失敗:", error)
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const base: Metadata = {
    title: `【${FISCAL_YEAR}年最新】${BALANCED_DEF.title}`,
    alternates: { canonical: `${SITE_URL}${BALANCED_DEF.path}` },
  }
  const r = await load()
  // データが無いときは代替画面を返すので必ず noindex にする
  if (!r || !r.top) {
    return { ...base, description: BALANCED_DEF.definition, robots: UNAVAILABLE_ROBOTS }
  }
  const both = r.quadrants.find((q) => q.key === "both")
  return {
    ...base,
    description:
      `${TARGET_GRAD_LABEL}向け・初任給と平均年収の両方が高い企業のランキング（対象${r.count}社）。` +
      `1位は${r.top.company.company}。両方が中央値以上の企業は${both?.count ?? 0}社（${both?.share ?? 0}%）にとどまります。` +
      `平均年収は有価証券報告書に基づく原則上場企業の数値です。`,
  }
}

/** 4象限の分類表。ランキング表の直後に置く */
function QuadrantSection({ quadrants }: { quadrants: Quadrant[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl md:text-2xl font-bold mb-4">4つのタイプに分けて見る</h2>
      <p className="text-[15px] md:text-base text-muted-foreground mb-5 leading-relaxed">
        初任給と平均年収それぞれの中央値で区切ると、掲載企業は4つのタイプに分かれます。
        「両取り型」以外にも意味があり、何を重視するかによって選ぶべき企業は変わります。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {quadrants.map((q) => (
          <div
            key={q.key}
            className={`rounded-2xl border p-5 ${
              q.key === "both" ? "border-primary/40 bg-primary/5" : "bg-card"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h3 className="text-base md:text-lg font-bold text-foreground">{q.label}</h3>
              <p className="shrink-0 text-sm text-muted-foreground tabular">
                <span className="text-lg font-bold text-foreground">{q.count}</span>社（{q.share}%）
              </p>
            </div>
            <p className="text-[15px] leading-[1.9] text-muted-foreground mb-3">{q.description}</p>
            {q.examples.length > 0 && (
              <p className="text-sm text-muted-foreground">
                例：{q.examples.join("、")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function BalancedRankingPage() {
  const ranking = await load()

  // 【重要】ここで notFound() を呼んではいけない。
  // 静的ルートなのでビルド時の事前レンダリングで404を出すと
  // 書き出すHTMLが決まらず、デプロイ全体が失敗する。
  if (!ranking) return <RankingUnavailable title={BALANCED_DEF.h1} />

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `初任給×平均年収ランキング ${FISCAL_YEAR}`,
    description: BALANCED_DEF.definition,
    numberOfItems: ranking.count,
    itemListElement: ranking.entries.map((e) => ({
      "@type": "ListItem",
      position: e.rank,
      name: e.company.company,
      url: `${SITE_URL}/companies/${e.company.id}`,
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "初任給ランキング", item: `${SITE_URL}/ranking` },
      {
        "@type": "ListItem",
        position: 3,
        name: "初任給×平均年収ランキング",
        item: `${SITE_URL}${BALANCED_DEF.path}`,
      },
    ],
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ranking.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <MetricRankingView
        ranking={ranking}
        extraSection={<QuadrantSection quadrants={ranking.quadrants} />}
      />
    </>
  )
}
