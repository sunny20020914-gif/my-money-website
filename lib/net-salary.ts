// 初任給（月額額面）から手取り額を概算する純粋関数。
// 前提: 新卒・独身・扶養なし・東京勤務の概算値。
// - 健康保険: 協会けんぽ相当 約10%（労使折半で本人負担 5.0%）
// - 厚生年金: 18.3%（労使折半で本人負担 9.15%、標準報酬月額上限 65万円）
// - 雇用保険: 本人負担 0.55%
// - 所得税: 年収換算して給与所得控除・基礎控除・社会保険料控除を適用し、
//   税率表（復興特別所得税込み）で計算して月割り
// - 住民税: 新卒1年目は徴収されない（前年所得ゼロのため）。
//   2年目以降の目安として別途計算する（所得割10% + 均等割5,000円/年）

const HEALTH_RATE = 0.05
const HEALTH_CAP = 1_390_000 // 健康保険の標準報酬月額上限
const PENSION_RATE = 0.0915
const PENSION_CAP = 650_000 // 厚生年金の標準報酬月額上限
const EMPLOYMENT_RATE = 0.0055

// 給与所得控除（年収ベース・2020年分以降）
function salaryIncomeDeduction(annualGross: number): number {
  if (annualGross <= 1_625_000) return 550_000
  if (annualGross <= 1_800_000) return annualGross * 0.4 - 100_000
  if (annualGross <= 3_600_000) return annualGross * 0.3 + 80_000
  if (annualGross <= 6_600_000) return annualGross * 0.2 + 440_000
  if (annualGross <= 8_500_000) return annualGross * 0.1 + 1_100_000
  return 1_950_000
}

// 所得税額（課税所得ベース・復興特別所得税1.021倍込み）
function incomeTaxFromTaxable(taxable: number): number {
  let tax: number
  if (taxable <= 0) tax = 0
  else if (taxable <= 1_950_000) tax = taxable * 0.05
  else if (taxable <= 3_300_000) tax = taxable * 0.1 - 97_500
  else if (taxable <= 6_950_000) tax = taxable * 0.2 - 427_500
  else if (taxable <= 9_000_000) tax = taxable * 0.23 - 636_000
  else if (taxable <= 18_000_000) tax = taxable * 0.33 - 1_536_000
  else if (taxable <= 40_000_000) tax = taxable * 0.4 - 2_796_000
  else tax = taxable * 0.45 - 4_796_000
  return tax * 1.021
}

export interface NetSalaryEstimate {
  grossMonthly: number
  healthInsurance: number
  pension: number
  employmentInsurance: number
  socialInsuranceTotal: number
  incomeTaxMonthly: number
  /** 1年目の手取り（住民税なし） */
  netMonthlyFirstYear: number
  /** 2年目以降の住民税月額の目安 */
  residentTaxMonthly: number
  /** 2年目以降の手取りの目安 */
  netMonthlySecondYear: number
}

/**
 * 月額額面から手取りを概算する。
 * 月額が数値でない（"要確認"等）場合は null を返す。
 */
export function estimateNetSalary(grossMonthly: number | string | null | undefined): NetSalaryEstimate | null {
  if (typeof grossMonthly !== "number" || grossMonthly <= 0) return null

  const healthInsurance = Math.round(Math.min(grossMonthly, HEALTH_CAP) * HEALTH_RATE)
  const pension = Math.round(Math.min(grossMonthly, PENSION_CAP) * PENSION_RATE)
  const employmentInsurance = Math.round(grossMonthly * EMPLOYMENT_RATE)
  const socialInsuranceTotal = healthInsurance + pension + employmentInsurance

  // 所得税（賞与は含めない月給ベースの概算）
  const annualGross = grossMonthly * 12
  const annualSocial = socialInsuranceTotal * 12
  const taxableIncome = Math.max(
    0,
    annualGross - salaryIncomeDeduction(annualGross) - 480_000 - annualSocial,
  )
  const incomeTaxMonthly = Math.round(incomeTaxFromTaxable(taxableIncome) / 12)

  // 住民税（2年目以降の目安）: 基礎控除43万円・所得割10%・均等割5,000円/年
  const residentTaxable = Math.max(
    0,
    annualGross - salaryIncomeDeduction(annualGross) - 430_000 - annualSocial,
  )
  const residentTaxMonthly = Math.round((residentTaxable * 0.1 + 5_000) / 12)

  const netMonthlyFirstYear = grossMonthly - socialInsuranceTotal - incomeTaxMonthly
  const netMonthlySecondYear = netMonthlyFirstYear - residentTaxMonthly

  return {
    grossMonthly,
    healthInsurance,
    pension,
    employmentInsurance,
    socialInsuranceTotal,
    incomeTaxMonthly,
    netMonthlyFirstYear,
    residentTaxMonthly,
    netMonthlySecondYear,
  }
}

/** 概算らしさを保つため千円単位に丸めた表示用の値を返す */
export const roundNet = (v: number): number => Math.round(v / 1000) * 1000
