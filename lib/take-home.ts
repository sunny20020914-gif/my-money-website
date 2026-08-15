import { estimateNetSalary, roundNet } from "./net-salary"
import type { CompanyData } from "./sheets"

// ------------------------------------------------------------------
// 【額面別の手取りページ】
//
// 「初任給30万 手取り」「額面25万円 手取り いくら」といった検索は
// 数が非常に多く、しかも金融ジャンルとして広告単価も高い。
// 一方で当サイトには既に手取りの計算ロジック（lib/net-salary.ts）があり、
// 企業ページでも使っている。つまり中身は揃っているのに、
// その計算結果を受け止めるURLが存在しなかった。
//
// 額面1万円刻みでページを用意すれば、
//   ・1ページ1キーワードで検索意図と完全に一致する
//   ・掲載企業の中から近い金額の会社へ内部リンクを張れる
//   ・シミュレーターと違い、検索結果から直接答えに着地できる
// という3点が同時に成立する。
//
// 【刻み幅について】
// 5千円刻みにすると80ページを超え、内容がほぼ同じページが並んで
// 重複と判定されやすくなる。1万円刻みなら金額差が明確で、
// 各ページの数値も十分に違う。
// ------------------------------------------------------------------

/** ページを用意する額面（月額・円）。20万〜60万を1万円刻み */
export const TAKE_HOME_AMOUNTS: number[] = Array.from(
  { length: 41 },
  (_, i) => 200_000 + i * 10_000,
)

export function isValidTakeHomeAmount(amount: number): boolean {
  return TAKE_HOME_AMOUNTS.includes(amount)
}

/**
 * 指定した金額に最も近い、ページが存在する額面を返す。
 * 用意している範囲（20万〜60万）から外れている場合は null。
 *
 * 企業ページから「額面◯万円の手取り」ページへ送るために使う。
 * 範囲外の企業に無理やりリンクを張ると内容とずれるため、
 * 5千円を超えて離れている場合もリンクしない。
 */
export function nearestTakeHomeAmount(
  monthly: number | string | null | undefined,
): number | null {
  if (typeof monthly !== "number" || monthly <= 0) return null
  const nearest = TAKE_HOME_AMOUNTS.reduce((best, a) =>
    Math.abs(a - monthly) < Math.abs(best - monthly) ? a : best,
  )
  return Math.abs(nearest - monthly) <= 5_000 ? nearest : null
}

/** 「300000」→「30万円」のような表示用ラベル */
export function manLabel(amount: number): string {
  const man = amount / 10_000
  return Number.isInteger(man) ? `${man}万円` : `${man.toFixed(1)}万円`
}

export interface TakeHomeBreakdownRow {
  label: string
  value: number
  /** その項目が何のための天引きかの説明 */
  note: string
}

export interface TakeHomePageData {
  amount: number
  amountLabel: string
  /** 1年目の手取り（住民税なし） */
  netFirstYear: number
  /** 2年目以降の手取り（住民税あり） */
  netSecondYear: number
  /** 額面に対する手取りの割合（%） */
  ratio: number
  /** 天引きの合計（1年目） */
  deductionFirstYear: number
  breakdown: TakeHomeBreakdownRow[]
  residentTax: number
  /** 年収換算（賞与なしの単純12倍） */
  annualGross: number
  /** 近い額面の掲載企業 */
  nearbyCompanies: { company: CompanyData; monthly: number }[]
  /** 前後の額面（ページ送り用） */
  prevAmount: number | null
  nextAmount: number | null
  /** 自動生成の解説 */
  paragraphs: string[]
  faq: { question: string; answer: string }[]
}

const yen = (v: number) => `${Math.round(v).toLocaleString()}円`

/**
 * 額面から、そのページに必要な情報を一式組み立てる。
 *
 * @param amount 月額の額面（円）
 * @param all 掲載企業（近い金額の会社を紹介するために使う）
 */
export function buildTakeHomePage(amount: number, all: CompanyData[]): TakeHomePageData | null {
  const est = estimateNetSalary(amount)
  if (!est) return null

  const netFirstYear = roundNet(est.netMonthlyFirstYear)
  const netSecondYear = roundNet(est.netMonthlySecondYear)
  const ratio = Math.round((est.netMonthlyFirstYear / amount) * 1000) / 10

  const breakdown: TakeHomeBreakdownRow[] = [
    {
      label: "健康保険料",
      value: est.healthInsurance,
      note: "医療費の自己負担を3割に抑えるための保険。会社と折半で負担します。",
    },
    {
      label: "厚生年金保険料",
      value: est.pension,
      note: "将来の年金の原資。こちらも会社と折半です。",
    },
    {
      label: "雇用保険料",
      value: est.employmentInsurance,
      note: "失業したときの給付や育児休業給付にあてられます。",
    },
    {
      label: "所得税",
      value: est.incomeTaxMonthly,
      note: "その年の所得にかかる税金。毎月の給与から概算で天引きされます。",
    },
  ]

  const deductionFirstYear = breakdown.reduce((s, r) => s + r.value, 0)

  // 近い額面の掲載企業。±2万円の範囲から初任給が近い順に5社
  const nearbyCompanies = all
    .map((c) => ({ company: c, monthly: typeof c.baseMonthly === "number" ? c.baseMonthly : 0 }))
    .filter((r) => r.monthly > 0 && Math.abs(r.monthly - amount) <= 20_000)
    .sort((a, b) => Math.abs(a.monthly - amount) - Math.abs(b.monthly - amount))
    .slice(0, 5)

  const idx = TAKE_HOME_AMOUNTS.indexOf(amount)
  const prevAmount = idx > 0 ? TAKE_HOME_AMOUNTS[idx - 1] : null
  const nextAmount = idx >= 0 && idx < TAKE_HOME_AMOUNTS.length - 1 ? TAKE_HOME_AMOUNTS[idx + 1] : null

  const label = manLabel(amount)

  const paragraphs: string[] = [
    `月給の額面が${label}の場合、社会保険料と所得税を差し引いた手取りは月およそ${yen(netFirstYear)}です。` +
      `額面の${ratio}%が実際に受け取れる金額で、差額の${yen(deductionFirstYear)}が毎月の天引き分になります。`,
    `注意したいのは2年目からです。住民税は前年の所得に対してかかるため、社会人1年目には引かれません。` +
      `2年目の6月から月およそ${yen(est.residentTaxMonthly)}が加わり、手取りは${yen(netSecondYear)}まで下がります。` +
      `給与が上がっていないのに手取りが減ったように感じるのはこのためです。`,
    `年収に換算すると、賞与を含めない単純な12か月分で${yen(amount * 12)}です。` +
      `実際には賞与や残業代、住宅手当などが加わるため、求人票の「想定年収」はこれより大きくなるのが一般的です。` +
      `逆に、提示された初任給に固定残業代が含まれている場合は、その分の残業をして初めてこの金額に届く点に注意してください。`,
  ]

  const faq: { question: string; answer: string }[] = [
    {
      question: `額面${label}の手取りはいくらですか？`,
      answer:
        `月およそ${yen(netFirstYear)}です（社会人1年目・扶養なしの場合）。` +
        `内訳は健康保険料${yen(est.healthInsurance)}、厚生年金保険料${yen(est.pension)}、` +
        `雇用保険料${yen(est.employmentInsurance)}、所得税${yen(est.incomeTaxMonthly)}で、天引きの合計は${yen(deductionFirstYear)}です。`,
    },
    {
      question: `額面${label}だと2年目の手取りはどうなりますか？`,
      answer:
        `住民税が加わるため、月およそ${yen(netSecondYear)}になります。` +
        `住民税は前年の所得に対して課税される仕組みで、1年目は前年の所得がないため引かれません。` +
        `2年目の6月支給分から月およそ${yen(est.residentTaxMonthly)}が引かれ始めます。`,
    },
    {
      question: `手取りは額面の何割ですか？`,
      answer:
        `額面${label}の場合、1年目の手取りは額面の約${ratio}%です。` +
        `一般に額面が上がるほど所得税率が上がるため、手取りの割合は少しずつ下がっていきます。` +
        `扶養している家族がいる場合は控除が増えるため、手取りの割合はこれより高くなります。`,
    },
  ]

  if (nearbyCompanies.length > 0) {
    faq.push({
      question: `初任給が${label}前後の企業にはどんな会社がありますか？`,
      answer:
        `当サイト掲載企業では${nearbyCompanies.map((r) => `${r.company.company}（${yen(r.monthly)}）`).join("、")}などが該当します。` +
        `各企業のページでは手取りの内訳に加えて、有価証券報告書に基づく平均年収や業績データも確認できます。`,
    })
  }

  return {
    amount,
    amountLabel: label,
    netFirstYear,
    netSecondYear,
    ratio,
    deductionFirstYear,
    breakdown,
    residentTax: est.residentTaxMonthly,
    annualGross: amount * 12,
    nearbyCompanies,
    prevAmount,
    nextAmount,
    paragraphs,
    faq,
  }
}
