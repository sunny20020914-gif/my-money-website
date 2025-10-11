import { NextResponse } from "next/server"
import { fetchRankingDataServer, type RankingType } from "@/lib/sheets"

export const dynamic = "force-dynamic" // キャッシュを無効化

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") as RankingType | null

  // 'type' パラメータが不正な場合は 'annual' をデフォルトとして使用
  const rankingType: RankingType =
    type && ["annual", "monthly", "base"].includes(type) ? type : "annual"

  try {
    const data = await fetchRankingDataServer(rankingType)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API Route Error] /api/ranking:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
