"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

const AD_CLIENT_ID = "ca-pub-2945316858541395"
const AD_SLOT_ID = "6473201122"

export function AdBanner() {
  const pathname = usePathname()

  // ページ遷移ごとに、その枠の広告読み込みをAdSenseに要求する
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error("adsbygoogle.push() error:", err)
    }
  }, [pathname])

  return (
    // pathnameをkeyにして遷移ごとに枠を再マウントし、古い広告枠を確実に破棄する
    <div
      key={pathname}
      className="mt-6 mb-2 text-center flex flex-col justify-end overflow-hidden [&:has(ins[data-ad-status='unfilled'])]:hidden"
    >
      <p className="text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      {/* 広告読み込み前のレイアウトのガタつき（CLS）を防止する最小高さ */}
      <div className="flex justify-center min-h-[90px]">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client={AD_CLIENT_ID}
          data-ad-slot={AD_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  )
}