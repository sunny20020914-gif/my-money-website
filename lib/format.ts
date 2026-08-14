// ------------------------------------------------------------------
// スプレッドシートの空欄を画面上でどう見せるかを一箇所に集約する。
//
// 【なぜ必要か】
// 空欄のパース結果は取り込み関数ごとにバラバラで、同じ「データ無し」でも
// 内部表現が3種類ある。
//
//   ・parseStrictNumber（G列: 設立年）      → 0
//   ・parseEmployees   （F列: 従業員数）    → "?"
//   ・parseSalaryValue （D/E列: 賃金）      → null
//
// そのため画面には「設立: 0年」「?人」「（何も出ない）」という
// 3通りの見え方が混在していた。いずれもデータが無いだけなのに、
// 0年は誤情報に見え、空欄はレイアウト崩れに見える。
//
// パース側を直すと founded: number という型に依存している
// 企業詳細ページ・業界ページまで影響が及ぶため、
// 表示の直前でまとめて吸収する方針を取る。
// ------------------------------------------------------------------

/** データが無いときに表示する記号（半角ハイフン） */
export const NO_DATA = "-"

/**
 * スプレッドシート由来の値が「データ無し」かどうかを判定する。
 *
 * 数値の 0 もデータ無しとして扱う。設立年・従業員数・給与のいずれも
 * 0 が正当な値になることはなく、空欄を 0 に丸めた結果でしかないため。
 *
 * 文字列は、空文字のほか記号だけの表記もデータ無しとみなす。
 * 「非公開」「応相談」のような意味のある文言はそのまま表示したいので
 * ここには含めない。
 */
export function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true

  if (typeof value === "number") {
    return !Number.isFinite(value) || value === 0
  }

  if (typeof value === "string") {
    const s = value.trim()
    // "?" は parseEmployees が空欄に対して返すフォールバック値
    return s === "" || s === "?" || s === "-" || s === "－" || s === "―" || s === "ー"
  }

  return false
}

/**
 * 数値に単位を付けて表示する。データが無い場合は単位も付けずに "-" を返す。
 *
 * 「-年」「-人」だと単位だけが浮いて読みにくいため、単位ごと落とす。
 * 「非公開」のような文言が入っている場合も単位を付けない
 * （「非公開人」になってしまうため）。単位が付くのは数値のときだけ。
 *
 * @example formatWithUnit(1234, "人")     // "1,234人"
 * @example formatWithUnit(0, "年")        // "-"
 * @example formatWithUnit("非公開", "人") // "非公開"
 */
export function formatWithUnit(value: unknown, unit: string): string {
  if (isBlankValue(value)) return NO_DATA
  if (typeof value === "number") return `${value.toLocaleString()}${unit}`
  return String(value).trim()
}

/**
 * 西暦の年を表示する。データが無い場合は "-"。
 *
 * 【重要】桁区切りを入れてはいけない。toLocaleString() を通すと
 * 1954 が「1,954年」になってしまう。年は4桁の数値としてそのまま出す。
 *
 * @example formatYear(1954) // "1954年"
 * @example formatYear(0)    // "-"
 */
export function formatYear(value: unknown): string {
  if (isBlankValue(value)) return NO_DATA
  if (typeof value === "number") return `${value}年`
  return String(value).trim()
}

/**
 * 金額を「¥123,456」の形で表示する。データが無い場合は "-"。
 *
 * 数値でない文字列（「応相談」など意味のある文言）はそのまま返す。
 * 空欄・0 のときだけ "-" になる。
 *
 * @example formatYen(255000) // "¥255,000"
 * @example formatYen(null)   // "-"
 */
export function formatYen(value: unknown): string {
  if (isBlankValue(value)) return NO_DATA
  if (typeof value === "number") return `¥${value.toLocaleString()}`
  return String(value).trim()
}

/**
 * 単位を別要素（小さい文字など）で描画したい場合に使う。
 * データが無ければ数値部分に "-"、単位に空文字を返す。
 */
export function splitValueAndUnit(
  value: unknown,
  unit: string,
): { text: string; unit: string } {
  if (isBlankValue(value)) return { text: NO_DATA, unit: "" }
  // 数値以外（「非公開」など）には単位を付けない
  if (typeof value !== "number") return { text: String(value).trim(), unit: "" }
  return { text: value.toLocaleString(), unit }
}
