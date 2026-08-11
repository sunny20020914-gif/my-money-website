import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  // 【AI SEO】主要なAIクローラーを明示的に許可する。
  // ChatGPT検索・Perplexity・Claude・Google AI Overviews等からの
  // 引用（＝新しい流入経路）を最大化するため。
  const aiBots = [
    'GPTBot', // OpenAI（学習）
    'OAI-SearchBot', // ChatGPT検索
    'ChatGPT-User', // ChatGPTのブラウジング
    'ClaudeBot', // Anthropic
    'Claude-SearchBot', // Claude検索
    'anthropic-ai',
    'PerplexityBot', // Perplexity
    'Google-Extended', // Google Gemini / AI Overviews
    'CCBot', // Common Crawl（多くのLLMの学習データ源）
    'meta-externalagent', // Meta AI
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/saved'],
      },
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow: ['/admin', '/api/', '/saved'],
      })),
    ],
    // 【sitemap分割後】generateSitemaps により /sitemap/0.xml 〜 /sitemap/3.xml が生成される。
    // 種類別に列挙して、Googleが企業ページ用sitemapを個別に処理できるようにする。
    sitemap: [
      `${SITE_URL}/sitemap/0.xml`, // 主要ページ・卒年別
      `${SITE_URL}/sitemap/1.xml`, // 企業詳細
      `${SITE_URL}/sitemap/2.xml`, // 記事
      `${SITE_URL}/sitemap/3.xml`, // 業界・条件一覧
    ],
  }
}
