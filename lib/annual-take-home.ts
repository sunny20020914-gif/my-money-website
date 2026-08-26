import { estimateNetSalary } from "./net-salary"
import { meaningfulAverageSalary } from "./financials"
import type { CompanyData } from "./sheets"

// ------------------------------------------------------------------
// 【年収別の手取りページ】
//
// 月額別のページ（/take-home/[amount]）が公開数日で
//   額面58万 手取り … 6.8位
//   53万円 手取り  … 8.4位
//   額面56万 手取り … 9.1位
// と結果を出した。同じ型を年収軸にも広げる。
//
// 「年収500万 手取り」系は月額版より検索数が大きく、
// しかも金融ジャンルなので広告単価も高い。
//
// 【月額版との違いを明確にする】
// 単に12倍しただけのページを並べると、月額版と内容が近すぎて
// 重複と判定されかねない。年収版では
//   ・住民税を含んだ通年の手取り（月額版は1年目/2年目で分けている）
//   ・賞与を含む前提での月あたりの目安
//   ・平均年収がその水準にある掲載企業
// を主役にして、切り口を変えている。
//
// 【計算の考え方】
// 年収を12等分した額を標準報酬月額とみなして社会保険料を算出する。
// 実際には賞与にかかる保険料の料率は月給とほぼ同じなので、
// この近似で実用上十分な精度になる。厳密な料率差はページ内で断っている。
// ------------------------------------------------------------------

/**
 * ページを用意する年収（円）。
 * 300万〜1000万は50万刻み、それ以上は検索数が落ちるので粗くする。
 */
export const ANNUAL_AMOUNTS: number[] = [
  ...Array.from({ length: 15 }, (_, i) => 3_000_000 + i * 500_000), // 300万〜1000万
  11_000_000,
  12_000_000,
  13_000_000,
  15_000_000,
  20_000_000,
]

export function isValidAnnualAmount(amount: number): boolean {
  return ANNUAL_AMOUNTS.includes(amount)
}

/** 5_000_000 → 「500万円」 */
export function annualManLabel(amount: number): string {
  return `${amount / 10_000}万円`
}

/**
 * 一覧表用の軽量な計算。
 *
 * ハブページ（/take-home/annual）は20行の表を出すだけで、
 * 企業の抽出や解説文の生成は要らない。
 * buildAnnualTakeHome を20回呼ぶと企業リストの絞り込みまで
 * 走ってしまうため、必要な数値だけを返す関数を分けている。
 */
export function estimateAnnualNet(amount: number): {
  netAnnual: number
  netMonthlyAverage: number
  ratio: number
} | null {
  const est = estimateNetSalary(Math.round(amount / 12))
  if (!est) return null

  const deduction =
    (est.healthInsurance +
      est.pension +
      est.employmentInsurance +
      est.incomeTaxMonthly +
      est.residentTaxMonthly) *
    12
  const netAnnual = round(amount - deduction)
  return {
    netAnnual,
    netMonthlyAverage: round(netAnnual / 12),
    ratio: Math.round((netAnnual / amount) * 1000) / 10,
  }
}

export interface AnnualBreakdownRow {
  label: string
  /** 年額 */
  value: number
  note: string
}

export interface AnnualTakeHomeData {
  amount: number
  amountLabel: string
  /** 年間の手取り（住民税込み） */
  netAnnual: number
  /** 月あたりの手取り目安 */
  netMonthly: number
  /** 手取り率（%） */
  ratio: number
  /** 天引きの年間合計 */
  deductionAnnual: number
  breakdown: AnnualBreakdownRow[]
  /** 平均年収がこの水準にある掲載企業 */
  nearbyCompanies: { company: CompanyData; averageMan: number }[]
  prevAmount: number | null
  nextAmount: number | null
  paragraphs: string[]
  faq: { question: string; answer: string }[]
}

const yen = (v: number) => `${Math.round(v).toLocaleString()}円`
/** 千円単位に丸める（概算らしさを保つ） */
const round = (v: number) => Math.round(v / 1_000) * 1_000

const man = (v: number) => `${Math.round(v / 10_000).toLocaleString()}万円`

export function buildAnnualTakeHome(
  amount: number,
  all: CompanyData[],
): AnnualTakeHomeData | null {
  // 年収を12等分して月額とみなす。賞与の保険料率は月給とほぼ同じなので
  // この近似で実用上の精度は保てる。
  const monthlyEquivalent = Math.round(amount / 12)
  const est = estimateNetSalary(monthlyEquivalent)
  if (!est) return null

  const breakdown: AnnualBreakdownRow[] = [
    {
      label: "健康保険料",
      value: est.healthInsurance * 12,
      note: "医療費の自己負担を3割に抑えるための保険。会社と折半で負担します。",
    },
    {
      label: "厚生年金保険料",
      value: est.pension * 12,
      note: "将来受け取る年金の原資。標準報酬月額に上限があるため、高年収でも一定額で頭打ちになります。",
    },
    {
      label: "雇用保険料",
      value: est.employmentInsurance * 12,
      note: "失業給付や育児休業給付にあてられます。",
    },
    {
      label: "所得税",
      value: est.incomeTaxMonthly * 12,
      note: "所得が増えるほど税率が上がる累進課税。年収が上がるほど手取り率は下がります。",
    },
    {
      label: "住民税",
      value: est.residentTaxMonthly * 12,
      note: "前年の所得に対して課税されます。所得割10%＋均等割で、ほぼ一律です。",
    },
  ]

  const deductionAnnual = breakdown.reduce((s, r) => s + r.value, 0)
  const netAnnual = round(amount - deductionAnnual)
  const netMonthly = round(netAnnual / 12)
  const ratio = Math.round((netAnnual / amount) * 1000) / 10

  // 【内部リンク】平均年収がこの水準にある掲載企業。
  // 有価証券報告書ベースなので、その年収帯が現実に存在することの裏付けにもなる。
  const targetMan = amount / 10_000
  const nearbyCompanies = all
    .map((c) => ({ company: c, averageMan: meaningfulAverageSalary(c) ?? 0 }))
    .filter((r) => r.averageMan > 0 && Math.abs(r.averageMan - targetMan) <= targetMan * 0.12)
    .sort((a, b) => Math.abs(a.averageMan - targetMan) - Math.abs(b.averageMan - targetMan))
    .slice(0, 5)

  const idx = ANNUAL_AMOUNTS.indexOf(amount)
  const prevAmount = idx > 0 ? ANNUAL_AMOUNTS[idx - 1] : null
  const nextAmount =
    idx >= 0 && idx < ANNUAL_AMOUNTS.length - 1 ? ANNUAL_AMOUNTS[idx + 1] : null

  const label = annualManLabel(amount)

  const paragraphs: string[] = [
    `年収${label}の手取りは、年間およそ${yen(netAnnual)}です。額面の${ratio}%が実際に受け取れる金額で、` +
      `残りの${yen(deductionAnnual)}が社会保険料と税金として差し引かれます。` +
      `月あたりに直すと約${yen(netMonthly)}ですが、賞与のある企業では毎月の振込額はこれより少なく、賞与月に大きくなります。`,
    `年収が上がるほど手取りの割合は下がります。所得税が累進課税で、課税所得が増えるほど税率が上がるためです。` +
      `一方で厚生年金保険料には標準報酬月額の上限があり、一定を超えると保険料は増えません。` +
      `そのため高年収帯では、手取り率の低下は所得税と住民税によるものが中心になります。`,
    `求人票の「想定年収」には、基本給のほかに賞与・固定残業代・各種手当が含まれているのが一般的です。` +
      `同じ年収${label}でも、賞与の比率が高い企業は業績によって実際の支給額が上下します。` +
      `固定残業代が含まれている場合は、その時間分の残業をして初めてこの金額に届く点にも注意してください。`,
  ]

  const faq: { question: string; answer: string }[] = [
    {
      question: `年収${label}の手取りはいくらですか？`,
      answer:
        `年間およそ${yen(netAnnual)}、月あたり約${yen(netMonthly)}です（扶養なし・40歳未満の場合）。` +
        `内訳は健康保険料${yen(breakdown[0].value)}、厚生年金保険料${yen(breakdown[1].value)}、` +
        `雇用保険料${yen(breakdown[2].value)}、所得税${yen(breakdown[3].value)}、住民税${yen(breakdown[4].value)}で、` +
        `天引きの合計は年間${yen(deductionAnnual)}です。`,
    },
    {
      question: `年収${label}だと手取りは何割ですか？`,
      answer:
        `約${ratio}%です。年収が上がるほど所得税率が上がるため、手取りの割合は下がっていきます。` +
        `扶養している家族がいる場合は控除が増えるため、手取りはこれより多くなります。` +
        `逆に40歳以上は介護保険料が加わるため少なくなります。`,
    },
    {
      question: `年収${label}の月収はいくらですか？`,
      answer:
        `賞与がない場合、額面の月収は約${yen(Math.round(amount / 12))}です。` +
        `賞与が年4か月分ある企業なら、月給は約${yen(Math.round(amount / 16))}で残りが賞与になります。` +
        `同じ年収でも賞与の比率によって毎月の生活に使える金額は変わります。`,
    },
  ]

  if (nearbyCompanies.length > 0) {
    faq.push({
      question: `平均年収が${label}前後の企業はどこですか？`,
      answer:
        `当サイト掲載企業では${nearbyCompanies.map((r) => `${r.company.company}（${man(r.averageMan * 10_000)}）`).join("、")}などが該当します。` +
        `平均年収は有価証券報告書の「平均年間給与」に基づくため、原則として上場企業の数値です。` +
        `各企業のページでは初任給からの伸び率や業績データも確認できます。`,
    })
  }

  return {
    amount,
    amountLabel: label,
    netAnnual,
    netMonthly,
    ratio,
    deductionAnnual,
    breakdown,
    nearbyCompanies,
    prevAmount,
    nextAmount,
    paragraphs,
    faq,
  }
}
