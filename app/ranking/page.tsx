import { renderRankingPage } from "./render-ranking"
import { SITE_URL, FISCAL_YEAR, TARGET_GRAD_LABEL, REVALIDATE_FRESH } from "@/lib/config"
import { MARKET_BENCHMARK } from "@/lib/market-benchmark"
import type { Metadata } from "next"

export const revalidate = REVALIDATE_FRESH

export const metadata: Metadata = {
  // 【SEO】「初任給ランキング」単体は東洋経済・日経・大手就活サイトが上位を占める激戦区。
  // 当サイトは高待遇企業に絞ったデータセットなので、
  // 「初任給が高い企業」という一段具体的な検索意図に寄せた方が勝ち目がある。
  // 年度・卒業年度は lib/config.ts の FISCAL_YEAR から導出し、更新漏れを防ぐ。
  title: `【${FISCAL_YEAR}年最新】初任給が高い企業ランキング｜月30万円超の高待遇企業を比較`,
  description:
    `${TARGET_GRAD_LABEL}向け・初任給が高い企業のランキング（${FISCAL_YEAR}年度）。` +
    `大学卒の全国平均${MARKET_BENCHMARK.universityGraduate.toLocaleString()}円を大きく上回る高待遇企業を厳選して掲載。` +
    `手取り額の目安、入社後の平均年収までの伸び、業界別の傾向まで解説しています。`,
  alternates: {
    canonical: `${SITE_URL}/ranking`,
  },
}

export default async function RankingPage() {
  return renderRankingPage("monthly")
}
