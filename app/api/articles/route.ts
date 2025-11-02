import { NextResponse } from "next/server"
import { fetchArticleDataServer } from "@/lib/sheets"

// このルートはデフォルトで静的に評価されますが、
// fetchArticleDataServer内のfetchがrevalidateオプションを持つため、
// ISR (Incremental Static Regeneration) として動作します。
export async function GET() {
  try {
    const data = await fetchArticleDataServer()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] 記事API エラー:", error)
    return NextResponse.json({ error: "記事データの取得に失敗しました" }, { status: 500 })
  }
}
