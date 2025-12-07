"use client"

import { useEffect, useRef } from "react"

const AD_SLOT_ID = "6473201122"

export function AdBanner() {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    // 広告がまだ読み込まれていない場合のみリクエスト
    if (adRef.current && adRef.current.getAttribute("data-ad-status") !== "filled") {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("AdSense script error:", err)
      }
    }
  }, [adRef])

  return (
    <div className="my-6 text-center pt-6 min-h-[146px] flex flex-col justify-end">
      <p className="text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      <div className="flex justify-center">
        <ins
          ref={adRef}
          className="adsbygoogle block"
          style={{ width: "100%", maxWidth: "728px", height: "90px" }}
          data-ad-client="ca-pub-2945316858541395"
          data-ad-slot={AD_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}