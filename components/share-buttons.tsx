"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Link as LinkIcon } from "lucide-react"

/**
 * 共有ボタン。
 *
 * 【4つ並んでいた問題】
 * 以前は「LINEで送る」「Xでポスト」「リンクをコピー」を常に並べ、
 * さらに navigator.share が使える環境では「共有」を足していた。
 * スマホはほぼ全て navigator.share に対応しているため、
 * 実質いつも4つのボタンが折り返しながら並ぶ状態だった。
 *
 * 「共有」の中に各SNSが入るのが端末の標準的な作法なので、
 * それが使える環境ではボタンを1つだけ出す。
 * OSの共有シートにはLINEもXも並ぶため、できることは減らない。
 *
 * 対応していない環境（主にPCブラウザ）だけ、
 * 従来どおりLINE・X・コピーを個別に出す。
 * こうすると「同じ機能への入口が二重にある」状態が無くなる。
 */
export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false)
  // 【SSRとの整合】navigator はサーバー側に無いので初期値は false。
  // マウント後に判定することで、サーバーとクライアントで
  // 最初の描画結果が食い違う（hydration error）のを防ぐ。
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

  // スマホ等: OSの共有シートに任せて1つだけ出す
  if (canNativeShare) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="bg-transparent h-8 px-3 text-xs"
        onClick={nativeShare}
      >
        <Share2 className="w-3.5 h-3.5 mr-1" />
        共有する
      </Button>
    )
  }

  // PC等: 共有シートが無いのでリンク先を個別に出す
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
    </div>
  )
}
