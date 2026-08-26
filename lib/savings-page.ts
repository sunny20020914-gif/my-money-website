import { SAVINGS_BENCHMARK, estimateSavings, buildLivingScenarios, buildGoalAt30 } from "./savings"
import type { LivingScenario } from "./savings"
import { estimateNetSalary } from "./net-salary"
import type { CompanyData } from "./sheets"

// ------------------------------------------------------------------
// 【手取り別の貯蓄ページ】
//
// 手取りページ（/take-home/[amount]・/take-home/annual/[amount]）が
// 公開数日で6〜10位に入った。同じ型を貯蓄に広げる。
//
//   「手取り20万 貯金」「新卒 貯金 いくら」「20代 貯金 平均」
//
// 計算に必要な統計は lib/savings.ts に出典つきで揃っており、
// 企業詳細ページで既に使っている。受け止めるURLが無かっただけ。
//
// 【手取りページとの違いを明確にする】
// 同じ金額を軸にしたページを2種類作るので、切り口が被ると重複扱いになる。
//   手取りページ … 額面からいくら引かれるか（税・社会保険の話）
//   貯蓄ページ  … 手取りからいくら貯められるか（生活防衛資金・目標額の話）
// 前者は「引かれる」、後者は「残す」の話で、扱う数字も文章も重ならない。
//
// 【生活防衛資金について】
// 一般に「生活費の3〜6か月分」とされる。手取りの全額が生活費ではないが、
// 新卒1年目は手取りのほぼ全額が生活費に近いため、
// 手取り×3か月〜×6か月を目安として示す。根拠はFPの慣行値であり
// 公的統計ではないので、統計値と区別して明記する。
// ------------------------------------------------------------------

/**
 * ページを用意する手取り月額（円）。
 *
 * 【範囲の決め方】手取りは額面より2〜3割少ない。
 * 額面20万〜60万に対応する手取りは16万〜48万あたりなので、
 * 15万〜40万を1万円刻みで用意する。
 * 「手取り20万 貯金」のような検索はこの帯に集中している。
 */
export const SAVINGS_AMOUNTS: number[] = Array.from(
  { length: 26 },
  (_, i) => 150_000 + i * 10_000,
)

export function isValidSavingsAmount(amount: number): boolean {
  return SAVINGS_AMOUNTS.includes(amount)
}

/**
 * 指定した手取りに最も近い、ページが存在する金額を返す。
 * 用意している範囲（15万〜40万）から外れている場合は null。
 *
 * 企業ページから「手取り◯万円の貯金プラン」へ送るために使う。
 */
export function nearestSavingsAmount(netMonthly: number | null | undefined): number | null {
  if (typeof netMonthly !== "number" || netMonthly <= 0) return null
  const nearest = SAVINGS_AMOUNTS.reduce((best, a) =>
    Math.abs(a - netMonthly) < Math.abs(best - netMonthly) ? a : best,
  )
  // 刻みが1万円なので最寄りとの差は最大5千円。
  // それを超える＝用意している範囲の外なのでリンクしない。
  return Math.abs(nearest - netMonthly) <= 5_000 ? nearest : null
}

/** 200000 → 「20万円」 */
export function savingsManLabel(amount: number): string {
  const m = amount / 10_000
  return Number.isInteger(m) ? `${m}万円` : `${m.toFixed(1)}万円`
}

export interface SavingsPace {
  /** 手取りに対する割合（%） */
  rate: number
  label: string
  monthly: number
  annual: number
  /** 100万円貯まるまでの月数 */
  monthsToMillion: number
  note: string
}

export interface SavingsGoal {
  label: string
  amount: number
  /** 控えめなペースで到達する月数 */
  months: number
  note: string
}

export interface SavingsPageData {
  amount: number
  amountLabel: string
  /** この手取りに相当する額面の目安 */
  grossEstimate: number
  paces: SavingsPace[]
  goals: SavingsGoal[]
  /** 生活防衛資金（3か月分・6か月分） */
  emergencyMin: number
  emergencyMax: number
  prevAmount: number | null
  nextAmount: number | null
  /** 手取りがこの水準に近い掲載企業 */
  nearbyCompanies: { company: CompanyData; netMonthly: number }[]
  /** 一人暮らし／実家暮らしで年間いくら残るか */
  livingScenarios: LivingScenario[]
  /** 一人暮らしと実家暮らしの差額（年・円） */
  livingDiff: number
  /** 30歳時点の目標額に対する逆算 */
  goalAt30: ReturnType<typeof buildGoalAt30>
  paragraphs: string[]
  faq: { question: string; answer: string }[]
}

const man = (v: number) => `${Math.round(v / 10_000).toLocaleString()}万円`
const yen = (v: number) => `${Math.round(v).toLocaleString()}円`

/** 月数を「1年3か月」のような表記にする */
function periodLabel(months: number): string {
  if (months < 12) return `${months}か月`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m === 0 ? `${y}年` : `${y}年${m}か月`
}

/**
 * 手取り月額から、その額面がいくらだったかを逆算する（目安）。
 * 厳密な逆関数は無いので、額面を1万円刻みで動かして最も近いものを探す。
 */
function estimateGross(netMonthly: number): number {
  let best = netMonthly
  let bestDiff = Infinity
  for (let gross = netMonthly; gross <= netMonthly * 1.6; gross += 1_000) {
    const est = estimateNetSalary(gross)
    if (!est) continue
    const diff = Math.abs(est.netMonthlyFirstYear - netMonthly)
    if (diff < bestDiff) {
      bestDiff = diff
      best = gross
    }
  }
  return Math.round(best / 1_000) * 1_000
}

export function buildSavingsPage(amount: number, all: CompanyData[]): SavingsPageData | null {
  const est = estimateSavings(amount)
  if (!est) return null

  const b = SAVINGS_BENCHMARK

  // 3つのペースを幅で示す。1つの数字だけ出すと断定的になりすぎるため。
  const makePace = (rate: number, label: string, note: string): SavingsPace => {
    const monthly = Math.round((amount * rate) / 100)
    return {
      rate,
      label,
      monthly,
      annual: monthly * 12,
      monthsToMillion: Math.ceil(1_000_000 / monthly),
      note,
    }
  }

  const paces: SavingsPace[] = [
    makePace(
      b.ruleOfThumbMin,
      "無理のないペース",
      "先取り貯蓄の下限としてよく挙げられる割合です。余ったら貯めるのではなく、給料日に自動で分けるのが前提になります。",
    ),
    makePace(
      b.ruleOfThumbMax,
      "しっかり貯めるペース",
      "先取り貯蓄の上限としてよく挙げられる割合です。実家暮らしや家賃補助がある場合は現実的に達成できます。",
    ),
    makePace(
      b.surplusRate,
      "統計上の黒字率と同じペース",
      `${b.surplusSurvey}が示す${b.surplusTarget}の黒字率です。借金の返済や保険料も含む数字なので、全額が貯金として残るわけではありません。`,
    ),
  ]

  const emergencyMin = amount * 3
  const emergencyMax = amount * 6
  const conservative = paces[1].monthly // 20%ペースを基準に到達期間を出す

  const goals: SavingsGoal[] = [
    {
      label: `20代単身の金融資産中央値（${man(b.median20s)}）`,
      amount: b.median20s,
      months: Math.ceil(b.median20s / conservative),
      note: `${b.assetSurvey}による${b.assetTarget}の中央値です。同じ調査で金融資産を持たない世帯が${b.nonHolderRate20s}%あるため、ここに届けば同年代の真ん中より上になります。`,
    },
    {
      label: `生活防衛資金の下限（手取り3か月分・${man(emergencyMin)}）`,
      amount: emergencyMin,
      months: Math.ceil(emergencyMin / conservative),
      note: "病気・怪我・転職・急な引っ越しに備える資金です。すぐ引き出せる普通預金で持つのが基本で、投資に回すお金とは分けて考えます。",
    },
    {
      label: `生活防衛資金の目安（手取り6か月分・${man(emergencyMax)}）`,
      amount: emergencyMax,
      months: Math.ceil(emergencyMax / conservative),
      note: "収入が不安定な職種や、転職を視野に入れている場合はこちらを目標にすると安心です。",
    },
    {
      label: "100万円",
      amount: 1_000_000,
      months: Math.ceil(1_000_000 / conservative),
      note: "最初の大きな区切りです。ここまで貯まると、生活防衛資金を確保したうえで積立投資を始める余裕が出てきます。",
    },
  ]

  const grossEstimate = estimateGross(amount)

  // 【独自の切り口】住まい方の違い。統計上は年110万円以上の差がつき、
  // 初任給の差より貯蓄額を左右することがある。
  const livingScenarios = buildLivingScenarios(amount)
  const livingDiff =
    livingScenarios[1].annualSurplus - livingScenarios[0].annualSurplus
  // 30歳時点の目標額に対して、20%ペースで間に合うかの逆算
  const goalAt30 = buildGoalAt30(paces[1].annual)

  // 手取りがこの水準に近い掲載企業。±1万円以内。
  const nearbyCompanies = all
    .map((c) => {
      const n = estimateNetSalary(c.baseMonthly)
      return { company: c, netMonthly: n ? Math.round(n.netMonthlyFirstYear / 1_000) * 1_000 : 0 }
    })
    .filter((r) => r.netMonthly > 0 && Math.abs(r.netMonthly - amount) <= 10_000)
    .sort((a, b2) => Math.abs(a.netMonthly - amount) - Math.abs(b2.netMonthly - amount))
    .slice(0, 5)

  const idx = SAVINGS_AMOUNTS.indexOf(amount)
  const prevAmount = idx > 0 ? SAVINGS_AMOUNTS[idx - 1] : null
  const nextAmount =
    idx >= 0 && idx < SAVINGS_AMOUNTS.length - 1 ? SAVINGS_AMOUNTS[idx + 1] : null

  const label = savingsManLabel(amount)

  const paragraphs: string[] = [
    `手取り${label}なら、先取り貯蓄の一般的な目安である${b.ruleOfThumbMin}〜${b.ruleOfThumbMax}%で` +
      `月${yen(paces[0].monthly)}〜${yen(paces[1].monthly)}、年間で${man(paces[0].annual)}〜${man(paces[1].annual)}が目安になります。` +
      `賞与は含めていないので、支給がある企業ではこれに上乗せされます。`,
    `「余ったら貯める」ではまず貯まりません。給料日に自動で別口座へ移す先取り貯蓄にすると、` +
      `残ったお金で生活する形になり、意識せずに続けられます。` +
      `${b.surplusSurvey}によれば${b.surplusTarget}の黒字率は${b.surplusRate}%（前年${b.surplusRatePrev}%）で、` +
      `統計上はもっと余裕がある計算になりますが、この数字には借金の返済や保険料も含まれます。`,
    `最初の目標は生活防衛資金です。手取り${label}なら3か月分で${man(emergencyMin)}、6か月分で${man(emergencyMax)}。` +
      `${b.ruleOfThumbMax}%ペースなら${periodLabel(goals[1].months)}〜${periodLabel(goals[2].months)}で到達します。` +
      `これが貯まるまでは投資より現金を優先し、すぐ引き出せる普通預金に置いておくのが基本です。`,
    `同じ手取り${label}でも、住む場所で貯まる額は大きく変わります。` +
      `${b.livingCostSurvey}によると34歳以下の単身勤労者世帯の年間支出は約${man(b.livingAloneAnnual)}。` +
      `一人暮らしなら年${man(Math.max(livingScenarios[0].annualSurplus, 0))}、実家暮らしなら年${man(Math.max(livingScenarios[1].annualSurplus, 0))}が手元に残る計算で、その差は年${man(livingDiff)}です。` +
      `初任給が月5万円高い企業に入っても年60万円の差にしかならないことを考えると、住まいの選択は企業選びと同じくらい効きます。` +
      `家賃補助や社宅がある企業なら、一人暮らしでもこの差をかなり埋められます。`,
    `${b.firstYearSurvey}によると、社会人1年目の平均貯蓄額は${man(b.firstYearAverage)}、` +
      `社会人2年目が考える30歳時点の目標額は平均${man(b.goalAt30)}です。` +
      `後者を新卒入社からの${b.yearsTo30}年で割ると年${man(goalAt30.requiredAnnual)}のペースが必要になります。` +
      `手取り${label}で${b.ruleOfThumbMax}%を貯めると年${man(paces[1].annual)}なので、` +
      `${
        goalAt30.achievable
          ? "このペースを保てれば計算上は届きます。"
          : `年${man(goalAt30.shortfallAnnual)}足りません。ただし給与は年次とともに上がるため、昇給と賞与でこの差は縮まります。`
      }` +
      `目標額はアンケートの平均値であり、全員が目指すべき金額ではありません。`,
  ]

  const faq: { question: string; answer: string }[] = [
    {
      question: `手取り${label}だと毎月いくら貯金できますか？`,
      answer:
        `先取り貯蓄の一般的な目安である手取りの${b.ruleOfThumbMin}〜${b.ruleOfThumbMax}%なら、` +
        `月${yen(paces[0].monthly)}〜${yen(paces[1].monthly)}です。年間では${man(paces[0].annual)}〜${man(paces[1].annual)}になります。` +
        `賞与は含めていないため、支給がある企業ではさらに上乗せできます。`,
    },
    {
      question: `手取り${label}で100万円貯めるにはどれくらいかかりますか？`,
      answer:
        `手取りの${b.ruleOfThumbMax}%を貯めるペースなら約${periodLabel(paces[1].monthsToMillion)}、` +
        `${b.ruleOfThumbMin}%なら約${periodLabel(paces[0].monthsToMillion)}です。` +
        `賞与から年20万円を追加で回せば、この期間はさらに短くなります。`,
    },
    {
      question: "新卒1年目はいくら貯金するのが普通ですか？",
      answer:
        `${b.assetSurvey}によると、${b.assetTarget}の金融資産の中央値は${man(b.median20s)}です。` +
        `一方で金融資産を持たない世帯が${b.nonHolderRate20s}%あり、20代全体では貯蓄額の差が非常に大きいのが実態です。` +
        `手取り${label}で${b.ruleOfThumbMax}%を貯めれば、約${periodLabel(goals[0].months)}で中央値に届きます。`,
    },
    {
      question: "生活防衛資金はいくら必要ですか？",
      answer:
        `一般には生活費の3〜6か月分とされます。手取り${label}を生活費の上限とみなすと${man(emergencyMin)}〜${man(emergencyMax)}が目安です。` +
        `これは公的統計ではなくファイナンシャルプランニングの慣行値です。` +
        `病気・転職・急な引っ越しに備えるお金なので、投資に回さずすぐ引き出せる状態で持っておきます。`,
    },
    {
      // 【独自の切り口】銀行のコラムには無い、当サイトならではの問い。
      // 企業ごとの手取りを持っているから具体的な金額で答えられる。
      question: "実家暮らしと一人暮らしでどれくらい差がつきますか？",
      answer:
        `${b.livingCostSurvey}をもとに試算すると、手取り${label}の場合で年${man(livingDiff)}の差になります。` +
        `一人暮らしの年間支出が約${man(b.livingAloneAnnual)}なのに対し、実家暮らしは約${man(b.livingWithFamilyAnnual)}だからです。` +
        `初任給が月5万円高い企業に入っても年60万円の差にしかならないため、住まいの選択は企業選びと同じくらい貯蓄額を左右します。` +
        `家賃補助や社宅制度がある企業を選べば、一人暮らしでもこの差を縮められます。`,
    },
    {
      question: `30歳までに${man(b.goalAt30)}貯めるのは現実的ですか？`,
      answer:
        `${b.firstYearSurvey}によると、社会人2年目が考える30歳時点の目標貯蓄額は平均${man(b.goalAt30)}です。` +
        `新卒入社からの${b.yearsTo30}年で割ると年${man(goalAt30.requiredAnnual)}のペースが必要になります。` +
        `手取り${label}で${b.ruleOfThumbMax}%を貯めると年${man(paces[1].annual)}なので、` +
        `${
          goalAt30.achievable
            ? "このペースを保てれば計算上は届きます。"
            : `年${man(goalAt30.shortfallAnnual)}足りません。ただし給与は年次とともに上がるため、昇給と賞与でこの差は縮まります。`
        }` +
        `この金額はアンケートの平均値であり、全員が目指すべき目標ではありません。`,
    },
  ]

  if (nearbyCompanies.length > 0) {
    faq.push({
      question: `手取りが${label}前後になるのはどんな企業ですか？`,
      answer:
        `当サイト掲載企業では${nearbyCompanies.map((r) => r.company.company).join("、")}などが該当します。` +
        `各企業のページでは初任給の内訳、手取りの計算過程、有価証券報告書に基づく平均年収まで確認できます。`,
    })
  }

  return {
    amount,
    amountLabel: label,
    grossEstimate,
    paces,
    goals,
    emergencyMin,
    emergencyMax,
    prevAmount,
    nextAmount,
    nearbyCompanies,
    livingScenarios,
    livingDiff,
    goalAt30,
    paragraphs,
    faq,
  }
}

export { periodLabel }
