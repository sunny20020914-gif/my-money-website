"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import type { CompanyData, ArticleData, RankingType } from "@/lib/sheets"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useRankingData(rankingType: RankingType = "annual") {
  const { data, error, isLoading, mutate } = useSWR<CompanyData[]>(`/api/ranking?type=${rankingType}`, fetcher, {
    revalidateOnFocus: false,
  })

  return {
    data: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refreshData: mutate,
  }
}
 
 export function useArticleData() {
  const [data, setData] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/articles", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("記事データの取得に失敗しました")
      }

      const articleData = await response.json()
      setData(articleData)
      setError(null)
    } catch (err) {
      setError("記事データの取得に失敗しました")
      console.error("[v0] 記事データ取得エラー:", err)
    } finally {
      setLoading(false)
    }
  }, []);
 
  useEffect(() => {
    fetchData()
  }, [fetchData]);
 
  return { data, loading, error, refreshData: fetchData };
}
