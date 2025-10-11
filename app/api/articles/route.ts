import { NextResponse } from "next/server"
import { fetchArticleDataServer } from "@/lib/sheets"

export async function GET() {
  try {
    const data = await fetchArticleDataServer()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] 記事API エラー:", error)
    return NextResponse.json({ error: "記事データの取得に失敗しました" }, { status: 500 })
  }
}
