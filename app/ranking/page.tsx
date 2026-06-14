import { fetchRankingDataServer } from "@/lib/sheets"
import { RankingPageClient } from "./ranking-page-client"
import type { Metadata } from 'next'

// 1時間ごとに最新のデータをスプレッドシートから取得
export const revalidate = 3600

export const metadata: Metadata = {
  title: "【2026年最新】初任給・年収ランキング一覧",
  description: "「新卒からいくら稼げる？」気になる企業の初任給や想定年収をリアルタイム検索！業界別・職種別の詳細データから、あなたの目指すキャリアプランに役立つ情報をお届けします。",
}

export default async function RankingPage() {
  try {
    const initialData = await fetchRankingDataServer("monthly")

    // C列の業界データを抽出し、重複を除いたリストを作成
    const allIndustries = initialData.flatMap(company => company.industry.split('/')).filter(Boolean);
    const uniqueIndustries = Array.from(new Set(allIndustries)).sort();

    return <RankingPageClient initialData={initialData} initialError={null} industryList={uniqueIndustries} />
  } catch (error) {
    console.error("[v0] ランキングページデータの取得に失敗:", error)
    return <RankingPageClient initialData={[]} initialError="データの取得に失敗しました。後でもう一度お試しください。" industryList={[]} />
  }
}