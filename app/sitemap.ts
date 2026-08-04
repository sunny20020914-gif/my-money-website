import { MetadataRoute } from 'next'
import { fetchRankingDataServer, fetchArticleDataServer, fetchAllUniqueCompanies } from '@/lib/sheets'
import { buildAllListDefinitions } from '@/lib/list-definitions'
import { SITE_URL } from '@/lib/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL

  // 【SEO】lastModified に毎回 new Date() を入れると「全ページが常に更新されている」
  // という嘘のシグナルになり、クローラーからの信頼を失う。
  // 実際の更新日が分からないページは lastModified を省略し、
  // 更新日が分かる記事ページのみ publishedAt を使う。

  // 静的なページのルート
  const staticRoutes: MetadataRoute.Sitemap = [
    { route: '/', priority: 1.0, freq: 'daily' },
    { route: '/ranking', priority: 0.9, freq: 'daily' },
    { route: '/industries', priority: 0.9, freq: 'weekly' },
    { route: '/featured', priority: 0.8, freq: 'weekly' },
    { route: '/articles', priority: 0.95, freq: 'daily' },
    { route: '/lists', priority: 0.85, freq: 'weekly' },
    { route: '/simulator', priority: 0.8, freq: 'monthly' },
    { route: '/about', priority: 0.5, freq: 'monthly' },
    { route: '/privacy', priority: 0.3, freq: 'monthly' },
    { route: '/terms', priority: 0.3, freq: 'monthly' },
  ].map(({ route, priority, freq }) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: freq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority,
  }))

  // 企業詳細ページのルート
  const companies = await fetchRankingDataServer('annual')
  const companyRoutes: MetadataRoute.Sitemap = companies.map((company) => ({
    url: `${baseUrl}/companies/${company.id}`,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  // 業界別ページのルート
  // 【重要】業界ページ（/industries/[industry]）の generateStaticParams と
  // 必ず同じ母集団（fetchAllUniqueCompanies）から業界名を集めること。
  // 母集団がずれると「sitemapには載るがページは404」という不整合が起きる。
  const allCompaniesForIndustries = await fetchAllUniqueCompanies()
  const industrySet = new Set(
    allCompaniesForIndustries
      .flatMap((c) => c.industry.split('/').map((i) => i.trim()))
      .filter(Boolean)
  )
  const industryRoutes: MetadataRoute.Sitemap = Array.from(industrySet).map((industry) => ({
    url: `${baseUrl}/industries/${encodeURIComponent(industry)}`,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  // クロス条件一覧ページのルート（データから動的生成・有効な組み合わせのみ）
  const allCompanies = await fetchAllUniqueCompanies()
  const listRoutes: MetadataRoute.Sitemap = buildAllListDefinitions(allCompanies).map((def) => ({
    url: `${baseUrl}/lists/${encodeURIComponent(def.slug)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // 【重要・クロールバジェット対策】企業比較ページ（/compare）はsitemapに含めない。
  // 組み合わせで数百URL生成されるうえ検索需要が乏しく、新規ドメインの限られたクロール枠を
  // 食い潰していた（GSC実測: 有効96ページ中42ページがcompare、一方で記事は0ページ）。
  // ページ自体はnoindex+followで残し、ユーザーの回遊導線としては引き続き機能する。

  // 記事ページのルート（実際の公開日をlastModifiedとして使用）
  // 記事は唯一の独自コンテンツのため最優先でクロールさせる
  const articles = await fetchArticleDataServer()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/articles/${article.id}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 1.0,
  }))

  // 【クロール優先順位】記事 → 企業 → 業界 → 条件一覧 の順に並べる。
  // sitemapの記載順もクロール順序のヒントになるため、価値の高いページを先頭に置く。
  return [...staticRoutes, ...articleRoutes, ...companyRoutes, ...industryRoutes, ...listRoutes]
}
