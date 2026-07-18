"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { History } from "lucide-react"

// 閲覧履歴（最近見た企業）。localStorageのみで完結し、会員登録は不要。
// 企業ページ表示時に現在の企業を記録し、それ以外の履歴を表示して回遊を促す。

export type RecentCompany = {
  id: string
  name: string
  monthly?: number | null
}

const STORAGE_KEY = "mmw_recent_companies"
const MAX_STORED = 10
const MAX_SHOWN = 6

export function RecentlyViewed({ current }: { current: RecentCompany }) {
  const [others, setOthers] = useState<RecentCompany[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const list: RecentCompany[] = raw ? JSON.parse(raw) : []
      const valid = Array.isArray(list) ? list.filter((c) => c && typeof c.id === "string") : []

      // 表示: 現在の企業を除いた直近の履歴
      setOthers(valid.filter((c) => c.id !== current.id).slice(0, MAX_SHOWN))

      // 記録: 現在の企業を先頭に（重複排除・上限あり）
      const next = [
        { id: current.id, name: current.name, monthly: current.monthly ?? null },
        ...valid.filter((c) => c.id !== current.id),
      ].slice(0, MAX_STORED)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage不可の環境では何もしない
    }
    // 企業が切り替わったときだけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id])

  if (others.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base md:text-lg font-bold">
        <History className="w-4 h-4 text-primary" />
        最近見た企業
      </h2>
      <div className="flex flex-wrap gap-2">
        {others.map((c) => (
          <Link
            key={c.id}
            href={`/companies/${c.id}`}
            className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm hover:bg-accent transition-colors"
          >
            <span className="font-semibold">{c.name}</span>
            {typeof c.monthly === "number" && (
              <span className="text-xs text-muted-foreground">¥{c.monthly.toLocaleString()}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
