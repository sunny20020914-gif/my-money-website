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

/**
 * 広告枠。
 *
 * 【空白の枠が残る問題と、その直し方】
 * 以前は枠側に「unfilled なら隠す」という指定を入れていた。
 *   [&:has(ins[data-ad-status='unfilled'])]:hidden
 * しかしこれは AdSense が「広告が無かった」と明示した場合しか効かない。
 *
 * 実際には
 *   ・広告ブロッカーでスクリプト自体が読み込まれない
 *   ・ネットワークエラーで応答が返らない
 *   ・何らかの理由で data-ad-status が付かない
 * といった場合があり、そのときは属性が付かないので条件に当たらず、
 * 「スポンサーリンク」の文字と min-height の空白だけが残っていた。
 *
 * そこで判定を逆にする。
 *   既定 … ラベルも余白も出さない
 *   filled のときだけ … ラベルと余白を出す
 * こうすれば、広告が出ない理由が何であれ、何も表示されない。
 *
 * 【min-height を外した理由】
 * 読み込み中のガタつき（CLS）を防ぐために90pxを確保していたが、
 * この90pxこそが「広告が出ないときの空白」の正体だった。
 * 枠が常に場所を取るのと、出ないときに詰まるのとでは、後者を選ぶ。
 * <ins> 自体は幅を持ったまま残すので、AdSense は従来どおり
 * 枠の横幅を測って広告を要求できる（display:none にすると要求が失敗する）。
 *
 * スタイルの実体は app/globals.css の .ad-slot を参照。
 */
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
    <div key={pathname} className="ad-slot text-center overflow-hidden">
      <p className="ad-slot__label text-xs text-muted-foreground mb-2">スポンサーリンク</p>
      <div className="flex justify-center">
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
