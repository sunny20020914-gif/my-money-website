// ------------------------------------------------------------------
// ランキングページの「リンク情報だけ」を持つ軽量モジュール。
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
// ------------------------------------------------------------------

/**
 * 単一の指標で並べるランキング。
 * lib/metric-rankings.ts の buildMetricRanking がまとめて処理する。
 */
export type MetricSlug = "growth" | "average" | "profit-per-employee" | "margin"

/**
 * ナビに並ぶランキング全体。
 * balanced（初任給×平均年収の両立）は2変数を合成する専用ロジックのため、
 * 単一指標の枠組み（MetricSlug）には含めず別扱いにしている。
 */
export type RankingSlug = MetricSlug | "balanced"

/** buildMetricRanking で生成できる単一指標ランキングの一覧 */
export const METRIC_SLUGS: MetricSlug[] = [
  "growth",
  "average",
  "profit-per-employee",
  "margin",
]

export interface RankingLink {
  slug: RankingSlug
  path: string
  /** 切り替えナビなどに出す短い名前 */
  shortLabel: string
}

/**
 * 表示順。
 * 「初任給×年収」を先頭に置く。初任給ランキングを見た読者が次に知りたいのは
 * 「その企業は入社後も高いのか」であり、その問いに直接答えるページだから。
 */
export const METRIC_RANKING_LINKS: RankingLink[] = [
  { slug: "balanced", path: "/ranking/balanced", shortLabel: "初任給×年収" },
  { slug: "growth", path: "/ranking/growth", shortLabel: "伸び率" },
  { slug: "average", path: "/ranking/average", shortLabel: "平均年収" },
  { slug: "profit-per-employee", path: "/ranking/profit-per-employee", shortLabel: "一人当たり利益" },
  { slug: "margin", path: "/ranking/margin", shortLabel: "営業利益率" },
]
