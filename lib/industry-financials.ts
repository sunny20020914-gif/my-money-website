import type { CompanyData } from "./sheets"
import { meaningfulAverageSalary, LISTED_COMPANY_NOTE } from "./financials"

// ------------------------------------------------------------------
// 【業界ページに独自データを足す】
//
// Search Consoleの実測で、業界ページが最も勝てていることが分かった。
//   「ゲーム会社 初任給 ランキング」 … 2.0位
//   /industries/製薬                … 6.2位
//   /industries/上場                … 8.8位
// 一方、力を入れてきた /ranking は36.5位。競合が薄いのは業界軸のほう。
//
// ところが業界ページが持っているのは初任給だけで、
// せっかく取り込んだ有価証券報告書のデータを一切使っていなかった。
//
// 「この業界の平均年収はいくらか」「初任給から何倍に伸びるか」を
// 業界単位で出せるサイトは他にほとんど無い。
// 大手就活サイトは初任給しか持たず、年収サイトは初任給を持たないため、
// 両方を突き合わせられるのが当サイトだけの強みになる。
//
// 【中央値を使う理由】
// 業界内の企業数は数社〜数十社と幅があり、1社の突出した数値で
// 平均が動いてしまう。中央値なら外れ値に強く、実感に近い数字になる。
// ------------------------------------------------------------------

const MAN = 10_000

const positive = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null

const finite = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const splitIndustries = (s: string): string[] =>
  (s || "").split("/").map((i) => i.trim()).filter(Boolean)

/** 初任給ベースの年収（円）。想定年収があればそれを、無ければ月額×12 */
const starterAnnualYen = (c: CompanyData): number | null => {
  const annual = positive(c.annualSalary)
  if (annual !== null) return annual
  const monthly = positive(c.baseMonthly)
  return monthly === null ? null : monthly * 12
}

/** 社名で1社に寄せる（同じ企業の職種違いの行をまとめる） */
function dedupeByCompany(all: CompanyData[]): CompanyData[] {
  const best = new Map<string, CompanyData>()
  for (const c of all) {
    const name = (c.company ?? "").trim()
    if (!name) continue
    const prev = best.get(name)
    if (!prev || (starterAnnualYen(c) ?? 0) > (starterAnnualYen(prev) ?? 0)) best.set(name, c)
  }
  return Array.from(best.values())
}

/** 1つの指標について、業界の中央値と全業界での順位を持つ */
export interface IndustryMetric {
  key: string
  label: string
  /** 表示用に整形済みの値 */
  display: string
  /** 並べ替え用の生の値 */
  value: number
  /** 集計に使えた企業数 */
  sampleCount: number
  /** 対象業界の中で何位か（1が最も高い） */
  rank: number
  /** 順位付けの母数になった業界数 */
  totalIndustries: number
  /** 上位1/3に入っているか */
  isTop: boolean
  /** その指標が何を意味するかの1行説明 */
  note: string
}

export interface IndustryFinancials {
  industry: string
  metrics: IndustryMetric[]
  /** 自動生成の解説文 */
  paragraphs: string[]
  /** データの注記 */
  note: string
}

interface MetricDef {
  key: string
  label: string
  note: string
  /** 企業から値を取り出す。対象外は null */
  extract: (c: CompanyData) => number | null
  format: (v: number) => string
  /** 3社未満の業界では出さない指標かどうか（既定は3社） */
  minSample?: number
}

const METRIC_DEFS: MetricDef[] = [
  {
    key: "average",
    label: "平均年収の中央値",
    note: "有価証券報告書に基づく全社員の平均年収。管理職を含むため新卒の年収とは異なります。",
    extract: (c) => meaningfulAverageSalary(c),
    format: (v) => `${Math.round(v).toLocaleString()}万円`,
  },
  {
    key: "growth",
    label: "初任給からの伸び倍率",
    note: "平均年収が初任給ベースの年収の何倍かを示します。入社後にどれだけ上がるかの目安です。",
    extract: (c) => {
      const s = starterAnnualYen(c)
      const a = meaningfulAverageSalary(c)
      if (s === null || a === null) return null
      return (a * MAN) / s
    },
    format: (v) => `${Math.round(v * 10) / 10}倍`,
  },
  {
    key: "margin",
    label: "営業利益率の中央値",
    note: "売上高に対する営業利益の割合。業界によって適正水準が大きく異なります。",
    extract: (c) => finite(c.operatingMargin),
    format: (v) => `${Math.round(v * 10) / 10}%`,
  },
  {
    key: "profitPerEmployee",
    label: "一人当たり営業利益",
    note: "社員1人が生む利益。給与の原資がどれだけあるかの目安になります。",
    extract: (c) => finite(c.profitPerEmployee),
    format: (v) => `${Math.round(v).toLocaleString()}万円`,
  },
]

/** 業界ごとの中央値を計算して、指標ごとに順位を付けたマップを返す */
function computeMedians(
  all: CompanyData[],
  def: MetricDef,
): Map<string, { value: number; count: number }> {
  const unique = dedupeByCompany(all)
  const byIndustry = new Map<string, number[]>()

  for (const c of unique) {
    const v = def.extract(c)
    if (v === null) continue
    for (const ind of splitIndustries(c.industry)) {
      if (!byIndustry.has(ind)) byIndustry.set(ind, [])
      byIndustry.get(ind)!.push(v)
    }
  }

  const min = def.minSample ?? 3
  const out = new Map<string, { value: number; count: number }>()
  for (const [ind, vs] of byIndustry) {
    if (vs.length < min) continue
    out.set(ind, { value: median(vs)!, count: vs.length })
  }
  return out
}

/**
 * 指定業界の財務指標をまとめる。
 *
 * @param all 全掲載企業
 * @param industry 対象の業界名
 */
export function buildIndustryFinancials(
  all: CompanyData[],
  industry: string,
): IndustryFinancials | null {
  const metrics: IndustryMetric[] = []

  for (const def of METRIC_DEFS) {
    const medians = computeMedians(all, def)
    const own = medians.get(industry)
    if (!own) continue

    // 全業界の中での順位。母数が少なすぎると順位に意味が無いので3業界以上を条件にする
    const values = Array.from(medians.values()).map((m) => m.value)
    if (values.length < 3) continue
    const rank = values.filter((v) => v > own.value).length + 1

    metrics.push({
      key: def.key,
      label: def.label,
      display: def.format(own.value),
      value: own.value,
      sampleCount: own.count,
      rank,
      totalIndustries: values.length,
      isTop: rank <= Math.max(1, Math.ceil(values.length / 3)),
      note: def.note,
    })
  }

  if (metrics.length === 0) return null

  return {
    industry,
    metrics,
    paragraphs: buildParagraphs(industry, metrics),
    note: LISTED_COMPANY_NOTE,
  }
}

function buildParagraphs(industry: string, metrics: IndustryMetric[]): string[] {
  const paragraphs: string[] = []
  const find = (k: string) => metrics.find((m) => m.key === k)

  const avg = find("average")
  const growth = find("growth")
  const margin = find("margin")
  const ppe = find("profitPerEmployee")

  // ① 平均年収と伸び倍率。就活生が最も知りたい「入社後どうなるか」
  if (avg && growth) {
    paragraphs.push(
      `${industry}業界で平均年収が判明している${avg.sampleCount}社を集計すると、中央値は${avg.display}でした（${avg.totalIndustries}業界中${avg.rank}位）。` +
        `初任給ベースの年収からの伸び倍率は${growth.display}が中央値で、こちらは${growth.totalIndustries}業界中${growth.rank}位です。` +
        `${
          growth.isTop
            ? "入社後に給与が大きく伸びる業界だといえます。"
            : "入社時点の金額と入社後の水準に、極端な開きは無い業界です。"
        }`,
    )
  } else if (avg) {
    paragraphs.push(
      `${industry}業界で平均年収が判明している${avg.sampleCount}社の中央値は${avg.display}です（${avg.totalIndustries}業界中${avg.rank}位）。` +
        `有価証券報告書に基づく全社員の平均であり、新卒の年収とは異なります。`,
    )
  }

  // ② 収益構造。なぜその給与水準なのかの裏付け
  if (margin && ppe) {
    paragraphs.push(
      `収益面では、営業利益率の中央値が${margin.display}（${margin.totalIndustries}業界中${margin.rank}位）、` +
        `社員一人当たりの営業利益は${ppe.display}（${ppe.totalIndustries}業界中${ppe.rank}位）です。` +
        `${
          ppe.isTop
            ? "少人数で大きな利益を生む構造で、給与を高く保てる裏付けがあります。"
            : "人手を多く要する構造のため、一人当たりの利益は大きくなりにくい業界です。"
        }` +
        `給与の高さがこうした収益力に支えられているかどうかは、各企業のページで個別に確認できます。`,
    )
  } else if (margin) {
    paragraphs.push(
      `営業利益率の中央値は${margin.display}で、${margin.totalIndustries}業界中${margin.rank}位です。` +
        `利益率は業界構造でほぼ決まるため、業界をまたいだ比較よりも同じ業界の中での位置づけを見るのが適切です。`,
    )
  }

  return paragraphs
}
