import type { CompanyData } from "./sheets"
import { getCompareCandidates } from "./company-stats"

// 企業比較ページ（/compare/[pair]）のスラッグ処理とペア生成。
// ペアはID辞書順で正規化し、A-vs-B と B-vs-A の重複ページを防ぐ。

export const pairSlug = (a: string, b: string): string =>
  a < b ? `${a}-vs-${b}` : `${b}-vs-${a}`

export function parsePairSlug(slug: string): [string, string] | null {
  const parts = slug.split("-vs-")
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return [parts[0], parts[1]]
}

/** 全企業の比較候補（同業界・初任給が近い順）から重複排除した正規化ペア一覧 */
export function buildComparePairs(all: CompanyData[], perCompany = 2): string[] {
  const set = new Set<string>()
  for (const c of all) {
    if (!c.id) continue
    for (const partner of getCompareCandidates(all, c, perCompany)) {
      set.add(pairSlug(c.id, partner.id))
    }
  }
  return Array.from(set)
}
