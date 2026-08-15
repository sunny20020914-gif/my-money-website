import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchAllUniqueCompanies } from "@/lib/sheets"
import { buildMetricRanking, METRIC_RANKINGS, type MetricSlug } from "@/lib/metric-rankings"
import { buildBalancedRanking, BALANCED_DEF } from "@/lib/balanced-ranking"
import { MetricRankingView } from "./metric-ranking-view"
import { SITE_URL, FISCAL_YEAR, TARGET_GRAD_LABEL } from "@/lib/config"

/**
 * 指標別ランキング（伸び率・平均年収・一人当たり営業利益・営業利益率）の
 * 共通処理。ルートごとの page.tsx はスラッグを渡すだけにする。
 *
 * 【なぜページを分けるか】
 * 1つのページ内でタブ切り替えにすると、検索エンジンから見て
 * そのURLが何についてのページなのか曖昧になる。
 * 「平均年収 ランキング」「初任給 伸び率」はそれぞれ別の検索意図なので、
 * URLを分けて個別に評価を受けられるようにする。
 * 初任給／想定年収を独立ページに分けたのと同じ考え方。
 */

async function loadRanking(slug: MetricSlug) {
  const def = METRIC_RANKINGS[slug]
  const all = await fetchAllUniqueCompanies()
  return buildMetricRanking(all, def)
}

/**
 * メタデータを組み立てる。
 * 集計値（1位の企業名・中央値）を説明文に入れることで、
 * 検索結果のスニペットだけで内容が伝わるようにする。
 */
export async function buildMetricMetadata(slug: MetricSlug): Promise<Metadata> {
  const def = METRIC_RANKINGS[slug]
  const base: Metadata = {
    title: `【${FISCAL_YEAR}年最新】${def.title}`,
    alternates: { canonical: `${SITE_URL}${def.path}` },
  }

  try {
    const ranking = await loadRanking(slug)
    if (!ranking || !ranking.top) return { ...base, description: def.definition }
    return {
      ...base,
      description:
        `${TARGET_GRAD_LABEL}向け・${def.valueLabel}のランキング（掲載${ranking.count}社）。` +
        `1位は${ranking.top.company.company}の${ranking.top.display}、中央値は${ranking.medianDisplay}です。` +
        `${def.definition}`,
    }
  } catch {
    return { ...base, description: def.definition }
  }
}

export async function renderMetricRankingPage(slug: MetricSlug) {
  const def = METRIC_RANKINGS[slug]
  const ranking = await loadRanking(slug)

  // 【重要】データが揃っていない指標のページは公開しない。
  // 中身の薄いページを出すとソフト404扱いになり、サイト全体の評価を下げる。
  // スプレッドシートのN〜Y列が未入力の間は、このページ自体が存在しない扱いになる。
  if (!ranking) notFound()

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${def.valueLabel}ランキング ${FISCAL_YEAR}`,
    description: def.definition,
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
      { "@type": "ListItem", position: 3, name: `${def.valueLabel}ランキング`, item: `${SITE_URL}${def.path}` },
    ],
  }

  // FAQは画面に表示している内容と同じ関数から生成しているため、
  // 構造化データと本文が食い違うことがない。
  const faqLd =
    ranking.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: ranking.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <MetricRankingView ranking={ranking} />
    </>
  )
}

/**
 * sitemap 用。データが揃っていて実際に公開されるページのパスだけを返す。
 * 未入力の指標をsitemapに載せると404を報告することになるため、
 * 必ず同じ判定（buildMetricRanking が null でないこと）を通す。
 */
export async function availableMetricRankingPaths(): Promise<string[]> {
  try {
    const all = await fetchAllUniqueCompanies()
    const paths = (Object.keys(METRIC_RANKINGS) as MetricSlug[])
      .filter((slug) => buildMetricRanking(all, METRIC_RANKINGS[slug]) !== null)
      .map((slug) => METRIC_RANKINGS[slug].path)

    // 初任給×平均年収は専用ロジックで作るため個別に判定する。
    // ページ側（app/ranking/balanced/page.tsx）と同じ関数を通すので、
    // 「sitemapには載るが404」という不整合は起きない。
    if (buildBalancedRanking(all) !== null) paths.push(BALANCED_DEF.path)

    return paths
  } catch {
    return []
  }
}
