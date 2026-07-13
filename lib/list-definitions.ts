import type { CompanyData } from "./sheets"
import { FISCAL_YEAR } from "./config"

// 条件別一覧ページ（/lists/[slug]）の定義。
// スプシの取得済みデータをフィルタ・ソートするだけで生成する（AI不使用）。
// 条件を追加したいときはこの配列に定義を足すだけでページ・sitemap・導線すべてに反映される。

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

export interface ListDefinition {
  slug: string
  /** h1・titleに使う正式名称 */
  name: string
  /** リンクチップ等に使う短い表示名 */
  shortName: string
  /** meta description */
  description: string
  /** 一覧の抽出条件 */
  filter: (c: CompanyData) => boolean
  /** 並び順（デフォルト: 初任給降順） */
  sortKey?: "monthly" | "annual"
}

export const LIST_DEFINITIONS: ListDefinition[] = [
  {
    slug: "starting-salary-400k",
    name: `初任給40万円以上の企業一覧【${FISCAL_YEAR}年最新】`,
    shortName: "初任給40万円以上",
    description: `${FISCAL_YEAR}年度の新卒初任給が月額40万円以上の企業を一覧掲載。企業ごとの想定年収・手取り目安・業界も比較できます。`,
    filter: (c) => (num(c.baseMonthly) ?? 0) >= 400_000,
  },
  {
    slug: "starting-salary-350k",
    name: `初任給35万円以上の企業一覧【${FISCAL_YEAR}年最新】`,
    shortName: "初任給35万円以上",
    description: `${FISCAL_YEAR}年度の新卒初任給が月額35万円以上の企業を一覧掲載。大手からベンチャーまで高水準の初任給を出す企業を比較できます。`,
    filter: (c) => (num(c.baseMonthly) ?? 0) >= 350_000,
  },
  {
    slug: "starting-salary-300k",
    name: `初任給30万円以上の企業一覧【${FISCAL_YEAR}年最新】`,
    shortName: "初任給30万円以上",
    description: `${FISCAL_YEAR}年度の新卒初任給が月額30万円以上の企業を一覧掲載。初任給30万円台の企業を業界横断で探せます。`,
    filter: (c) => (num(c.baseMonthly) ?? 0) >= 300_000,
  },
  {
    slug: "annual-salary-5m",
    name: `新卒想定年収500万円以上の企業一覧【${FISCAL_YEAR}年最新】`,
    shortName: "想定年収500万円以上",
    description: `新卒1年目の想定年収が500万円以上の企業を一覧掲載（${FISCAL_YEAR}年度）。初任給・従業員数もあわせて比較できます。`,
    filter: (c) => (num(c.annualSalary) ?? 0) >= 5_000_000,
    sortKey: "annual",
  },
  {
    slug: "large-companies",
    name: `従業員5,000人以上の大手企業 初任給一覧【${FISCAL_YEAR}年最新】`,
    shortName: "従業員5,000人以上の大手",
    description: `従業員数5,000人以上の大手企業の初任給・想定年収を一覧比較（${FISCAL_YEAR}年度）。安定志向の就活生向けの大企業リストです。`,
    filter: (c) => typeof c.employees === "number" && c.employees >= 5_000,
  },
  {
    slug: "young-growth-companies",
    name: `設立15年以内で初任給が高い成長企業一覧【${FISCAL_YEAR}年最新】`,
    shortName: "設立15年以内の成長企業",
    description: `設立15年以内の若い企業のうち初任給水準が高い成長企業を一覧掲載（${FISCAL_YEAR}年度）。ベンチャー・スタートアップ志向の就活生向け。`,
    filter: (c) =>
      typeof c.founded === "number" &&
      c.founded >= FISCAL_YEAR - 15 &&
      c.founded <= FISCAL_YEAR &&
      (num(c.baseMonthly) ?? 0) > 0,
  },
]

export const getListBySlug = (slug: string): ListDefinition | undefined =>
  LIST_DEFINITIONS.find((d) => d.slug === slug)

/** 定義に従って企業を抽出・ソートして返す */
export function buildList(def: ListDefinition, all: CompanyData[]): CompanyData[] {
  const key = def.sortKey ?? "monthly"
  return all
    .filter(def.filter)
    .sort((a, b) => {
      const av = key === "annual" ? num(a.annualSalary) : num(a.baseMonthly)
      const bv = key === "annual" ? num(b.annualSalary) : num(b.baseMonthly)
      return (bv ?? 0) - (av ?? 0)
    })
}

/** 一覧の冒頭に置く「答えを先に書く」サマリー（集計値＝独自データ） */
export function buildListLeadSummary(def: ListDefinition, companies: CompanyData[]): string {
  if (companies.length === 0) return ""
  const monthlies = companies
    .map((c) => num(c.baseMonthly))
    .filter((v): v is number => v !== null)
  const parts: string[] = [
    `${FISCAL_YEAR}年度時点で、当サイト掲載企業のうち「${def.shortName}」に該当するのは${companies.length}社です。`,
  ]
  if (monthlies.length > 1) {
    const avg = Math.round(monthlies.reduce((s, v) => s + v, 0) / monthlies.length)
    parts.push(`該当企業の平均初任給は月額${avg.toLocaleString()}円です。`)
  }
  const top = companies[0]
  const topVal = def.sortKey === "annual" ? num(top.annualSalary) : num(top.baseMonthly)
  if (topVal !== null) {
    const label = def.sortKey === "annual" ? "想定年収" : "初任給"
    parts.push(`最高は${top.company}の${label}${topVal.toLocaleString()}円です。`)
  }
  return parts.join("")
}
