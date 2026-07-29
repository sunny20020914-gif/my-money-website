import type { CompanyData } from "./sheets"

// ランキングカード等に表示する財務指標を「配列」として組み立てるヘルパー。
//
// 【設計意図】
// カード内に指標を直接ベタ書きすると、指標が増えるたびにJSXとレイアウトを
// 触ることになりUIが崩れやすい。ここで {label, value} の配列を返す形にしておけば、
// 表示側は配列を map してグリッドに流し込むだけで済み、
// 指標を増やしても表示側のコードは一切変更不要になる。
//
// 【指標の増やし方】
// 1. lib/sheets.ts の CompanyData に列を1つ足す
// 2. lib/sheets.ts のパース行を1行足す
// 3. このファイルの METRIC_DEFS に1エントリ足す
// → カードのJSXは触らなくてよい

/** 数値として有効な値だけを取り出す（"非公開" 等の文字列や空欄は除外） */
const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && isFinite(v) && v > 0 ? v : null

/**
 * 金額を日本語の単位で読みやすく整形する。
 * 例: 1_200_000_000_000 → "1.2兆円" / 85_000_000_000 → "850億円" / 5_000_000 → "500万円"
 * スプシに「1.2兆円」のような文字列が直接入っていた場合はそのまま表示する。
 */
export function formatAmount(v: number | string | null | undefined): string | null {
  if (typeof v === "string") {
    const t = v.trim()
    return t === "" ? null : t
  }
  const n = num(v)
  if (n === null) return null

  if (n >= 1_000_000_000_000) {
    const val = n / 1_000_000_000_000
    return `${val >= 10 ? Math.round(val) : Math.round(val * 10) / 10}兆円`
  }
  if (n >= 100_000_000) {
    const val = n / 100_000_000
    return `${val >= 10 ? Math.round(val) : Math.round(val * 10) / 10}億円`
  }
  if (n >= 10_000) {
    return `${Math.round(n / 10_000)}万円`
  }
  return `${n.toLocaleString()}円`
}

/** パーセント値の整形。数値なら "7.1%"、文字列ならそのまま */
export function formatPercent(v: number | string | null | undefined): string | null {
  if (typeof v === "string") {
    const t = v.trim()
    if (t === "") return null
    return t.endsWith("%") ? t : `${t}%`
  }
  const n = typeof v === "number" && isFinite(v) ? v : null
  if (n === null) return null
  return `${Math.round(n * 10) / 10}%`
}

export interface FinancialMetric {
  key: string
  label: string
  value: string
}

/**
 * 指標の定義表。ここに1エントリ足すだけで、カードに新しい指標が並ぶ。
 * format が null を返した指標（データなし）は自動的に除外される。
 */
const METRIC_DEFS: {
  key: string
  label: string
  format: (c: CompanyData) => string | null
}[] = [
  { key: "revenue", label: "売上高", format: (c) => formatAmount(c.revenue) },
  { key: "operatingProfit", label: "営業利益", format: (c) => formatAmount(c.operatingProfit) },
  { key: "operatingMargin", label: "営業利益率", format: (c) => formatPercent(c.operatingMargin) },
]

/**
 * その企業について表示可能な財務指標だけを配列で返す。
 * データが1つも無ければ空配列を返すので、表示側は length で行ごと出し分けできる。
 */
export function buildFinancialMetrics(company: CompanyData): FinancialMetric[] {
  const metrics: FinancialMetric[] = []
  for (const def of METRIC_DEFS) {
    const value = def.format(company)
    if (value !== null) {
      metrics.push({ key: def.key, label: def.label, value })
    }
  }
  return metrics
}
