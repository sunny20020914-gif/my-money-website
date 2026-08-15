import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

// ------------------------------------------------------------------
// 【オンデマンド再生成】
//
// ISRの間隔を1時間から6〜24時間に延ばしたため、スプレッドシートを
// 更新してもすぐには反映されなくなった。
// すぐ反映したいときはこのエンドポイントを叩く。
//
// 【使い方】
//   https://www.mymoneyweb.com/api/revalidate?secret=（合言葉）
//     → 全ページを次回アクセス時に作り直す
//   https://www.mymoneyweb.com/api/revalidate?secret=（合言葉）&path=/companies/keyence
//     → そのページだけ作り直す
//
// 【準備】Vercelの Settings → Environment Variables に
//   REVALIDATE_SECRET = 好きな長い文字列
// を登録してから再デプロイすること。未設定の間は常に401を返す
// （合言葉が空でも通ってしまう事故を防ぐため）。
//
// 【注意】全体再生成は約290ページ分の書き込みを一度に発生させる。
// 無料枠20万回に対して1回あたり0.15%程度なので日常的な運用には
// 十分だが、更新のたびに何度も叩く必要はない。
// ------------------------------------------------------------------

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")
  const expected = process.env.REVALIDATE_SECRET

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "REVALIDATE_SECRET が未設定です。Vercelの環境変数に登録してください。" },
      { status: 401 },
    )
  }
  if (secret !== expected) {
    return NextResponse.json({ ok: false, message: "合言葉が違います。" }, { status: 401 })
  }

  const path = searchParams.get("path")

  try {
    if (path) {
      revalidatePath(path)
    } else {
      // "layout" を指定すると配下の全ルートが対象になる
      revalidatePath("/", "layout")
    }
    return NextResponse.json({
      ok: true,
      target: path ?? "すべてのページ",
      // 【注意】ここは動的レスポンスなのでISRのキャッシュ対象外。
      // 時刻を返しても課金には影響しない。
      revalidatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "再生成に失敗しました", error: String(error) },
      { status: 500 },
    )
  }
}
