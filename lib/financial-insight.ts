import type { CompanyData } from "./sheets"

// ------------------------------------------------------------------
// 【当サイト独自の分析】財務データ × 初任給
//
// 大手就活サイトは初任給しか持たず、財務メディアは初任給を持たない。
// 両方を持つこのサイトだけが「稼ぐ力に対して給与が高いのか」を示せる。
//
// 実データ（EDINET財務 × 初任給 94社）を集計したところ、
// 営業利益率が高い企業ほど初任給が高いという明確な傾向が確認できた:
//
//   営業利益率 5%未満  → 初任給(年俸)中央値 420万円
//   営業利益率 5〜10%  → 471万円
//   営業利益率 10〜20% → 480万円
//   営業利益率 20%以上 → 504万円
//
// ベンチマークは定数で持たず、掲載データから毎回計算する。
// 企業が増えても勝手に最新化され、古い基準で判定し続ける事故が起きない。
// AI・外部APIは使わない。
// ------------------------------------------------------------------

const num = (v: number | string | null | undefined): number | null =>
  typeof v === "number" && isFinite(v) ? v : null

const positive = (v: number | string | null | undefined): number | null => {
  const n = num(v)
  return n !== null && n > 0 ? n : null
}

/**
 * 営業利益率を持つ企業か。
 * 当初はIFRSの抽出値が誤っていたため日本基準に限定していたが、
 * 事業利益を参照する方式に修正され正しい値が得られるようになったため制限を解除した。
 */
const hasReliableMargin = (c: CompanyData): boolean => num(c.operatingMargin) !== null

/** 営業利益率の帯。境界値はデータの分布を見て4分割している */
const MARGIN_BANDS = [
  { key: "low", label: "5%未満", min: -Infinity, max: 5 },
  { key: "mid", label: "5〜10%", min: 5, max: 10 },
  { key: "high", label: "10〜20%", min: 10, max: 20 },
  { key: "top", label: "20%以上", min: 20, max: Infinity },
] as const

type MarginBand = (typeof MARGIN_BANDS)[number]

const bandOf = (margin: number): MarginBand =>
  MARGIN_BANDS.find((b) => margin >= b.min && margin < b.max) ?? MARGIN_BANDS[0]

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

// ------------------------------------------------------------------
// 【ビジネスモデルの型】資本装備率（一人当たり設備額）からの分析
//
// 資本装備率 = 有形固定資産 ÷ 従業員数。
// 「設備で稼ぐ会社か、人で稼ぐ会社か」を1つの数字で表せる。
// 実データ92社の分布: 中央値436万円、四分位は105万円 / 436万円 / 2,062万円。
//   高い例: 三菱地所4.4億円、地主2.7億円（不動産＝資産保有型）
//   低い例: ライズコンサル6万円、セプテーニ22万円（コンサル＝人材集約型）
//
// 就活生にとっては「何が競争力の源泉か」を示す指標になる。
// 人材集約型なら人への投資が業績に直結し、資産集約型なら設備規模が効く。
//
// 【労働分配率を実装しない理由】
// 労働分配率＝人件費÷売上総利益 だが、取得できる人件費は「平均年間給与×単体従業員数」で
// 提出会社（単体）のみ。一方の売上総利益は連結。単体従業員数は連結の中央値34%しかなく、
// 範囲が一致しないため計算すると中央値11%と極端に過小になる。
// 逆に連結従業員数で推定すると子会社の給与を親会社と同水準と仮定することになり、
// 84社中12社が100%超という破綻した値になった。
// 単体比率0.8以上の18社に限れば計算可能だが、母数が少なく外れ値も残るため見送る。
// ------------------------------------------------------------------

export interface BusinessModelInsight {
  /** 一人当たり設備額（円） */
  capitalPerEmployeeYen: number
  /** 掲載企業の中央値（円） */
  medianYen: number
  /** 比較対象の企業数 */
  sampleCount: number
  verdict: "capital" | "balanced" | "people"
  summary: string
}

export function buildBusinessModelInsight(
  all: CompanyData[],
  company: CompanyData,
): BusinessModelInsight | null {
  const own = positive(company.capitalPerEmployee)
  if (own === null) return null

  const values = all
    .map((c) => positive(c.capitalPerEmployee))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)
  if (values.length < 10) return null

  const at = (p: number) => values[Math.floor((values.length - 1) * p)]
  const q1 = at(0.25)
  const q3 = at(0.75)
  const med = at(0.5)

  const verdict: BusinessModelInsight["verdict"] =
    own >= q3 ? "capital" : own <= q1 ? "people" : "balanced"

  const man = (v: number) => `${Math.round(v).toLocaleString()}万円`

  const body =
    verdict === "capital"
      ? `掲載企業の上位25%に入る水準で、店舗・工場・不動産といった資産が収益の柱になる「資産集約型」のビジネスモデルです。設備の規模が競争力に直結する一方、人員を増やさずに売上を伸ばしやすい構造でもあります。`
      : verdict === "people"
        ? `掲載企業の下位25%にあたる水準で、大きな設備を持たず人の働きが収益を生む「人材集約型」のビジネスモデルです。社員一人ひとりの成果が業績に直結しやすく、人材への投資が競争力そのものになります。`
        // med は「万円」単位のまま保持しているので、そのまま man() に渡す
      // （円に換算してから渡すと 436万円 → 0万円 と潰れてしまう）
      : `掲載企業の中央値（${man(med)}）付近の水準で、設備と人材のどちらにも偏らないバランス型です。`

  const summary =
    `${company.company}の社員1人あたりの設備額（資本装備率）は${man(own)}です。${body}`

  return {
    capitalPerEmployeeYen: own * 10_000,
    medianYen: med * 10_000,
    sampleCount: values.length,
    verdict,
    summary,
  }
}

export interface FinancialInsight {
  /** その企業が属する営業利益率の帯（例「20%以上」） */
  bandLabel: string
  /** 同じ帯に属する掲載企業数 */
  bandCount: number
  /** 同じ帯の想定年収の中央値（円） */
  bandMedianAnnual: number
  /** その企業の想定年収（円） */
  companyAnnual: number
  /** 中央値との差（円・プラスなら高い） */
  diff: number
  /** 判定 */
  verdict: "high" | "similar" | "low"
  /** 一人当たり営業利益（円）。無ければ null */
  profitPerEmployeeYen: number | null
  /** 【AI SEO】そのまま引用できる自己完結型の解説文 */
  summary: string
}

/**
 * 財務データと初任給を突き合わせ、「稼ぐ力に対して給与が高いか」を判定する。
 * 判定に必要なデータが揃っていない企業では null を返し、UI側で非表示にする。
 *
 * @param all 掲載企業全体（ベンチマーク算出に使う）
 * @param company 対象企業
 */
export function buildFinancialInsight(
  all: CompanyData[],
  company: CompanyData,
): FinancialInsight | null {
  // 会計基準が日本基準でない企業は、営業利益率が信頼できないため分析しない
  if (!hasReliableMargin(company)) return null
  const margin = num(company.operatingMargin) as number
  const annual = positive(company.annualSalary)
  if (annual === null) return null

  const band = bandOf(margin)

  // 同じ利益率帯に属する企業の想定年収を集める（自社も含めた分布で中央値を出す）
  // ベンチマークの母集団も日本基準に限定し、誤った利益率の企業が紛れ込まないようにする
  const peers = all.filter((c) => {
    if (!hasReliableMargin(c)) return false
    const a = positive(c.annualSalary)
    return a !== null && bandOf(num(c.operatingMargin) as number).key === band.key
  })

  // 母数が少ないと中央値が偶然に振れるため、3社未満なら判定しない
  if (peers.length < 3) return null

  const bandMedianAnnual = median(peers.map((c) => positive(c.annualSalary) as number))
  if (bandMedianAnnual === null) return null

  const diff = annual - bandMedianAnnual
  // 中央値の±5%以内は「ほぼ同水準」とみなす（1万円差で高い/低いと言わないため）
  const threshold = bandMedianAnnual * 0.05
  const verdict: FinancialInsight["verdict"] =
    diff > threshold ? "high" : diff < -threshold ? "low" : "similar"

  // 一人当たり営業利益は万円単位で入力されているため円に換算
  const ppe = num(company.profitPerEmployee)
  const profitPerEmployeeYen = ppe !== null && ppe !== 0 ? ppe * 10_000 : null

  const man = (yen: number) => `${Math.round(yen / 10_000).toLocaleString()}万円`

  const verdictText =
    verdict === "high"
      ? `同水準の収益性を持つ企業の中では高い部類に入ります`
      : verdict === "low"
        ? `同水準の収益性を持つ企業の中ではやや控えめです`
        : `同水準の収益性を持つ企業とほぼ同じ水準です`

  const parts: string[] = [
    `${company.company}の営業利益率は${margin}%で、掲載企業のうち「営業利益率${band.label}」に該当します。`,
    `この収益帯${peers.length}社の想定年収の中央値は${man(bandMedianAnnual)}で、${company.company}は${man(annual)}。`,
    `${verdictText}（${diff >= 0 ? "+" : "−"}${man(Math.abs(diff))}）。`,
  ]

  if (profitPerEmployeeYen !== null && profitPerEmployeeYen > 0) {
    parts.push(
      `社員1人あたりの営業利益は${man(profitPerEmployeeYen)}で、これが給与の原資にあたります。`,
    )
  }

  return {
    bandLabel: band.label,
    bandCount: peers.length,
    bandMedianAnnual,
    companyAnnual: annual,
    diff,
    verdict,
    profitPerEmployeeYen,
    summary: parts.join(""),
  }
}
