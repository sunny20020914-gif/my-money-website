import { renderRankingPage } from "../render-ranking"
import { SITE_URL, FISCAL_YEAR, TARGET_GRAD_LABEL } from "@/lib/config"
import type { Metadata } from "next"

// 1時間ごとに最新のデータをスプレッドシートから取得
export const revalidate = 3600

/**
 * 【SEO・テーマ分散の解消】
 * 以前は /ranking の中でタブ切り替えしており、1つのURLに
 * 「初任給」と「想定年収」という2つのテーマが同居していた。
 * 検索エンジンから見るとページの主題が曖昧になり、どちらのキーワードでも
 * 評価が伸びにくい状態だった。
 *
 * 独立したURLにすることで、
 *   /ranking        … 「初任給が高い企業」で勝負
 *   /ranking/annual … 「新卒 年収が高い企業」で勝負
 * と、それぞれが別のキーワードで検索評価を受けられるようになる。
 */
export const metadata: Metadata = {
  title: `【${FISCAL_YEAR}年最新】新卒の年収が高い企業ランキング｜賞与込みの想定年収で比較`,
  description:
    `${TARGET_GRAD_LABEL}向け・新卒1年目の想定年収が高い企業のランキング（${FISCAL_YEAR}年度）。` +
    `月額の初任給だけでなく賞与（ボーナス）まで含めた年収ベースで順位を掲載。` +
    `初任給ランキングとは順位が入れ替わるため、両方の比較が企業選びに役立ちます。`,
  alternates: {
    canonical: `${SITE_URL}/ranking/annual`,
  },
}

export default async function AnnualRankingPage() {
  return renderRankingPage("annual")
}
