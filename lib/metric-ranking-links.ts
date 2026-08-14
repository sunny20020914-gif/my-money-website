// ------------------------------------------------------------------
// 指標別ランキングの「リンク情報だけ」を持つ軽量モジュール。
//
// 【なぜ分けるか】
// lib/metric-rankings.ts には集計・順位付け・相関計算・分析文の生成まで
// 入っており、それなりのコード量がある。
// ランキングページのクライアントコンポーネントからナビを出すために
// あちらを import すると、集計ロジック一式がクライアントバンドルに
// 載ってしまう（実行されないコードでも配信はされる）。
//
// ナビに必要なのはパスとラベルだけなので、ここに切り出して
// クライアント側はこのファイルだけを参照する。
// lib/metric-rankings.ts もこの定義を使うため、二重管理にはならない。
// ------------------------------------------------------------------

export type MetricSlug = "growth" | "average" | "profit-per-employee" | "margin"

export interface MetricRankingLink {
  slug: MetricSlug
  path: string
  /** 切り替えナビなどに出す短い名前 */
  shortLabel: string
}

/** 表示順。伸び率→平均年収→稼ぐ力→収益性、と就活生の関心が高い順に並べる */
export const METRIC_RANKING_LINKS: MetricRankingLink[] = [
  { slug: "growth", path: "/ranking/growth", shortLabel: "伸び率" },
  { slug: "average", path: "/ranking/average", shortLabel: "平均年収" },
  { slug: "profit-per-employee", path: "/ranking/profit-per-employee", shortLabel: "一人当たり利益" },
  { slug: "margin", path: "/ranking/margin", shortLabel: "営業利益率" },
]
