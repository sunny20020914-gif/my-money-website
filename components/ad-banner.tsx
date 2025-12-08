"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

const AD_SLOT_ID = "6473201122"

export function AdBanner() {
  const insRef = useRef<HTMLModElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    // 広告スロットをリセット
    if (insRef.current) {
      insRef.current.innerHTML = ""
      // AdSenseが追加する可能性のある属性を削除してクリーンな状態に戻す
      insRef.current.removeAttribute("data-ad-status")
      insRef.current.removeAttribute("data-ad-format")
      insRef.current.removeAttribute("data-full-width-responsive")
    }

    // わずかな遅延を設けてから広告を再プッシュする
    const timeout = setTimeout(() => {
      try {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("adsbygoogle.push() error:", err)
      }
    }, 50) // 50ミリ秒の遅延

    return () => clearTimeout(timeout)
  }, [pathname]) // pathnameが変わるたびにエフェクトを再実行

  return (
    <div className="my-6 text-center pt-6 flex min-h-[128px] flex-col justify-end">
      <p className="text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      <div className="flex justify-center">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', maxWidth: '728px', height: '90px' }}
          data-ad-client="ca-pub-2945316858541395"
          data-ad-slot={AD_SLOT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  )
}