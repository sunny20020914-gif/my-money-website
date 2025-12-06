"use client"

import { useEffect, useRef } from "react"

const AD_SLOT_ID = "6473201122"

export function AdBanner() {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 広告スロットが空の場合のみ広告をリクエスト
    if (adRef.current && adRef.current.children.length === 0) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("AdSense script error:", err)
      }
    }
  }, [])

  return (
    <div className="my-6 text-center pt-6">
      <p className="text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      <div ref={adRef} className="flex justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", maxWidth: "728px", height: "90px" }}
          data-ad-client="ca-pub-2945316858541395"
          data-ad-slot={AD_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}