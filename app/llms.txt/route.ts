import { fetchAllUniqueCompanies, fetchArticleDataServer } from '@/lib/sheets'
import { SITE_URL, SITE_NAME, FISCAL_YEAR } from '@/lib/config'

// 【AI SEO】llms.txt — AIクローラー向けのサイト案内（Markdown形式）。
// sitemapと同様にスプシの取得済みデータから自動生成され、ISRで1時間ごとに更新される。
export const revalidate = 3600

const yen = (v: number | string | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString()}円` : null

export async function GET() {
  const [companies, articles] = await Promise.all([
    fetchAllUniqueCompanies(),
    fetchArticleDataServer(),
  ])

  // 【重要】業界ページの generateStaticParams と同じ母集団（全企業）から集める。
  // ずれると存在しないURLをAIクローラーに案内してしまう。
  const industries = Array.from(
    new Set(
      companies.flatMap((c) => c.industry.split('/').map((i) => i.trim())).filter(Boolean),
    ),
  ).sort()

  const companyLines = companies
    .map((c) => {
      const facts = [
        yen(c.baseMonthly) ? `初任給 月額${yen(c.baseMonthly)}` : null,
        yen(c.annualSalary) ? `想定年収 ${yen(c.annualSalary)}` : null,
      ]
        .filter(Boolean)
        .join('、')
      return `- [${c.company}](${SITE_URL}/companies/${c.id})${facts ? `: ${facts}` : ''}`
    })
    .join('\n')

  const industryLines = industries
    .map((i) => `- [${i}業界 初任給ランキング](${SITE_URL}/industries/${encodeURIComponent(i)})`)
    .join('\n')

  const articleLines = articles
    .map((a) => `- [${a.title}](${SITE_URL}/articles/${a.id})`)
    .join('\n')

  const body = `# ${SITE_NAME}

> 就活生のための初任給・年収ランキングサイト。${FISCAL_YEAR}年度の日本の大手企業${companies.length}社の初任給（月額）・想定年収・従業員数を、業界別に比較できます。データは定期的に更新されています。

## 主要ページ

- [初任給・年収ランキング一覧](${SITE_URL}/ranking): 全${companies.length}社の初任給・想定年収・基本給ランキング
- [業界別ランキング](${SITE_URL}/industries)
- [記事一覧](${SITE_URL}/articles): 就活・給与に関する解説記事
- [サイトについて](${SITE_URL}/about)

## 業界別ランキング

${industryLines}

## 企業詳細ページ

各ページに初任給・想定年収・従業員数・設立年・企業概要・強み・将来性・FAQを掲載しています。

${companyLines}

## 記事

${articleLines}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
