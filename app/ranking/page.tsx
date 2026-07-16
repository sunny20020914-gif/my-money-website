import { fetchRankingDataServer } from "@/lib/sheets"
import { buildRankingSummary } from "@/lib/ranking-summary"
import { RankingPageClient } from "./ranking-page-client"
import type { Metadata } from 'next'

// 1時間ごとに最新のデータをスプレッドシートから取得
export const revalidate = 3600

export const metadata: Metadata = {
  title: "【2026年最新】初任給・年収ランキング一覧 | 新卒給与を企業比較",
  description: "2026年度版・新卒初任給ランキング。上場企業・成長企業の初任給（月額）・想定年収・従業員数を一覧比較。業界別に絞り込んで、自分に合った企業を探せます。",
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
      name: "初任給ランキング 2026",
      description: "2026年度 新卒初任給ランキング（月額）",
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

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <RankingPageClient initialData={initialData} initialError={null} industryList={uniqueIndustries} summary={summary} updatedLabel={updatedLabel} />
      </>
    )
  } catch (error) {
    console.error("[v0] ランキングページデータの取得に失敗:", error)
    return <RankingPageClient initialData={[]} initialError="データの取得に失敗しました。後でもう一度お試しください。" industryList={[]} summary={null} updatedLabel="" />
  }
}