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
/** リード文の1ブロック。小見出しと本文の対で返す */
export interface LeadBlock {
  heading: string
  body: string
}

/**
 * 【引数について】listedCount・avgMonthly・medianMonthly・topCompany・
 * topMonthly・over30・over40 は現在この関数の中で使っていない。
 * これらの集計値を扱っていた段落（②）を、下の集計サマリーと
 * 内容が重複するため削除したため。
 *
 * 引数自体は残してある。呼び出し側の記述を変えずに済み、
 * 将来サマリーの構成を変えて集計値をリード文に戻したくなったときに
 * すぐ書けるようにしておくため。
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
}): LeadBlock[] {
  const b = MARKET_BENCHMARK
  const blocks: LeadBlock[] = []

  // 【構成】小見出しを付けて、読み飛ばしても要点が拾えるようにする。
  // 文章だけを並べると長さに圧倒されて読まれない。
  // 見出しに結論を書き、本文は補足に徹する形にした。
  // また各段落は以前より2〜3割短くしている（合計約720字→約500字）。

  // ① 世間の相場から入る（「初任給の相場を知りたい」層をまず受け止める）
  blocks.push({
    heading: `大卒の平均初任給は${yen(b.universityGraduate)}`,
    body:
      `${b.surveyName}によると、${b.yearLabel}の大学卒の平均初任給は前年比+${b.universityGraduateYoY}%と大きく伸び、初めて26万円台に到達しました。` +
      `企業規模による差も大きく、従業員1,000人以上では${yen(b.largeCompany)}、10〜99人では${yen(b.smallCompany)}です。`,
  })

  // ②【意図的に置かない】
  // かつてここに「掲載◯社の平均は月額◯円（中央値◯円）。最高額は◯◯の◯円。
  // 月30万円以上が◯社、40万円以上が◯社」という段落があった。
  // だがこの内容は、すぐ下に表示している集計サマリー（数値カード＋1文）と
  // まったく同じで、同じ数字を2回読ませることになっていた。
  // 繰り返しは読み手にくどく、機械が生成した文章という印象を強める。
  //
  // 集計値の提示はサマリー側に任せ、リード文は
  //   相場 → 高い企業の特徴 → 読み方の注意
  // という「サマリーには書けない話」だけに絞る。

  // ③ 高い企業に共通する特徴（就活生が最も知りたい「なぜ」に答える）
  if (opts.topIndustries.length >= 2) {
    const inds = opts.topIndustries
      .slice(0, 3)
      .map((r) => `${r.industry}（${yen(r.avgMonthly)}）`)
      .join("、")
    blocks.push({
      heading: "初任給が高いのは、人が直接稼ぐ業界",
      body:
        `平均が高いのは${inds}の順です。いずれも設備より人の働きが収益を生む業界で、` +
        `社員一人あたりの利益が大きいぶん、人材確保が業績に直結します。` +
        `逆に従業員数の多い大企業は全社員の給与体系との整合が必要で、新卒だけを優遇しにくく横並びになりがちです。`,
    })
  }

  // ④ 読み方の注意（額面と実態のギャップ＝離脱を防ぎ、滞在時間を伸ばす）
  // 【見出しの語調】以前は「額面だけで比べると判断を誤る」だったが、
  // 読者に言い聞かせるような響きがあった。
  // 疑問形にすると、読者が自分で考える導入になり、記事らしい調子になる。
  blocks.push({
    heading: "額面だけで比べて大丈夫？",
    body:
      `提示額に固定残業代や住宅手当が含まれることがあり、同じ30万円でも実質的な条件は異なります。` +
      `初任給が高くても昇給が緩やかな企業もあります。` +
      `当サイトは有価証券報告書をもとに全社員の平均年収も掲載しているため、各企業のページで手取りと入社後の伸びまで確認できます。`,
  })

  return blocks
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
