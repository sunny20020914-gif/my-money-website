import type { CompanyData } from "./sheets"

// ------------------------------------------------------------------
// 【当サイト独自】初任給 → 平均年収の「伸び」分析
//
// 大手就活サイトは初任給しか持たず、年収サイトは初任給を持たない。
// 両方を持つこのサイトだけが「入社後にどれだけ伸びるか」を示せる。
//
// 実データ94社の検証結果:
//   ・初任給と平均年収の順位相関は r=-0.215（弱い負）
//     → 「初任給が高い＝生涯賃金が高い」ではない
//   ・伸び倍率（平均年収 ÷ 初任給年収）の中央値は約2.2倍
//   ・キーエンス6.5倍・三菱商事4.4倍 ↔ GMO1.2倍・霞ヶ関キャピタル1.2倍
//     と企業差が非常に大きい
//
// これは就活生が最も知りたい情報のひとつでありながら、
// 初任給だけを見ていると絶対に分からない。
// ------------------------------------------------------------------

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && isFinite(v) && v > 0 ? v : null

/**
 * 平均年間給与（万円入力）を円に直す。
 * 【重要】持株会社では単体従業員が数名しかおらず、平均年収がグループの実態を表さない
 * （日本マクドナルドは連結2,454人に対し単体2人）。伸び倍率もその分歪むため、
 * lib/financials.ts と同じ基準で除外する。
 */
const PARENT_RATIO_MIN = 0.05

const avgSalaryYen = (c: CompanyData): number | null => {
  const n = num(c.averageAnnualSalary)
  if (n === null) return null
  const parent = num(c.parentEmployees)
  const consolidated = num(c.reportedEmployees)
  if (parent !== null && consolidated !== null && parent / consolidated < PARENT_RATIO_MIN) {
    return null
  }
  return n * 10_000
}

/** 初任給ベースの年収（円）。想定年収があればそれを、無ければ月額×12で代用 */
const starterAnnualYen = (c: CompanyData): number | null => {
  const annual = num(c.annualSalary)
  if (annual !== null) return annual
  const monthly = num(c.baseMonthly)
  return monthly === null ? null : monthly * 12
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export interface SalaryGrowth {
  /** 初任給ベースの年収（円） */
  starterAnnual: number
  /** 全社員の平均年収（円） */
  averageAnnual: number
  /** 伸び倍率（平均年収 ÷ 初任給年収） */
  ratio: number
  /** 掲載企業の伸び倍率の中央値 */
  medianRatio: number
  /** 比較対象にした企業数 */
  sampleCount: number
  /** 中央値と比べた判定 */
  verdict: "high" | "similar" | "low"
  /** 【AI SEO】そのまま引用できる自己完結型の解説文 */
  summary: string
}

/**
 * 初任給と平均年収から「入社後の伸び」を分析する。
 * どちらかが欠けている企業では null を返し、UI側で非表示にする。
 */
export function buildSalaryGrowth(
  all: CompanyData[],
  company: CompanyData,
): SalaryGrowth | null {
  const starterAnnual = starterAnnualYen(company)
  const averageAnnual = avgSalaryYen(company)
  if (starterAnnual === null || averageAnnual === null) return null

  const ratio = averageAnnual / starterAnnual

  // 掲載企業全体の伸び倍率の中央値を毎回計算する。
  // 定数で持つと企業が増えたときに古い基準で判定し続けてしまう。
  const ratios: number[] = []
  for (const c of all) {
    const s = starterAnnualYen(c)
    const a = avgSalaryYen(c)
    if (s !== null && a !== null) ratios.push(a / s)
  }
  const medianRatio = median(ratios)
  // 母数が少ないと中央値が偶然に振れるため、10社未満なら判定しない
  if (medianRatio === null || ratios.length < 10) return null

  // 中央値の±15%以内は「平均的」とみなす（倍率は企業差が大きいため広めに取る）
  const upper = medianRatio * 1.15
  const lower = medianRatio * 0.85
  const verdict: SalaryGrowth["verdict"] =
    ratio > upper ? "high" : ratio < lower ? "low" : "similar"

  const man = (yen: number) => `${Math.round(yen / 10_000).toLocaleString()}万円`
  const r = (v: number) => `${Math.round(v * 10) / 10}倍`

  const verdictText =
    verdict === "high"
      ? `掲載企業の中央値（${r(medianRatio)}）を上回り、入社後に給与が大きく伸びるタイプです`
      : verdict === "low"
        ? `掲載企業の中央値（${r(medianRatio)}）を下回り、初任給の時点で既に高い水準に達しているタイプです`
        : `掲載企業の中央値（${r(medianRatio)}）と同程度の伸び方です`

  const summary =
    `${company.company}の初任給ベースの年収は${man(starterAnnual)}、` +
    `全社員の平均年収は${man(averageAnnual)}で、その差は${r(ratio)}です。` +
    `${verdictText}。` +
    `平均年収には管理職やベテラン社員が含まれるため、若手のうちからこの金額になるわけではありません。`

  return {
    starterAnnual,
    averageAnnual,
    ratio,
    medianRatio,
    sampleCount: ratios.length,
    verdict,
    summary,
  }
}
