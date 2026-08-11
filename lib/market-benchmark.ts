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
 * ランキングページ冒頭のリード文（記事の導入部）を組み立てる。
 *
 * 【設計意図】
 * 検索上位の競合（就活メディア）は、いずれも表の前に
 *   ①世間の相場 → ②このページのデータ → ③高い企業の特徴 → ④読み方の注意
 * という順で数段落の導入を置いている。データの列挙だけのページは
 * 「文章量が少ない」と判定されて順位が伸びない。
 *
 * ここでは集計済みデータの穴埋めだけで同じ構成を再現する。
 * 企業が増減しても数字が自動で追従し、手作業の更新は不要。
 *
 * @param opts 掲載データの集計値
 */
export function buildRankingLead(opts: {
  listedCount: number
  avgMonthly: number | null
  medianMonthly: number | null
  topCompany: string | null
  topMonthly: number | null
  over30: number
  over40: number
  topIndustries: { industry: string; avgMonthly: number }[]
  fiscalYear: number
  gradLabel: string
}): string[] {
  const b = MARKET_BENCHMARK
  const paragraphs: string[] = []

  // ① 世間の相場から入る（「初任給の相場を知りたい」層をまず受け止める）
  paragraphs.push(
    `${b.surveyName}によると、${b.yearLabel}の大学卒の平均初任給は${yen(b.universityGraduate)}でした。` +
      `前年比+${b.universityGraduateYoY}%と大きく伸び、初めて26万円台に到達しています。` +
      `企業規模による差も大きく、従業員1,000人以上では${yen(b.largeCompany)}、10〜99人では${yen(b.smallCompany)}です。`,
  )

  // ② このページが何のデータなのかを明示（母集団の偏りを隠さない）
  if (opts.avgMonthly !== null) {
    let p =
      `このページでは、その水準を大きく上回る「初任給の高い企業」を${opts.listedCount}社掲載しています。` +
      `掲載企業の平均は月額${yen(opts.avgMonthly)}`
    if (opts.medianMonthly !== null) p += `（中央値${yen(opts.medianMonthly)}）`
    p += `で、全国平均の約${Math.round((opts.avgMonthly / b.universityGraduate) * 10) / 10}倍にあたります。`
    if (opts.topCompany && opts.topMonthly !== null) {
      p += `最も高いのは${opts.topCompany}の${yen(opts.topMonthly)}です。`
    }
    p += `月30万円以上は${opts.over30}社、40万円以上は${opts.over40}社あります。`
    paragraphs.push(p)
  }

  // ③ 高い企業に共通する特徴（就活生が最も知りたい「なぜ」に答える）
  if (opts.topIndustries.length >= 2) {
    const inds = opts.topIndustries
      .slice(0, 3)
      .map((r) => `${r.industry}（月額${yen(r.avgMonthly)}）`)
      .join("、")
    paragraphs.push(
      `初任給が高い企業には共通点があります。当サイトのデータで平均が高いのは${inds}の順で、` +
        `いずれも設備よりも人の働きが直接収益を生む業界です。社員一人あたりが生み出す利益が大きいため、` +
        `優秀な人材の確保が業績に直結し、給与水準が高くなります。` +
        `反対に従業員数の多い大企業は、全社員の給与体系との整合が必要で新卒だけを大幅に優遇しにくく、初任給は横並びになりやすい傾向があります。`,
    )
  }

  // ④ 読み方の注意（額面と実態のギャップ＝離脱を防ぎ、滞在時間を伸ばす）
  paragraphs.push(
    `ただし、初任給の額面だけで比較するのは危険です。提示額に固定残業代や住宅手当が含まれていることがあり、` +
      `同じ30万円でも実質的な条件は企業ごとに異なります。また初任給が高くても入社後の昇給が緩やかな企業もあります。` +
      `当サイトでは有価証券報告書をもとに全社員の平均年収も掲載しているため、各企業の詳細ページで` +
      `手取り額と入社後の伸びまで確認できます。${opts.gradLabel}の企業選びにご活用ください。`,
  )

  return paragraphs
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
