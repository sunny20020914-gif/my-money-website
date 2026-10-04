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

  // 【クロールバジェット】/compare を取得させない。
  //
  // 比較ページは全ペアが noindex だが、noindex は「取得して初めて分かる」指示なので、
  // Googlebot は毎回ページを取りに来ていた。しかも
  //   ・generateStaticParams が空のためオンデマンドSSR（Sheets API を伴う）
  //   ・比較ページ自身がさらに最大6本の比較ページへリンク
  //   ・企業詳細ページからも1社につき3本
  // という構造で、到達可能なURLは数百本規模（理論上は185×184/2＝17,020本）。
  //
  // 一方で企業詳細115本は Search Console 上で「一度もクロールされていない」。
  // 限られたクロール枠が、インデックスされないページに流れていた。
  //
  // robots.txt で止めれば取得自体が発生しない。
  // 既に全ページ noindex 済みなので「noindex を読めなくなる」副作用も実質無い。
  const DISALLOW = ['/admin', '/api/', '/saved', '/compare/']

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow: DISALLOW,
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
