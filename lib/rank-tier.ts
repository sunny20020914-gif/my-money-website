// ------------------------------------------------------------------
// 【順位バッジの大きさ】
//
// ランキングは上位ほど関心が高いので、順位の数字を上位ほど大きく見せる。
// 1〜3位を最も大きく、4〜10位をやや大きく、11位以降を通常サイズにする。
//
// 【重要・変えるのは順位バッジだけ】
// 以前はカードの余白・ロゴ・社名・数値まで順位に連動させていたが、
// 11位以降のカードが小さくなって余白が詰まり、窮屈な見た目になった。
// カードそのものの大きさは順位に関係なく一定にすること。
// 上位を目立たせたいのであって、下位を貧相に見せたいわけではない。
//
// 【なぜ定数にまとめるか】
// 順位バッジを描画しているページが複数ある（指標別ランキング・
// 業界別ページ・条件別一覧）。各ページに直接クラスを書くと、
// サイズを調整するたびに全部を探して直すことになり、
// 見た目が少しずつ食い違っていく。ここ1か所で決める。
//
// 【適用しないページ】
// 初任給ランキング（/ranking）と想定年収ランキング（/ranking/annual）は
// 独自の大きなカード（CompanyCard）を使っており対象外。
// ------------------------------------------------------------------

export type RankTier = "top3" | "top10" | "normal"

export function rankTier(rank: number): RankTier {
  if (rank <= 3) return "top3"
  if (rank <= 10) return "top10"
  return "normal"
}

/**
 * 順位バッジ（丸）のサイズと配色。
 * ここだけが順位によって変わる。カードやロゴ、社名のサイズは変えないこと。
 */
export const RANK_BADGE: Record<RankTier, string> = {
  top3: "h-12 w-12 md:h-14 md:w-14 text-xl md:text-2xl bg-primary text-primary-foreground shadow-sm",
  top10: "h-10 w-10 md:h-12 md:w-12 text-base md:text-xl bg-primary/15 text-primary",
  normal: "h-9 w-9 md:h-10 md:w-10 text-sm md:text-base bg-muted text-muted-foreground",
}
