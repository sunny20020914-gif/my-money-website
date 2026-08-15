"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"

// ------------------------------------------------------------------
// 【アンカー広告（画面下部固定）】
//
// AdSenseのインプレッション単価は「実際に画面に表示されたか」で
// 大きく変わる。実測の視認可能率は57.91%で、記事の途中に置いた枠の
// 多くがスクロールされずに終わっている。
//
// 画面下部に固定する枠は、スクロール位置に関係なく常に見えるため
// 視認可能率がほぼ100%になり、サイト全体の平均を押し上げる。
// 枠を増やさずに単価だけを上げたい場合、最も費用対効果が高い。
//
// 【ポリシー面で必ず守ること】
// ・閉じるボタンを付ける（閉じられない固定広告は違反）
// ・コンテンツに重ならないよう、本文側に同じ高さの余白を確保する
// ・1画面に固定広告は1つまで
// この3点を満たさないとアカウントに影響が出るため、
// 変更するときは必ず確認すること。
//
// 【自動広告との関係】
// AdSense管理画面の自動広告でもアンカー広告は出せる。
// 両方を有効にすると画面下部に2つ重なる可能性があるため、
// このコンポーネントを使う場合は自動広告側のアンカーはオフにすること。
// ------------------------------------------------------------------

const AD_CLIENT_ID = "ca-pub-2945316858541395"
const AD_SLOT_ID = "6473201122"

/** 閉じた状態を記憶するキー。タブを閉じるまで有効 */
const DISMISS_KEY = "anchor-ad-dismissed"

export function AnchorAd() {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(true) // SSRでは出さない（ちらつき防止）
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // sessionStorage はサーバー側に存在しないため、マウント後に読む
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setDismissed(false)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || dismissed) return
    try {
      ;(window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []
      ;((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle).push({})
    } catch (err) {
      console.error("adsbygoogle.push() error:", err)
    }
  }, [ready, dismissed, pathname])

  const close = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // プライベートブラウジング等で書き込めない場合は無視
    }
  }

  if (!ready || dismissed) return null

  return (
    <>
      {/* 本文が固定枠に隠れないよう、同じ高さの余白を確保する。
          これが無いとページ末尾のリンクやボタンが押せなくなる。 */}
      <div aria-hidden className="h-[62px] md:h-[74px]" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="relative mx-auto flex max-w-4xl items-center justify-center px-2 py-1">
          <button
            type="button"
            onClick={close}
            aria-label="広告を閉じる"
            className="absolute -top-7 right-2 flex h-7 items-center gap-1 rounded-t-md border border-b-0 bg-background px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            閉じる
          </button>
          {/* 高さを先に確保しておくことで、広告の読み込みで
              画面がガタつく（CLS）のを防ぐ */}
          <div className="flex min-h-[50px] md:min-h-[60px] w-full items-center justify-center overflow-hidden">
            <ins
              key={pathname}
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "50px" }}
              data-ad-client={AD_CLIENT_ID}
              data-ad-slot={AD_SLOT_ID}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      </div>
    </>
  )
}
