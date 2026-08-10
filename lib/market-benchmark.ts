// ------------------------------------------------------------------
// 【E-E-A-T対策】公的統計との比較用の定数。
//
// 当サイトの掲載企業は「初任給が高い企業」に偏ったデータセットのため、
// 平均を出すと世間相場より大幅に高くなる。その事実を隠すと
// 「相場を知りたい」で来た読者の期待とずれ、直帰の原因になる。
//
// 一次情報である厚生労働省の統計を併記し、当サイトの数値がどういう
// 母集団の平均なのかを明示することで、逆に信頼性を高める。
//
// 出典: 厚生労働省「令和7年賃金構造基本統計調査」
//       大学卒（全規模計）262.3千円・前年比+5.6%で初めて26万円台に到達
//       高校卒 207.3千円・前年比+5.0%
//       企業規模1,000人以上の大学卒は273.4千円、10〜99人は242.4千円
//
// 【更新のしかた】毎年3月頃に前年調査の結果が公表される。
// 数値と YEAR_LABEL を差し替えるだけで全ページの記述が追従する。
// ------------------------------------------------------------------

export const MARKET_BENCHMARK = {
  /** 調査名（出典表記に使う） */
  surveyName: "厚生労働省「令和7年賃金構造基本統計調査」",
  /** 調査対象の年表記 */
  yearLabel: "令和7年（2025年）",
  /** 大学卒の平均初任給（円・月額） */
  universityGraduate: 262_300,
  /** 前年比（%） */
  universityGraduateYoY: 5.6,
  /** 高校卒の平均初任給（円・月額） */
  highSchoolGraduate: 207_300,
  /** 企業規模1,000人以上の大学卒（円） */
  largeCompany: 273_400,
  /** 企業規模10〜99人の大学卒（円） */
  smallCompany: 242_400,
} as const

const yen = (n: number) => `${n.toLocaleString()}円`

/**
 * 当サイトの平均が世間相場と比べてどの位置にあるかを説明する文章を作る。
 * 掲載企業が高給側に偏っていることを正直に書くことで、
 * 「相場を知りたい」読者にも正しい情報を届けつつ信頼を得る。
 *
 * @param siteAverage 当サイト掲載企業の平均初任給（円）
 * @param listedCount 平均の算出に使った企業数
 */
export function buildMarketComparison(
  siteAverage: number | null,
  listedCount: number,
): string | null {
  if (siteAverage === null || siteAverage <= 0) return null

  const b = MARKET_BENCHMARK
  const diff = siteAverage - b.universityGraduate
  const times = Math.round((siteAverage / b.universityGraduate) * 10) / 10

  return (
    `${b.surveyName}によると、${b.yearLabel}の大学卒の平均初任給は${yen(b.universityGraduate)}（前年比+${b.universityGraduateYoY}%）で、初めて26万円台に到達しました。` +
    `一方、当サイト掲載${listedCount}社の平均は${yen(siteAverage)}で、世間の平均を${yen(Math.abs(diff))}（約${times}倍）上回っています。` +
    `これは当サイトが初任給の高い企業を中心に収録しているためで、日本全体の相場ではありません。` +
    `一般的な水準を知りたい場合は上記の公的統計を、高待遇の企業を探したい場合は当サイトのランキングをご覧ください。`
  )
}

/**
 * 個別企業の初任給が世間相場と比べてどうかを説明する文章。
 * 企業詳細ページで「この金額は高いのか」という疑問に直接答える。
 */
export function buildCompanyMarketComparison(
  companyName: string,
  monthly: number | null,
): string | null {
  if (monthly === null || monthly <= 0) return null

  const b = MARKET_BENCHMARK
  const diff = monthly - b.universityGraduate
  if (diff >= 0) {
    return `${companyName}の初任給は、${b.surveyName}による大学卒の平均${yen(b.universityGraduate)}を${yen(diff)}上回る水準です。`
  }
  return `${companyName}の初任給は、${b.surveyName}による大学卒の平均${yen(b.universityGraduate)}を${yen(Math.abs(diff))}下回る水準です。`
}
