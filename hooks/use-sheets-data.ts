"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import type { CompanyData, ArticleData, RankingType } from "@/lib/sheets"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useRankingData(rankingType: RankingType = "annual", options?: { fallbackData?: CompanyData[] }) {
  const { data, error, isLoading, mutate } = useSWR<CompanyData[]>(`/api/ranking?type=${rankingType}`, fetcher, {
    revalidateOnFocus: false,
    // 【転送量削減】サーバーが初期データ（fallbackData）を埋め込んでいるページでは、
    // マウント直後に同じ全件データを /api/ranking から取り直さない。
    // 4,000社規模では1訪問あたり数MBの二重転送とAPI呼び出しの無駄になる。
    // fallback の無い呼び出し（別種別への切替等）は従来どおり取得する。
    ...(options?.fallbackData ? { revalidateOnMount: false } : {}),
    ...options,
  })

  return {
    data: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refreshData: mutate,
  }
}
 
export function useArticleData() {
  const { data, error, isLoading, mutate } = useSWR<ArticleData[]>("/api/articles", fetcher, {
    revalidateOnFocus: false,
  })

  return {
    data: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refreshData: mutate,
  }
}
