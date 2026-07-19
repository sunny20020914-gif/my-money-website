"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Link as LinkIcon } from "lucide-react"

// 共有ボタン（LINE・X・リンクコピー・OS共有）。
// 就活生の情報共有はLINEグループ経由が多く、スマホからの流入起点になる。

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボード不可の環境では何もしない
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title: text, url })
    } catch {
      // キャンセル時は何もしない
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm" className="bg-transparent h-8 px-3 text-xs">
        <a href={lineUrl} target="_blank" rel="noopener noreferrer">LINEで送る</a>
      </Button>
      <Button asChild variant="outline" size="sm" className="bg-transparent h-8 px-3 text-xs">
        <a href={xUrl} target="_blank" rel="noopener noreferrer">Xでポスト</a>
      </Button>
      <Button variant="outline" size="sm" className="bg-transparent h-8 px-3 text-xs" onClick={copyLink}>
        {copied ? <><Check className="w-3.5 h-3.5 mr-1" />コピーしました</> : <><LinkIcon className="w-3.5 h-3.5 mr-1" />リンクをコピー</>}
      </Button>
      {canNativeShare && (
        <Button variant="outline" size="sm" className="bg-transparent h-8 px-3 text-xs" onClick={nativeShare}>
          <Share2 className="w-3.5 h-3.5 mr-1" />共有
        </Button>
      )}
    </div>
  )
}
