import { MetadataRoute } from 'next'
import { fetchRankingDataServer, fetchArticleDataServer } from '@/lib/sheets'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.mymoneyweb.com'

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
    lastModified: new Date(),
    changeFrequency: freq as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority,
  }))

  // 企業詳細ページのルート（priorityを0.8に引き上げ）
  const companies = await fetchRankingDataServer('annual')
  const companyRoutes: MetadataRoute.Sitemap = companies.map((company) => ({
    url: `${baseUrl}/companies/${company.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // 業界別ページのルート
  const industrySet = new Set(
    companies.flatMap((c) => c.industry.split('/').map((i) => i.trim())).filter(Boolean)
  )
  const industryRoutes: MetadataRoute.Sitemap = Array.from(industrySet).map((industry) => ({
    url: `${baseUrl}/industries/${encodeURIComponent(industry)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  // 記事ページのルート
  const articles = await fetchArticleDataServer()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/articles/${article.id}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return [...staticRoutes, ...industryRoutes, ...companyRoutes, ...articleRoutes]
}