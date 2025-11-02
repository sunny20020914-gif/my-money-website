import { NextResponse } from "next/server"
import { fetchRankingDataServer } from "@/lib/sheets"
import type { RankingType } from "@/lib/sheets"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = (searchParams.get("type") as RankingType) || "annual"

  try {
    const data = await fetchRankingDataServer(type)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`[API] ランキングデータ取得エラー (type: ${type}):`, error)
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 },
    )
  }
}