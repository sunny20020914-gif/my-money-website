import type { CompanyData } from "./sheets"
import { FISCAL_YEAR } from "./config"

// クロス条件一覧ページ（/lists/[slug]）の定義を、取得済みデータから動的に生成する。
// 「業界 × 初任給閾値」「大手 × 閾値」「成長企業 × 閾値」の組み合わせのうち、
// - 該当企業が MIN_COMPANIES 社以上
// - かつ母集団の全社が該当するわけではない（＝業界ページの複製にならない）
// ものだけをページ化する。単一条件ページは作らない（ランキングの部分集合にしかならないため）。

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && v > 0 ? v : null

const splitIndustries = (industry: string): string[] =>
  (industry || "")
    .split("/")
    .map((i) => i.trim())
    .filter(Boolean)

const THRESHOLDS = [300_000, 350_000, 400_000]
const MIN_COMPANIES = 3

interface Segment {
  key: string // slugに使うキー（業界名 or "large" / "young"）
  label: string // 「メーカー業界」「従業員5,000人以上の大手企業」
  shortLabel: string // チップ表示用「メーカー」「大手」
  industry?: string // 業界セグメントの場合のみ
  filter: (c: CompanyData) => boolean
}

export interface ListDefinition {
  slug: string
  name: string
  shortName: string
  description: string
  segmentLabel: string
  industry?: string
  threshold: number
  /** 該当企業数（生成時点） */
  count: number
  /** セグメント母集団の企業数（初任給データがあるもの） */
  baseCount: number
  filter: (c: CompanyData) => boolean
}

const manUnit = (t: number) => `${t / 10_000}万円`

function buildSegments(all: CompanyData[]): Segment[] {
  const industries = Array.from(
    new Set(all.flatMap((c) => splitIndustries(c.industry))),
  ).sort()

  return [
    ...industries.map((ind) => ({
      key: ind,
      label: `${ind}業界`,
      shortLabel: ind,
      industry: ind,
      filter: (c: CompanyData) => splitIndustries(c.industry).includes(ind),
    })),
    {
      key: "large",
      label: "従業員5,000人以上の大手企業",
      shortLabel: "大手",
      filter: (c: CompanyData) => typeof c.employees === "number" && c.employees >= 5_000,
    },
    {
      key: "young",
      label: "設立15年以内の成長企業",
      shortLabel: "成長企業",
      filter: (c: CompanyData) =>
        typeof c.founded === "number" &&
        c.founded >= FISCAL_YEAR - 15 &&
        c.founded <= FISCAL_YEAR,
    },
  ]
}

/** 全ての有効なクロス条件ページの定義を生成する（該当数の多い順） */
export function buildAllListDefinitions(all: CompanyData[]): ListDefinition[] {
  const defs: ListDefinition[] = []

  for (const seg of buildSegments(all)) {
    // 母集団: セグメントに属し、初任給が数値で入っている企業
    const base = all.filter((c) => seg.filter(c) && num(c.baseMonthly) !== null)

    for (const t of THRESHOLDS) {
      const matched = base.filter((c) => (num(c.baseMonthly) as number) >= t)
      // 3社未満（薄い）または全社該当（業界ページと同じ内容）は作らない
      if (matched.length < MIN_COMPANIES || matched.length >= base.length) continue

      const filter = (c: CompanyData) =>
        seg.filter(c) && (num(c.baseMonthly) ?? 0) >= t

      defs.push({
        slug: `${seg.key}--over-${t / 10_000}man`,
        name: `${seg.label}で初任給${manUnit(t)}以上の企業一覧【${FISCAL_YEAR}年最新】`,
        shortName: `${seg.shortLabel}×初任給${manUnit(t)}以上`,
        description: `${FISCAL_YEAR}年度、${seg.label}の掲載${base.length}社中${matched.length}社が初任給月額${manUnit(t)}以上。該当企業の初任給・想定年収・手取り目安を一覧比較できます。`,
        segmentLabel: seg.label,
        industry: seg.industry,
        threshold: t,
        count: matched.length,
        baseCount: base.length,
        filter,
      })
    }
  }

  return defs.sort((a, b) => b.count - a.count)
}

export function getListBySlug(slug: string, all: CompanyData[]): ListDefinition | undefined {
  return buildAllListDefinitions(all).find((d) => d.slug === slug)
}

/** 定義に従って企業を抽出し初任給降順で返す */
export function buildList(def: ListDefinition, all: CompanyData[]): CompanyData[] {
  return all
    .filter(def.filter)
    .sort((a, b) => (num(b.baseMonthly) ?? 0) - (num(a.baseMonthly) ?? 0))
}

/** 一覧冒頭の「答えを先に書く」サマリー。母集団に対する比率＝当サイト独自の集計値 */
export function buildListLeadSummary(def: ListDefinition, companies: CompanyData[]): string {
  if (companies.length === 0) return ""
  const pct = Math.round((companies.length / def.baseCount) * 100)
  const parts: string[] = [
    `${FISCAL_YEAR}年度時点で、${def.segmentLabel}の掲載${def.baseCount}社のうち初任給が月額${manUnit(def.threshold)}以上なのは${companies.length}社（${pct}%）です。`,
  ]
  const monthlies = companies
    .map((c) => num(c.baseMonthly))
    .filter((v): v is number => v !== null)
  if (monthlies.length > 1) {
    const avg = Math.round(monthlies.reduce((s, v) => s + v, 0) / monthlies.length)
    parts.push(`該当企業の平均初任給は月額${avg.toLocaleString()}円です。`)
  }
  const top = companies[0]
  const topVal = num(top.baseMonthly)
  if (topVal !== null) {
    parts.push(`最高は${top.company}の${topVal.toLocaleString()}円です。`)
  }
  return parts.join("")
}
