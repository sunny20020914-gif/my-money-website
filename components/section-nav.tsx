"use client"

import { useEffect, useState } from "react"

/**
 * ページ内の目次（アンカーリンク）。
 *
 * 【タブではなくアンカーにした理由】
 * OpenWork のようなタブ切り替えも検討したが、あちらはタブごとに
 * URLが分かれている（別ページを読み込む）作りで、同じ構成にすると
 * 159社 × 5タブ ＝ 795ページに増える。
 * このサイトは企業詳細ページのインデックスがまだ進んでおらず、
 * ページ数を増やすとクロールがさらに薄まるため採用しなかった。
 *
 * アンカーなら
 *   ・URLは1つのまま（クロールの分散が起きない）
 *   ・サーバー側描画のまま実装できる
 *   ・上から順に読むこともできる
 * という利点があり、見た目の使い勝手はタブに近い。
 *
 * 表示中のセクションを IntersectionObserver で判定して印を付ける。
 */
export interface SectionNavItem {
  id: string
  label: string
}

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    // 画面上部（ヘッダーの下）に入ったセクションを「現在地」とする。
    // rootMargin の下側を大きく負にして、画面の上1/3だけを判定範囲にしている。
    // こうしないと複数のセクションが同時に交差して印が飛び回る。
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-80px 0px -66% 0px", threshold: 0 },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <nav
      aria-label="ページ内の目次"
      /* sticky にして、読み進めても現在地と移動先が常に見える状態にする。
         top-0 だとサイトヘッダーに隠れるため、その高さぶん下げる。 */
      className="sticky top-14 z-20 -mx-5 mb-2 border-y bg-background/95 px-5 py-2 backdrop-blur sm:-mx-6 sm:px-6"
    >
      {/* 横スクロールで全項目に届くようにする。
          折り返して2段になるとページ上部を占有しすぎるため。 */}
      <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={activeId === item.id ? "true" : undefined}
              className={`inline-block rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                activeId === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
