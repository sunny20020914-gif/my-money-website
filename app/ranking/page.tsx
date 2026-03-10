import { RankingPageClient } from "./ranking-page-client"
import { fetchRankingDataServer } from "@/lib/sheets"
import type { Metadata } from 'next'

// 1時間（3600秒）ごとにデータを再検証して更新する設定（ISR）
export const revalidate = 3600

export const metadata: Metadata = {
  title: "初任給・年収ランキング一覧 | 日本企業初任給ランキング 2026",
  description: "日本の大手企業の初任給と想定年収を業界別・職種別で詳細比較。最新の給与データと企業情報を提供します。",
}

export default async function RankingPage() {
  try {
    const initialData = await fetchRankingDataServer("monthly")

    // C列の業界データを抽出し、重複を除いたリストを作成
    const allIndustries = initialData.flatMap(company => company.industry.split('/')).filter(Boolean);
    const uniqueIndustries = Array.from(new Set(allIndustries)).sort();

    return <RankingPageClient initialData={initialData} initialError={null} industryList={uniqueIndustries} />
  } catch (error: any) {
    console.error("Failed to fetch initial ranking data:", error)
    return <RankingPageClient initialData={[]} initialError={error.message || "サーバーでデータ取得中にエラーが発生しました。"} industryList={[]} />
  }
}
