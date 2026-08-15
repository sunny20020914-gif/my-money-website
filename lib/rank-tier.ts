// ------------------------------------------------------------------
// 【順位に応じた見せ方】
//
// ランキングは上位ほど関心が高い。順位の大きさを一律にすると
// どこが上位なのか一目で分からず、スクロールしても単調になる。
// 上位3社を最も大きく、4〜10位をやや大きく、11位以降を控えめにする。
//
// 【なぜ定数にまとめるか】
// 順位バッジを描画しているページが複数ある（指標別ランキング・
// 業界別ページ・条件別一覧）。各ページに直接クラスを書くと、
// サイズを調整するたびに全部を探して直すことになり、
// 見た目が少しずつ食い違っていく。ここ1か所で決める。
//
// 【適用しないページ】
// 初任給ランキング（/ranking）と想定年収ランキング（/ranking/annual）は
// 独自の大きなカード（CompanyCard）を使っており、
// レイアウトが崩れやすいため対象外にしている。
// ------------------------------------------------------------------

export type RankTier = "top3" | "top10" | "normal"

export function rankTier(rank: number): RankTier {
  if (rank <= 3) return "top3"
  if (rank <= 10) return "top10"
  return "normal"
}

/** 順位バッジ（丸）のサイズと配色 */
export const RANK_BADGE: Record<RankTier, string> = {
  top3: "h-12 w-12 md:h-14 md:w-14 text-xl md:text-2xl bg-primary text-primary-foreground shadow-sm",
  top10: "h-10 w-10 md:h-12 md:w-12 text-base md:text-xl bg-primary/15 text-primary",
  normal: "h-9 w-9 md:h-10 md:w-10 text-sm md:text-base bg-muted text-muted-foreground",
}

/** 企業ロゴのサイズ */
export const RANK_LOGO: Record<RankTier, string> = {
  top3: "h-11 w-11 md:h-12 md:w-12",
  top10: "h-10 w-10 md:h-11 md:w-11",
  normal: "h-9 w-9 md:h-10 md:w-10",
}

/** 企業名の文字サイズ */
export const RANK_NAME: Record<RankTier, string> = {
  top3: "text-base md:text-xl",
  top10: "text-base md:text-lg",
  normal: "text-[15px] md:text-base",
}

/** 主要な数値（金額など）の文字サイズ */
export const RANK_VALUE: Record<RankTier, string> = {
  top3: "text-2xl md:text-3xl",
  top10: "text-xl md:text-2xl",
  normal: "text-lg md:text-xl",
}

/** カード自体の余白と枠 */
export const RANK_CARD: Record<RankTier, string> = {
  top3: "p-4 md:p-5 border-primary/30 shadow-sm",
  top10: "p-4 md:p-5 border-primary/20",
  normal: "p-3.5 md:p-4",
}
