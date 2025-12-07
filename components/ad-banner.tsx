"use client"

import { useEffect, useRef } from "react"

const AD_SLOT_ID = "6473201122"

export function AdBanner() {
  const adRef = useRef<HTMLModElement>(null)

  // このuseEffectは、コンポーネントが最初にマウントされた時の一度だけ実行されます。
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error("AdSense script error:", err)
    }
  }, [])

  return (
    // 広告読み込みによるレイアウトシフトを防ぐため、高さをあらかじめ確保します。
    // `key`にAD_SLOT_IDと現在時刻を組み合わせることで、ページ遷移時にコンポーネントが再マウントされ、広告が再描画されることを確実にします。
    <div key={`${AD_SLOT_ID}-${Date.now()}`} className="my-6 text-center pt-6 min-h-[146px] flex flex-col justify-end">
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