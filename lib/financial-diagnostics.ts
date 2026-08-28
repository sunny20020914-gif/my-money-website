import type { CompanyData } from "./sheets"
import { meaningfulAverageSalary } from "./financials"

// ------------------------------------------------------------------
// 【何のためのファイルか】
//
// 「スプレッドシートには平均年収や売上高を書いてあるのに、
//   ランキングページの一部の企業でだけ表示されない」
// という症状の原因を特定するための診断。
//
// 表示側は「値が取れなければ黙って隠す」設計になっている。
// 指標が増えても表示が崩れない利点がある一方、
// 入力したはずの値が消えても誰も気づけないという欠点があった。
//
// ここでは「セルは空でないのに画面に出ない」ケースだけを拾い、
// 企業名・列・生の値・理由をビルドログに出す。
// 空欄は正常なので報告しない（報告が埋もれて役に立たなくなる）。
// ------------------------------------------------------------------

export interface HiddenValueReport {
  company: string
  /** スプレッドシートの列（例: "Q列 平均年間給与"） */
  column: string
  /** パース後の値（そのまま出す） */
  raw: unknown
  reason: string
  hint: string
}

/** 表示判定に使っている num() と同じ条件 */
const isPositiveNumber = (v: unknown): boolean =>
  typeof v === "number" && isFinite(v) && v > 0

/** numAllowNegative() と同じ条件（赤字も通す） */
const isNonZeroNumber = (v: unknown): boolean =>
  typeof v === "number" && isFinite(v) && v !== 0

/** 空欄（＝入力していない）かどうか。空欄は正常なので報告対象外 */
const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "")

/**
 * 数値として扱えない理由を日本語で返す。
 *
 * 【文字列になる仕組み】
 * Google Sheets API は既定で「画面に表示されている文字列」を返す
 * （valueRenderOption を指定していないため FORMATTED_VALUE になる）。
 * つまりセルの表示形式がそのまま値に混ざる。
 *   ・パーセント表示のセル … "7.10%"
 *   ・単位付きの表示形式   … "1,234百万円"
 *   ・会計形式のマイナス   … "△1,874"
 * lib/sheets.ts の parseSalaryValue は「¥ , 円 空白」しか除去しないので、
 * これらは数値にならず文字列のまま残り、表示側で弾かれる。
 * 同じ列でもセルごとに書式が違えば、企業単位で表示が分かれる。
 */
function explainNonNumeric(raw: unknown): { reason: string; hint: string } | null {
  if (typeof raw !== "string") return null
  const s = raw.trim()

  if (/[%％]/.test(s)) {
    return {
      reason: "パーセント表示のセルになっている",
      hint: "セルの表示形式を「数値」に変え、7.1 のように数字だけを入れてください",
    }
  }
  // 「850万円」のように単位が付いていると、parseSalaryValue が
  // 円だけを除去して「850万」になり、数値にならず元の文字列が残る。
  if (/[億兆万]/.test(s)) {
    return {
      reason: "単位付きの文字列になっている",
      hint: "列の見出しにある単位に合わせ、数字だけを入れてください（例: 売上高は百万円単位）",
    }
  }
  if (/[△▲]/.test(s) || /^\(.*\)$/.test(s)) {
    return {
      reason: "会計形式のマイナス表記になっている",
      hint: "△や括弧ではなく、半角の - を付けた数字を入れてください",
    }
  }
  if (/[−‐‑–—―]/.test(s) && /\d/.test(s)) {
    return {
      reason: "マイナス記号が半角ハイフンではない",
      hint: "全角のダッシュではなく、半角の - に置き換えてください",
    }
  }
  if (/[人名社]/.test(s)) {
    return {
      reason: "単位（人・名など）が文字列に含まれている",
      hint: "セルの表示形式で単位を付けるのではなく、数字だけを入れてください",
    }
  }
  return {
    reason: "数値として読めない文字列が入っている",
    hint: "全角文字・注記・空白などが混ざっていないか確認してください",
  }
}

/** 1社ぶんの診断 */
function diagnoseCompany(c: CompanyData): HiddenValueReport[] {
  const out: HiddenValueReport[] = []

  const checkPositive = (raw: unknown, column: string) => {
    if (isEmpty(raw) || isPositiveNumber(raw)) return
    const nonNumeric = explainNonNumeric(raw)
    if (nonNumeric) {
      out.push({ company: c.company, column, raw, ...nonNumeric })
      return
    }
    if (raw === 0) {
      out.push({
        company: c.company,
        column,
        raw,
        reason: "0が入っている",
        hint: "0は「未入力」と同じ扱いで非表示になります。実際に0なら空欄にしてください",
      })
    }
  }

  const checkNonZero = (raw: unknown, column: string) => {
    if (isEmpty(raw) || isNonZeroNumber(raw)) return
    const nonNumeric = explainNonNumeric(raw)
    if (nonNumeric) {
      out.push({ company: c.company, column, raw, ...nonNumeric })
      return
    }
    if (raw === 0) {
      out.push({
        company: c.company,
        column,
        raw,
        reason: "0が入っている",
        hint: "0は「未入力」と同じ扱いで非表示になります。実際に0なら空欄にしてください",
      })
    }
  }

  // 売上高・営業利益は赤字（マイナス）もあり得るので 0 以外を通す
  checkNonZero(c.revenue, "N列 売上高")
  checkNonZero(c.operatingProfit, "O列 営業利益")
  checkNonZero(c.operatingMargin, "P列 営業利益率")
  checkPositive(c.averageAnnualSalary, "Q列 平均年間給与")
  checkPositive(c.salesPerEmployee, "R列 一人当たり売上高")
  checkNonZero(c.profitPerEmployee, "S列 一人当たり営業利益")
  checkPositive(c.capitalPerEmployee, "T列 資本装備率")

  // ------------------------------------------------------------------
  // 【平均年収だけの特別な非表示】
  // 持株会社は有報の「平均年間給与」が親会社単体の数名〜数百名の値になり、
  // グループ社員の実態を表さないため意図的に隠している（lib/financials.ts）。
  // 仕様どおりの動作だが、スプシに数字が入っている以上
  // 「なぜ消えたのか分からない」原因になるので、ここで明示しておく。
  // ------------------------------------------------------------------
  if (isPositiveNumber(c.averageAnnualSalary) && meaningfulAverageSalary(c) === null) {
    const parent = typeof c.parentEmployees === "number" ? c.parentEmployees : null
    const consolidated = typeof c.reportedEmployees === "number" ? c.reportedEmployees : null
    const ratio =
      parent !== null && consolidated !== null && consolidated > 0
        ? `${Math.round((parent / consolidated) * 1000) / 10}%`
        : "不明"
    out.push({
      company: c.company,
      column: "Q列 平均年間給与",
      raw: c.averageAnnualSalary,
      reason: `持株会社と判定したため意図的に非表示（単体比率 ${ratio}）`,
      hint:
        "単体従業員数が連結の5%未満だと、親会社の役員クラスだけの平均になり実態とずれるため隠しています。" +
        "U列（連結従業員数）とV列（単体従業員数）が正しいか確認してください",
    })
  }

  return out
}

/** 全社ぶんの診断。問題が無ければ空配列 */
export function diagnoseHiddenFinancials(companies: CompanyData[]): HiddenValueReport[] {
  return companies.flatMap(diagnoseCompany)
}

/**
 * 診断結果をビルドログに出す。
 * Vercelのビルドログ／実行ログで「どの企業のどの列が、なぜ消えたか」が分かる。
 * 問題が無ければ何も出さない（ログを汚さない）。
 */
export function logHiddenFinancials(companies: CompanyData[], sheetName: string): void {
  const reports = diagnoseHiddenFinancials(companies)
  if (reports.length === 0) return

  console.warn(
    `[財務データ診断] ${sheetName}: 値が入っているのに非表示になっている項目が ${reports.length} 件あります`,
  )
  for (const r of reports) {
    console.warn(
      `  ・${r.company} / ${r.column} / 値「${String(r.raw)}」→ ${r.reason}\n` +
        `      対処: ${r.hint}`,
    )
  }
}
