import { Suspense } from "react"
import { fetchRankingDataServer } from "@/lib/sheets"
import { buildRankingSummary, buildRankingFaq } from "@/lib/ranking-summary"
import { RankingPageClient } from "./ranking-page-client"
import { FISCAL_YEAR, TARGET_GRAD_LABEL } from "@/lib/config"
import type { Metadata } from 'next'

// 1時間ごとに最新のデータをスプレッドシートから取得
export const revalidate = 3600

export const metadata: Metadata = {
  // 年度・卒業年度はすべて lib/config.ts の FISCAL_YEAR から導出する。
  // 年度更新時に文言を直して回る必要がなく、表記のずれも起きない。
  title: `【${FISCAL_YEAR}年最新】新卒初任給・年収ランキング一覧 | ${TARGET_GRAD_LABEL}の企業比較`,
  description: `${TARGET_GRAD_LABEL}の就活生向け・新卒初任給ランキング（${FISCAL_YEAR}年度実績）。上場企業・成長企業の新卒初任給（月額）・想定年収・従業員数を一覧比較。業界別に絞り込めて、新卒の企業選びにそのまま使えます。`,
  alternates: {
    canonical: "https://www.mymoneyweb.com/ranking",
  },
}

export default async function RankingPage() {
  try {
    const initialData = await fetchRankingDataServer("monthly")

    // C列の業界データを抽出し、重複を除いたリストを作成
    const allIndustries = initialData.flatMap(company => company.industry.split('/')).filter(Boolean);
    const uniqueIndustries = Array.from(new Set(allIndustries)).sort();

    // 【SEO】冒頭サマリー用の集計（平均・中央値・業種別平均＝独自データ）
    const summary = buildRankingSummary(initialData)
    const updatedLabel = new Date().toLocaleDateString("ja-JP")

    const itemListLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `初任給ランキング ${FISCAL_YEAR}`,
      description: `${FISCAL_YEAR}年度 新卒初任給ランキング（月額）`,
      numberOfItems: initialData.length,
      itemListElement: initialData.map((company, i) => ({
        "@type": "ListItem",
        position: company.rank || i + 1,
        name: company.company,
        url: `https://www.mymoneyweb.com/companies/${company.id}`,
      })),
    }

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: "https://www.mymoneyweb.com/" },
        { "@type": "ListItem", position: 2, name: "初任給・年収ランキング", item: "https://www.mymoneyweb.com/ranking" },
      ],
    }

    // 【SEO】FAQリッチリザルト用。クライアント側で表示するFAQと
    // 同じ関数・同じ入力から生成しているため、内容は必ず一致する。
    const faq = buildRankingFaq(summary, FISCAL_YEAR)
    const faqLd = faq.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    } : null

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
        {/* クライアント側で useSearchParams（?type=annual の読み取り）を使うため
            Suspense で包む必要がある。これが無いとビルド時に
            「useSearchParams should be wrapped in a suspense boundary」で失敗する。
            包むことでページ自体は静的生成のまま維持できる。 */}
        <Suspense fallback={null}>
          <RankingPageClient initialData={initialData} initialError={null} industryList={uniqueIndustries} summary={summary} updatedLabel={updatedLabel} />
        </Suspense>
      </>
    )
  } catch (error) {
    console.error("[v0] ランキングページデータの取得に失敗:", error)
    return (
      <Suspense fallback={null}>
        <RankingPageClient initialData={[]} initialError="データの取得に失敗しました。後でもう一度お試しください。" industryList={[]} summary={null} updatedLabel="" />
      </Suspense>
    )
  }
}