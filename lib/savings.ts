// ------------------------------------------------------------------
// 【貯蓄の推定】
//
// 「この初任給なら年間◯万円貯められます」と根拠なく書くのは避ける。
// お金の話で当てずっぽうの数字を出すと、読者に実害が出るうえ、
// 検索評価でも最も厳しく見られる領域（YMYL）にあたる。
//
// そこで公的統計から「手取りに対してどれだけ手元に残るか」の割合を取り、
// それを各企業の手取りに掛ける方式にする。計算の出どころが説明でき、
// 統計が更新されればこのファイルの定数を書き換えるだけで全ページが追従する。
//
// ------------------------------------------------------------------
// 【なぜ1つの数字ではなく「幅」で出すのか】
//
// 家計調査の黒字率（45.3%）は「可処分所得のうち消費に使わなかった割合」で、
// 借金返済や保険料の支払いも含む。そのまま貯金として残る額ではない。
// 一方でファイナンシャルプランニングで一般的に言われる先取り貯蓄の目安は
// 手取りの10〜20%で、こちらはかなり保守的。
//
// 実際の貯蓄額はこの2つの間に収まることが多い。
// どちらか一方だけを出すと、多すぎるか少なすぎるかのどちらかになる。
// 幅で示し、それぞれの根拠を明記するのが最も誠実で、
// 「実際にはどのあたりになるのか」を読者が自分で判断できる。
//
// ------------------------------------------------------------------
// 【平均値を使わない理由】
//
// 20歳代の金融資産は「平均値」と「中央値」が大きく乖離する。
// 一部の高額保有者が平均を引き上げるためで、同年代の実感からは離れる。
// 調査元や集計の切り口によって平均値の数字自体も揺れるため、
// このサイトでは中央値だけを使う。
// ------------------------------------------------------------------

/**
 * 貯蓄まわりの公的データ。
 *
 * 【更新のしかた】
 * ・家計調査は毎年2月頃に前年分が公表される
 * ・J-FLECの世論調査は毎年12月頃に公表される
 * 数値と surveyName・yearLabel を差し替えれば全ページの記述が追従する。
 */
export const SAVINGS_BENCHMARK = {
  /** 家計調査（総務省）: 34歳以下・単身勤労者世帯の黒字率 */
  surplusRate: 45.3,
  surplusRatePrev: 44.2,
  surplusSurvey: "総務省「家計調査（家計収支編）2024年」",
  surplusTarget: "34歳以下の単身勤労者世帯",

  /**
   * 先取り貯蓄の一般的な目安（手取りに対する割合）。
   * 公的統計ではなくファイナンシャルプランニングの慣行値なので、
   * 出典を「一般的な目安」と明記して統計値と区別する。
   */
  ruleOfThumbMin: 10,
  ruleOfThumbMax: 20,

  /** J-FLEC「家計の金融行動に関する世論調査」: 20歳代・単身世帯の金融資産中央値（円） */
  median20s: 370_000,
  /** 同調査で金融資産を保有していない20歳代・単身世帯の割合（%） */
  nonHolderRate20s: 33.2,
  assetSurvey: "金融経済教育推進機構（J-FLEC）「家計の金融行動に関する世論調査（2025年）」",
  assetTarget: "20歳代の単身世帯",

  // ------------------------------------------------------------------
  // 【当サイトならではの切り口をつくるための数値】
  //
  // 銀行のコラムは「新卒の貯金は手取りの1〜2割」で終わってしまう。
  // 当サイトは企業ごとの初任給を持っているので、
  //   ・この会社なら1年目の平均貯蓄額を超えられるか
  //   ・30歳時点の目標額に間に合うか
  //   ・実家暮らしと一人暮らしでどれだけ違うか
  // まで踏み込める。ここが他サイトと重ならない部分になる。
  // ------------------------------------------------------------------

  /** 社会人1年目の平均貯蓄額（円） */
  firstYearAverage: 490_000,
  firstYearSurvey: "ソニー生命「社会人1年目と2年目の意識調査2024」",

  /** 社会人2年目が考える30歳時点の目標貯蓄額（円） */
  goalAt30: 9_860_000,
  /** 新卒入社から30歳までの年数 */
  yearsTo30: 8,

  /**
   * 34歳以下・単身勤労者世帯の年間支出（円）。
   *
   * 【この数字が最も効く】一人暮らしと実家暮らしで年100万円以上違う。
   * 初任給が月5万円（年60万円）高い企業を選ぶより、
   * 住まいの選択のほうが貯蓄額への影響が大きいことすらある。
   * 就活生がまず知るべきなのはこの事実。
   */
  livingAloneAnnual: 2_050_000,
  livingWithFamilyAnnual: 935_000,
  livingCostSurvey: "総務省「家計調査（家計収支編）単身世帯」",
} as const

/**
 * 住まい方の違いによる貯蓄可能額。
 * 一人暮らしと実家暮らしで年100万円以上違うため、
 * 初任給の差より大きなインパクトを持つことがある。
 */
export interface LivingScenario {
  key: "alone" | "family"
  label: string
  /** 年間の支出（円） */
  annualCost: number
  /** 年収（手取り×12）から支出を引いた残り。マイナスなら赤字 */
  annualSurplus: number
  /** 1年目の平均貯蓄額（49万円）を上回れるか */
  beatsAverage: boolean
  note: string
}

export interface SavingsEstimate {
  /** 月の手取り（1年目） */
  netMonthly: number
  /** 控えめな見積り（先取り貯蓄20%）の月額 */
  conservativeMonthly: number
  /** 統計上の余剰（黒字率45.3%）の月額 */
  statisticalMonthly: number
  /** 年間（月額×12。賞与は含めない） */
  conservativeAnnual: number
  statisticalAnnual: number
  /** 20歳代の金融資産中央値に到達するまでの月数（控えめな見積りの場合） */
  monthsToMedian: number
}

/**
 * 月の手取りから、年間で貯められる金額を幅で推定する。
 *
 * 【賞与を含めない理由】
 * 賞与の有無と金額は企業ごとに大きく違い、新卒1年目は
 * 支給が寸志のみ、あるいは支給なしという企業も珍しくない。
 * 含めると過大な数字になりやすいので、月給ベースだけで計算し、
 * 「賞与があればこれに上乗せされる」と表示側で補足する。
 *
 * @param netMonthly 月の手取り（円）
 */
export function estimateSavings(netMonthly: number): SavingsEstimate | null {
  if (!Number.isFinite(netMonthly) || netMonthly <= 0) return null

  const conservativeMonthly = Math.round(
    (netMonthly * SAVINGS_BENCHMARK.ruleOfThumbMax) / 100,
  )
  const statisticalMonthly = Math.round((netMonthly * SAVINGS_BENCHMARK.surplusRate) / 100)

  return {
    netMonthly,
    conservativeMonthly,
    statisticalMonthly,
    conservativeAnnual: conservativeMonthly * 12,
    statisticalAnnual: statisticalMonthly * 12,
    monthsToMedian: Math.ceil(SAVINGS_BENCHMARK.median20s / conservativeMonthly),
  }
}

const man = (v: number) => `${Math.round(v / 10_000).toLocaleString()}万円`
const yen = (v: number) => `${Math.round(v).toLocaleString()}円`

/**
 * 住まい方の違いで年間いくら残るかを出す。
 *
 * 【なぜこれを出すか】
 * 銀行のコラムは「手取りの1〜2割を貯めましょう」で終わる。
 * だが実際に効くのは住まいの選択で、統計上は年間110万円以上の差がつく。
 * 初任給が月5万円高い企業を選んでも年60万円の差にしかならないので、
 * 就活生にとっては住まいのほうがインパクトが大きいことすらある。
 * 当サイトは企業ごとの手取りを持っているので、この比較を具体的に出せる。
 */
export function buildLivingScenarios(netMonthly: number): LivingScenario[] {
  const b = SAVINGS_BENCHMARK
  const annualNet = netMonthly * 12

  const make = (
    key: LivingScenario["key"],
    label: string,
    annualCost: number,
    note: string,
  ): LivingScenario => {
    const annualSurplus = annualNet - annualCost
    return {
      key,
      label,
      annualCost,
      annualSurplus,
      beatsAverage: annualSurplus >= b.firstYearAverage,
      note,
    }
  }

  return [
    make(
      "alone",
      "一人暮らしの場合",
      b.livingAloneAnnual,
      "家賃・食費・光熱費・通信費などを含む単身世帯の平均的な支出です。家賃補助や社宅がある企業では、これより支出を抑えられます。",
    ),
    make(
      "family",
      "実家暮らしの場合",
      b.livingWithFamilyAnnual,
      "家賃と食費の大部分がかからない前提です。実家に生活費を入れる場合はその分を差し引いて考えてください。",
    ),
  ]
}

/**
 * 30歳時点の目標額に対して、このペースで間に合うかを判定する。
 * 目標額はアンケートの平均値であり、全員が目指すべき額ではない。
 */
export function buildGoalAt30(annualSavings: number): {
  goal: number
  requiredAnnual: number
  actualAnnual: number
  achievable: boolean
  shortfallAnnual: number
} {
  const b = SAVINGS_BENCHMARK
  const requiredAnnual = Math.round(b.goalAt30 / b.yearsTo30)
  return {
    goal: b.goalAt30,
    requiredAnnual,
    actualAnnual: annualSavings,
    achievable: annualSavings >= requiredAnnual,
    shortfallAnnual: Math.max(0, requiredAnnual - annualSavings),
  }
}

/**
 * 企業詳細ページに載せる解説文。
 * 数字の出どころを文中に明記し、幅で示していることが伝わるようにする。
 */
export function buildSavingsSummary(companyName: string, est: SavingsEstimate): string {
  const b = SAVINGS_BENCHMARK
  return (
    `${companyName}の手取り（月${yen(est.netMonthly)}）をもとに、年間で貯められる金額を試算しました。` +
    `手取りの${b.ruleOfThumbMax}%を先取り貯蓄に回す一般的な目安なら年間${man(est.conservativeAnnual)}、` +
    `${b.surplusSurvey}が示す${b.surplusTarget}の黒字率${b.surplusRate}%と同じペースなら年間${man(est.statisticalAnnual)}です。` +
    `黒字率には借金の返済や保険料の支払いも含まれるため、実際に貯金として残るのはこの幅の中ほどになることが多いと考えられます。` +
    `控えめに見積もった場合でも、${b.assetTarget}の金融資産の中央値${man(b.median20s)}には約${est.monthsToMedian}か月で届く計算です。`
  )
}
