import { MetadataRoute } from 'next'
import { fetchRankingDataServer, fetchArticleDataServer } from '@/lib/sheets'
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
    { route: '/articles', priority: 0.8, freq: 'daily' },
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
    priority: 0.8,
  }))

  // 業界別ページのルート
  const industrySet = new Set(
    companies.flatMap((c) => c.industry.split('/').map((i) => i.trim())).filter(Boolean)
  )
  const industryRoutes: MetadataRoute.Sitemap = Array.from(industrySet).map((industry) => ({
    url: `${baseUrl}/industries/${encodeURIComponent(industry)}`,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  // 記事ページのルート（実際の公開日をlastModifiedとして使用）
  const articles = await fetchArticleDataServer()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/articles/${article.id}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return [...staticRoutes, ...industryRoutes, ...companyRoutes, ...articleRoutes]
}
