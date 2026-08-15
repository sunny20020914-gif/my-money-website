import { MetadataRoute } from 'next'
import { fetchArticleDataServer, fetchAllUniqueCompanies } from '@/lib/sheets'
import { buildAllListDefinitions } from '@/lib/list-definitions'
import { availableMetricRankingPaths } from './ranking/render-metric-ranking'
import { TAKE_HOME_AMOUNTS } from '@/lib/take-home'
import { SITE_URL, TARGET_GRADS } from '@/lib/config'

/**
 * 【sitemapの分割】
 * 以前は全URLを1つのsitemapに入れていたため、Search Consoleの
 * 「サイトマップ」レポートでも全体の登録数しか見えず、
 * 「企業ページだけがどれだけ登録されたか」を追えなかった。
 *
 * generateSitemaps で種類ごとに分割すると、
 *   /sitemap/0.xml … 主要ページ
 *   /sitemap/1.xml … 企業詳細
 *   /sitemap/2.xml … 記事
 *   /sitemap/3.xml … 業界・条件一覧
 * のように分かれ、GSCで種類別のインデックス状況が把握できる。
 * Googleは各sitemapを独立して処理するため、
 * 企業ページの取り込み状況を切り分けて監視できるのが最大の利点。
 *
 * ※ lastModified に毎回 new Date() を入れると「全ページが常に更新されている」
 *   という嘘のシグナルになりクローラーの信頼を失う。
 *   実際の更新日が分かる記事ページのみ publishedAt を使う。
 */
export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL

  // ---- 0: 主要ページ（トップ・ランキング・卒年別など） ----
  if (id === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      { route: '/', priority: 1.0, freq: 'daily' },
      { route: '/ranking', priority: 0.9, freq: 'daily' },
      // 想定年収ランキングは独立ページ。初任給とは別キーワードで評価を受ける
      { route: '/ranking/annual', priority: 0.9, freq: 'daily' },
      { route: '/companies', priority: 0.9, freq: 'weekly' },
      { route: '/industries', priority: 0.9, freq: 'weekly' },
      { route: '/featured', priority: 0.8, freq: 'weekly' },
      { route: '/articles', priority: 0.95, freq: 'daily' },
      { route: '/lists', priority: 0.85, freq: 'weekly' },
      { route: '/simulator', priority: 0.8, freq: 'monthly' },
      // 【ロングテール】「初任給30万 手取り」系の検索を受け止めるハブ
      { route: '/take-home', priority: 0.9, freq: 'monthly' },
      { route: '/about', priority: 0.5, freq: 'monthly' },
      { route: '/privacy', priority: 0.3, freq: 'monthly' },
      { route: '/terms', priority: 0.3, freq: 'monthly' },
    ].map(({ route, priority, freq }) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: freq as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority,
    }))

    // 卒年別まとめページ（/grad/27 等）。「27卒 初任給」系クエリの受け皿。
    const gradRoutes: MetadataRoute.Sitemap = TARGET_GRADS.map((g) => ({
      url: `${baseUrl}/grad/${g}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // 【重要】指標別ランキングは、スプレッドシートのN〜Y列にデータが入っていないと
    // noindexの代替画面になる（ビルドを落とさないため404にはしない）。
    // ページ側とまったく同じ判定を通ったパスだけを載せることで、
    // 「sitemapには載っているが中身が無い」という不整合を防ぐ。
    const metricPaths = await availableMetricRankingPaths()
    const metricRoutes: MetadataRoute.Sitemap = metricPaths.map((path) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    return [...staticRoutes, ...gradRoutes, ...metricRoutes]
  }

  // ---- 1: 企業詳細ページ（最も数が多く、インデックスを最優先したい） ----
  if (id === 1) {
    const companies = await fetchAllUniqueCompanies()
    return companies.map((company) => ({
      url: `${baseUrl}/companies/${company.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))
  }

  // ---- 2: 記事ページ＋額面別の手取りページ ----
  if (id === 2) {
    const articles = await fetchArticleDataServer()
    const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${baseUrl}/articles/${article.id}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    }))

    // 【ロングテール】額面1万円刻みの手取りページ（20万〜60万＝41本）。
    // 「初任給30万 手取り」のような検索は数が多く、金融ジャンルなので
    // 広告単価も高い。計算結果は税率が変わらない限り同じなので
    // changeFrequency は monthly で十分。
    const takeHomeRoutes: MetadataRoute.Sitemap = TAKE_HOME_AMOUNTS.map((amount) => ({
      url: `${baseUrl}/take-home/${amount}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))

    return [...articleRoutes, ...takeHomeRoutes]
  }

  // ---- 3: 業界ページ・条件一覧ページ ----
  const all = await fetchAllUniqueCompanies()

  // 【重要】業界ページの generateStaticParams と必ず同じ母集団から業界名を集める。
  // 母集団がずれると「sitemapには載るがページは404」という不整合が起きる。
  const industrySet = new Set(
    all.flatMap((c) => c.industry.split('/').map((i) => i.trim())).filter(Boolean),
  )
  const industryRoutes: MetadataRoute.Sitemap = Array.from(industrySet).map((industry) => ({
    url: `${baseUrl}/industries/${encodeURIComponent(industry)}`,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  const listRoutes: MetadataRoute.Sitemap = buildAllListDefinitions(all).map((def) => ({
    url: `${baseUrl}/lists/${encodeURIComponent(def.slug)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // 【クロールバジェット対策】企業比較ページ（/compare）はsitemapに含めない。
  // 組み合わせで数百URL生成されるうえ検索需要が乏しく、限られたクロール枠を
  // 食い潰していた（GSC実測: 有効96ページ中42ページがcompare、記事は0ページ）。
  // ページ自体はnoindex+followで残し、ユーザーの回遊導線としては機能させる。

  return [...industryRoutes, ...listRoutes]
}
