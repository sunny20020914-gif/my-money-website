import { MetadataRoute } from 'next'
import { fetchArticleDataServer, fetchRankingDataServer } from '@/lib/sheets'

const URL = 'https://mymoneyweb.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await fetchArticleDataServer()
  const companies = await fetchRankingDataServer("annual")

  const articleEntries: MetadataRoute.Sitemap = articles.map(({ id, publishedAt }) => ({
    url: `${URL}/articles/${id}`,
    lastModified: new Date(publishedAt),
  }))

  const companyEntries: MetadataRoute.Sitemap = companies.map(({ id }) => ({
    url: `${URL}/companies/${id}`,
    lastModified: new Date(),
  }))

  return [
    { url: URL, lastModified: new Date() },
    { url: `${URL}/ranking`, lastModified: new Date() },
    { url: `${URL}/featured`, lastModified: new Date() },
    { url: `${URL}/articles`, lastModified: new Date() },
    ...articleEntries,
    ...companyEntries,
  ]
}