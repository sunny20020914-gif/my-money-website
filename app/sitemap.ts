import { MetadataRoute } from 'next'
import { fetchRankingDataServer, fetchArticleDataServer } from '@/lib/sheets'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.mymoneyweb.com'

  // 静的なページのルート
  const staticRoutes: MetadataRoute.Sitemap = [
    '/',
    '/ranking',
    '/industry-analysis',
    '/featured',
    '/articles',
    '/about',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.8,
  }))

  // 企業詳細ページのルート
  const companies = await fetchRankingDataServer('annual')
  const companyRoutes: MetadataRoute.Sitemap = companies.map((company) => ({
    url: `${baseUrl}/companies/${company.id}`,
    lastModified: new Date(), // 本来は更新日を入れるべき
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // 記事ページのルート
  const articles = await fetchArticleDataServer()
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/articles/${article.id}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  return [...staticRoutes, ...companyRoutes, ...articleRoutes]
}