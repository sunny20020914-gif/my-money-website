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

/** 赤字（マイナス）も有効な実態なので、0以外の数値を通す版 */
const numAllowNegative = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && isFinite(v) && v !== 0 ? v : null

// ------------------------------------------------------------------
// 【単位換算】スプレッドシートには元データ（EDINET）の単位のまま入力する。
// 桁を手で直すと入力ミスが起きるため、換算は必ずコード側で行う。
//   百万円 → 円: ×1,000,000
//   万円   → 円: ×10,000
// ------------------------------------------------------------------
const MILLION = 1_000_000
const MAN = 10_000

// ------------------------------------------------------------------
// 【会計基準の注記】
// 当初はIFRS企業の営業利益が誤って抽出されていたため会計基準で非表示にしていたが、
// 「主要な経営指標等の推移」の事業利益を参照する方式に修正され、
// 総合商社をはじめ正しい値が取得できるようになったため制限を解除した。
// （三菱商事 −1,874億円 → 1兆961億円／伊藤忠 0.2% → 8.1% で改善を確認）
//
// ただしIFRSの「事業利益」と日本基準の「営業利益」は厳密には別概念のため、
// 会計基準は注記の出し分けに使う（isIfrsLike）。
// ------------------------------------------------------------------
export const isIfrsLike = (c: CompanyData): boolean => {
  const std = (c.accountingStandard ?? "").trim()
  return std === "IFRS" || std === "米国基準"
}

/** 営業利益の項目名。IFRS系は「事業利益」と呼ぶため表示名を変える */
const profitLabel = (c: CompanyData): string =>
  isIfrsLike(c) ? "事業利益" : "営業利益"

// ------------------------------------------------------------------
// 【重要・持株会社の平均年収を除外する安全弁】
// 平均年間給与は有報の「従業員の状況」に載る提出会社（単体）の値。
// 持株会社形態だと単体には管理部門の数名〜数百名しか在籍しておらず、
// グループ社員の実態を全く表さない。実データで確認した例:
//   日本マクドナルド … 連結2,454人に対し単体2人（平均年収1,293万円）
//   電通             … 連結67,454人に対し単体135人
//   リクルート        … 連結45,586人に対し単体130人
// 単体比率5%未満の21社は平均年収の中央値が1,171万円と、
// 50%以上の企業（780万円）より明らかに高く出ており、幹部偏重が確認できる。
// これを「その会社の平均年収」として出すと誤情報になるため非表示にする。
// ------------------------------------------------------------------
const PARENT_RATIO_MIN = 0.05

const isAverageSalaryMeaningful = (c: CompanyData): boolean => {
  const avg = num(c.averageAnnualSalary)
  if (avg === null) return false
  const parent = num(c.parentEmployees)
  const consolidated = num(c.reportedEmployees)
  // 判定材料が無い場合は表示する（大半の企業は持株会社ではないため）
  if (parent === null || consolidated === null) return true
  return parent / consolidated >= PARENT_RATIO_MIN
}

/** 平均年収を、実態を表していると判断できる場合のみ通す */
export const meaningfulAverageSalary = (c: CompanyData): number | null =>
  isAverageSalaryMeaningful(c) ? num(c.averageAnnualSalary) : null

// ------------------------------------------------------------------
// 【重要・平均年収の母集団に関する注記】
//
// 平均年間給与は有価証券報告書の記載事項であり、有報の提出義務があるのは
// 原則として上場企業。したがって当サイトの平均年収は「上場企業の数値」である。
//
// これを書かないと、読者は掲載企業の平均年収を日本企業全体の相場だと
// 誤解する。上場企業は非上場を含む全企業より給与水準が高いため、
// 母集団を明示しないと数字が独り歩きしてしまう。
//
// ただし、非上場でも有報の提出義務を負う企業（社債発行企業、
// 株主数が一定以上の企業など）は存在し、当サイトにも一部含まれる。
// 「すべて上場企業」と断言すると不正確になるため「原則として」と書く。
//
// 文言はこの定数から参照すること。ページごとに書き分けると
// 表現が揺れ、どれが正しいのか分からなくなる。
// ------------------------------------------------------------------

/** 平均年収の母集団に関する注記（通常の長さ）。本文や注記欄で使う */
export const LISTED_COMPANY_NOTE =
  "平均年収は有価証券報告書の「平均年間給与」に基づくため、原則として上場企業の数値です（有価証券報告書を提出している一部の非上場企業を含みます）。"

/** 同じ内容の短縮版。カード内など文字数に余裕がない場所で使う */
export const LISTED_COMPANY_NOTE_SHORT =
  "平均年収は有価証券報告書ベース（原則として上場企業の数値）"

/** 百万円で入力された値を円に換算する（マイナス＝赤字も通す） */
const fromMillionYen = (v: number | string | null | undefined): number | string | null => {
  if (typeof v === "string") return v.trim() === "" ? null : v.trim()
  const n = numAllowNegative(v)
  return n === null ? null : n * MILLION
}

/** 万円で入力された値を円に換算する（マイナス＝赤字も通す） */
const fromManYen = (v: number | string | null | undefined): number | string | null => {
  if (typeof v === "string") return v.trim() === "" ? null : v.trim()
  const n = numAllowNegative(v)
  return n === null ? null : n * MAN
}

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
  const raw = numAllowNegative(v)
  if (raw === null) return null

  // 営業利益は赤字（マイナス）があり得る。符号を保ったまま桁を丸める。
  const sign = raw < 0 ? "−" : ""
  const n = Math.abs(raw)

  if (n >= 1_000_000_000_000) {
    const val = n / 1_000_000_000_000
    return `${sign}${val >= 10 ? Math.round(val) : Math.round(val * 10) / 10}兆円`
  }
  if (n >= 100_000_000) {
    const val = n / 100_000_000
    return `${sign}${val >= 10 ? Math.round(val) : Math.round(val * 10) / 10}億円`
  }
  if (n >= 10_000) {
    return `${sign}${Math.round(n / 10_000).toLocaleString()}万円`
  }
  return `${sign}${n.toLocaleString()}円`
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
  // 金額側（formatAmount）と同じ全角相当のマイナス記号に揃える。
  // ハイフンだと数字に埋もれて赤字だと気づきにくい。
  const sign = n < 0 ? "−" : ""
  return `${sign}${Math.round(Math.abs(n) * 10) / 10}%`
}

/** 人数の整形（例: 12,784人）。金額と違い単位換算は不要 */
export function formatHeadcount(v: number | string | null | undefined): string | null {
  if (typeof v === "string") {
    const t = v.trim()
    return t === "" ? null : t
  }
  const n = num(v)
  return n === null ? null : `${Math.round(n).toLocaleString()}人`
}

export interface FinancialMetric {
  key: string
  label: string
  value: string
  /** 掲載企業内での順位（1が最高値）。比較できる企業が少ない場合は undefined */
  rank?: number
  /** 順位の母数 */
  total?: number
  /** 上位10%以内か（赤字強調の判定に使う） */
  isTop?: boolean
}

/** その指標の生値（順位計算用）。数値でなければ null */
type RawGetter = (c: CompanyData) => number | null

const RAW_GETTERS: Record<string, RawGetter> = {
  averageAnnualSalary: (c) => meaningfulAverageSalary(c),
  revenue: (c) => num(c.revenue),
  operatingProfit: (c) => numAllowNegative(c.operatingProfit),
  operatingMargin: (c) => numAllowNegative(c.operatingMargin),
  salesPerEmployee: (c) => num(c.salesPerEmployee),
  profitPerEmployee: (c) => numAllowNegative(c.profitPerEmployee),
  capitalPerEmployee: (c) => num(c.capitalPerEmployee),
}

/**
 * 指標ごとの順位を計算する。
 * 「売上高965億円」だけでは高いのか低いのか伝わらないため、
 * 掲載企業の中で何位かを添えて相対的な位置を示す。
 */
function computeRank(
  all: CompanyData[],
  company: CompanyData,
  key: string,
): { rank: number; total: number; isTop: boolean } | undefined {
  const getter = RAW_GETTERS[key]
  if (!getter) return undefined
  const own = getter(company)
  if (own === null) return undefined

  const values = all.map(getter).filter((v): v is number => v !== null)
  // 母数が少ないと順位に意味がないため10社未満なら出さない
  if (values.length < 10) return undefined

  const rank = values.filter((v) => v > own).length + 1
  return {
    rank,
    total: values.length,
    isTop: rank <= Math.max(1, Math.ceil(values.length * 0.1)),
  }
}

/**
 * 指標の定義表。ここに1エントリ足すだけで、カードに新しい指標が並ぶ。
 * format が null を返した指標（データなし）は自動的に除外される。
 */
const METRIC_DEFS: {
  key: string
  /** 表示名。会計基準で呼び方が変わる項目があるため関数で返す */
  label: (c: CompanyData) => string
  /** カードにも出すか（false は企業詳細ページのみ） */
  onCard: boolean
  format: (c: CompanyData) => string | null
}[] = [
  {
    // 全社員の平均年収。有報の実額なので精度が高く、就活生の関心も最も高い。
    key: "averageAnnualSalary",
    // 【表記の正確性】有報の「平均年間給与」は提出会社（単体）の値であり、
    // 連結ベースの平均年収という数値は有報に存在しない。
    // そのため「（連結）」とは書けない。従業員数の表記（連結／単体）と揃えて「（単体）」とする。
    // なお単体比率5%未満の持株会社は meaningfulAverageSalary で除外済み。
    label: () => "平均年収（単体）",
    onCard: true,
    format: (c) => formatAmount(fromManYen(meaningfulAverageSalary(c))),
  },
  {
    key: "revenue",
    label: () => "売上高",
    onCard: true,
    format: (c) => formatAmount(fromMillionYen(c.revenue)),
  },
  {
    key: "operatingProfit",
    label: (c) => profitLabel(c),
    onCard: false,
    format: (c) => formatAmount(fromMillionYen(c.operatingProfit)),
  },
  {
    key: "operatingMargin",
    label: (c) => `${profitLabel(c)}率`,
    onCard: true,
    format: (c) => formatPercent(c.operatingMargin),
  },
  // 【非表示】従業員数は給与カード側に既に表示があり、業績データ表では冗長なため出さない。
  // 一人当たり指標の分母がどの範囲かは buildPerEmployeeNote の注記で説明する。
  {
    key: "salesPerEmployee",
    label: () => "一人当たり売上高",
    onCard: false,
    format: (c) => formatAmount(fromManYen(c.salesPerEmployee)),
  },
  {
    // 「社員1人がいくら稼いでいるか」＝給与の原資
    key: "profitPerEmployee",
    label: (c) => `一人当たり${profitLabel(c)}`,
    onCard: false,
    format: (c) => formatAmount(fromManYen(c.profitPerEmployee)),
  },
  {
    // 設備の厚さ。装置産業か労働集約型かの判別に使う
    key: "capitalPerEmployee",
    label: () => "一人当たり設備額",
    onCard: false,
    format: (c) => formatAmount(fromManYen(c.capitalPerEmployee)),
  },
  // 【未使用】労働分配率は正確な人件費が用意できたら有効化する:
  // { key: "laborShare", label: () => "労働分配率", onCard: false,
  //   format: (c) => formatPercent(c.laborShare) },
]

/**
 * その企業について表示可能な財務指標だけを配列で返す。
 * データが1つも無ければ空配列を返すので、表示側は length で行ごと出し分けできる。
 */
/**
 * 企業詳細ページ用の全指標。
 * @param all 掲載企業全体。渡すと各指標に順位が付く（省略時は順位なし）
 */
export function buildFinancialMetrics(
  company: CompanyData,
  all?: CompanyData[],
): FinancialMetric[] {
  const metrics: FinancialMetric[] = []
  for (const def of METRIC_DEFS) {
    const value = def.format(company)
    if (value !== null) {
      const ranking = all ? computeRank(all, company, def.key) : undefined
      metrics.push({
        key: def.key,
        label: def.label(company),
        value,
        ...(ranking ?? {}),
      })
    }
  }
  return metrics
}

/**
 * ランキングカード用（onCard: true の3項目・固定）。
 *
 * 【データが無い項目は隠さず「-」で出す】
 * 以前は値が取れない指標をカードから丸ごと隠していたが、それだと
 *   ・そもそもデータが無い（非上場・外資日本法人など有報が無い企業）
 *   ・持株会社ガードで意図的に隠している（平均年収）
 * のどちらなのかが読者にも運営者にも区別できず、
 * 「スプシに入れたのに表示されない」という混乱の原因になっていた。
 * 項目名は常に3つ並べ、値だけを「-」にすることで
 * 欠測が仕様であることが一目で伝わり、カードの高さと列位置も揃う。
 * （企業詳細ページの表は従来どおり、データがある指標だけを出す）
 */
export function buildCardFinancialMetrics(company: CompanyData): FinancialMetric[] {
  const metrics: FinancialMetric[] = []
  for (const def of METRIC_DEFS) {
    if (!def.onCard) continue
    const value = def.format(company)
    metrics.push({ key: def.key, label: def.label(company), value: value ?? "-" })
  }
  return metrics
}

/**
 * 一人当たり指標に添える注記を組み立てる。
 *
 * 一人当たり売上高・営業利益・設備額はすべて「連結」ベース（分子も分母もグループ全体）。
 * ただしグループ構成によって意味合いが変わるため、断り書きを出す。
 * 単体と連結の差が大きい企業では、その事実を具体的な人数とともに示して
 * 「親会社だけの数字ではない」ことが伝わるようにする。
 */
export function buildPerEmployeeNote(c: CompanyData): string | null {
  const hasPerEmployee =
    num(c.salesPerEmployee) !== null ||
    numAllowNegative(c.profitPerEmployee) !== null ||
    num(c.capitalPerEmployee) !== null
  if (!hasPerEmployee) return null

  const base =
    "一人当たりの数値は、グループ全体（連結）の売上高・利益・資産を連結従業員数で割ったものです。" +
    "子会社を多く持つ企業やビジネスモデルによっては実感と異なる場合があります。"

  const parent = num(c.parentEmployees)
  const consolidated = num(c.reportedEmployees)
  if (parent === null || consolidated === null || consolidated === 0) return base

  const ratio = parent / consolidated
  if (ratio < 0.2) {
    return (
      base +
      `${c.company}は連結${Math.round(consolidated).toLocaleString()}人に対し単体（親会社）は${Math.round(parent).toLocaleString()}人で、` +
      "グループ会社に人員の大半が在籍しています。上記はグループ全体を平均した数値である点にご注意ください。"
    )
  }
  return base
}

/** 出典表示用のラベル（例: "EDINET／2025年8月期 有価証券報告書"） */
export function buildSourceLabel(company: CompanyData): string | null {
  const hasFinancials =
    num(company.revenue) !== null ||
    numAllowNegative(company.operatingProfit) !== null ||
    num(company.averageAnnualSalary) !== null ||
    num(company.salesPerEmployee) !== null
  if (!hasFinancials) return null
  const period = company.fiscalPeriod?.trim()
  return period
    ? `金融庁EDINET／${period} 有価証券報告書より当サイト集計`
    : `金融庁EDINET／有価証券報告書より当サイト集計`
}
