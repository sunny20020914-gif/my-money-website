"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import type { CompanyData, ArticleData, RankingType } from "@/lib/sheets"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useRankingData(rankingType: RankingType = "annual", options?: { fallbackData?: CompanyData[] }) {
  const { data, error, isLoading, mutate } = useSWR<CompanyData[]>(`/api/ranking?type=${rankingType}`, fetcher, {
    revalidateOnFocus: false,
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
