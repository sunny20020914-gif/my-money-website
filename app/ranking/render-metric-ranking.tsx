import type { Metadata } from "next"
import { RankingUnavailable, UNAVAILABLE_ROBOTS } from "./ranking-unavailable"
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

/**
 * ランキングを組み立てる。
 *
 * 【重要】ここで例外を投げないこと。
 * これらは静的ルートなので、ビルド時の事前レンダリングで例外や notFound() が
 * 発生するとビルド全体が失敗する（実際に
 * 「Export encountered errors on following paths: /ranking/average ...」で
 * デプロイが落ちた）。データが取れないときは null を返し、
 * 呼び出し側が noindex の代替画面を出す。
 */
async function loadRanking(slug: MetricSlug) {
  try {
    const def = METRIC_RANKINGS[slug]
    const all = await fetchAllUniqueCompanies()
    return buildMetricRanking(all, def)
  } catch (error) {
    console.error(`[ranking] ${slug} の集計に失敗:`, error)
    return null
  }
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

  const ranking = await loadRanking(slug)
  // データが無いときは代替画面を返すため、必ず noindex にする。
  // 中身の薄いページをインデックスさせるとサイト全体の評価が下がる。
  if (!ranking || !ranking.top) {
    return { ...base, description: def.definition, robots: UNAVAILABLE_ROBOTS }
  }
  return {
    ...base,
    description:
      `${TARGET_GRAD_LABEL}向け・${def.valueLabel}のランキング（掲載${ranking.count}社）。` +
      `1位は${ranking.top.company.company}の${ranking.top.display}、中央値は${ranking.medianDisplay}です。` +
      `${def.definition}`,
  }
}

export async function renderMetricRankingPage(slug: MetricSlug) {
  const def = METRIC_RANKINGS[slug]
  const ranking = await loadRanking(slug)

  // 【重要】ここで notFound() を呼んではいけない。
  // 静的ルートなのでビルド時の事前レンダリングで404を出すと
  // 書き出すHTMLが決まらず、デプロイ全体が失敗する。
  // データが無いときは noindex の代替画面を返し、
  // 復旧後の再生成で通常表示に自動的に戻す。
  if (!ranking) return <RankingUnavailable title={def.h1} />

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
