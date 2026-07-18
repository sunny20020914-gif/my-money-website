"use client"

import { useState } from "react"
import Image from "next/image"

// 企業ロゴの共通コンポーネント。
// ロゴURLがない場合や読み込みに失敗した場合は、altテキストやプレースホルダー画像を出さず、
// 同じサイズの透明な空白を表示してレイアウトだけ維持する（準備不足感を出さない）。

export function CompanyLogo({
  logo,
  domain,
  company,
  size,
  className,
}: {
  logo?: string
  domain?: string
  company: string
  size: number
  className?: string
}) {
  const src = logo || (domain ? `https://logo.clearbit.com/${domain}` : null)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    // 空白（背景と同化）。サイズ系クラスは引き継ぎ、枠線・背景クラスは外して完全な空白にする
    const blankClass = (className ?? "")
      .split(" ")
      .filter((c) => c !== "border" && !c.startsWith("bg-"))
      .join(" ")
    return <div aria-hidden="true" className={blankClass} />
  }

  return (
    <Image
      src={src}
      alt={`${company}のロゴ`}
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
