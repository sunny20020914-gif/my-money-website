"use client"

import { useEffect } from "react"

export function AdBanner() {
  useEffect(() => {
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error("AdSense script error:", err)
    }
  }, [])

  return (
    <div className="my-6 text-center">
      <p className="text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      <div className="flex justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", maxWidth: "728px", height: "90px" }}
          data-ad-client="ca-pub-2945316858541395"
          data-ad-slot="6473201122" // ここにAdSenseで発行した広告ユニットのスロットIDを入力してください
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}

export default AdBanner