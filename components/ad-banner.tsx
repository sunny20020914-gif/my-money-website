"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const AD_SLOT_ID = "6473201122"

export function AdBanner() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      // window.adsbygoogleが存在しない場合は何もしない
      if (typeof window !== "undefined") {
        const adsbygoogle = (window as any).adsbygoogle || []
        // AdSenseに「新しく広告枠ができたよ」と通知して流し込ませる
        adsbygoogle.push({})
      }
    } catch (err) {
      // 既に枠が埋まっている場合などのエラーは無視してOK
      console.error("adsbygoogle.push() error:", err)
    }
  }, [pathname]) // pathnameが変わる（＝ページ遷移する）たびに実行

  return (
    <div
      // 🌟 【超重要】pathnameをkeyにすることで、Reactが自動的に古い枠を破棄し、真っ更な枠を作り直してくれます。
      // これにより innerHTML の手動クリアなどのハックが一切不要になります。
      key={pathname}
      
      // 🌟 Tailwindの :has 擬似クラスを使用。
      // 「もし中の広告が unfilled（在庫なし）になったら、このdiv（スポンサーリンクの文字含む）ごと非表示にする」という魔法のクラスです。
      className="mt-6 mb-2 text-center flex flex-col justify-end overflow-hidden [&:has(ins[data-ad-status='unfilled'])]:hidden"
    >
      <p className="text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      
      {/* 最小の高さを設定してレイアウトのガタつき（CLS）を防止 */}
      <div className="flex justify-center min-h-[90px]">
        <ins
          className="adsbygoogle"
          // 🌟 heightの固定を外し、ブロック要素として幅100%を確保（auto設定と競合させない）
          style={{ display: "block", width: "100%" }}
          data-ad-client="ca-pub-2945316858541395"
          data-ad-slot={AD_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}