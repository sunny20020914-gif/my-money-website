// サイト全体で共有する定数。
// ドメイン変更や年度更新はこのファイルだけを修正すれば済むようにする。

export const SITE_URL = "https://www.mymoneyweb.com"
export const SITE_NAME = "My Money Web"
/**
 * データの対象年度（西暦）。
 *
 * 【重要】これは「卒業年度」ではなく「掲載している初任給データが何年度のものか」を表す。
 * 表記する際は「2026年度の初任給データ」「2026年最新」のように使い、
 * 「2026年新卒」とは書かないこと。読者に26卒向けサイトだと誤解される。
 *
 * 年度を更新するときは、この1行だけを変更すれば
 * タイトル・見出し・卒業年度の表記まで全て追従する。
 */
export const FISCAL_YEAR = 2026

/**
 * 主な想定読者の卒業年度（西暦下2桁の数値）。例: [27, 28]
 *
 * FISCAL_YEAR年度に就職活動をしているのは、その翌年・翌々年に卒業する学生。
 * FISCAL_YEAR を変えるだけで自動的に繰り上がる。
 *
 * /grad/[grad] ページの generateStaticParams はこの配列を元に生成される。
 * 対象学年を増やしたい場合は offsets に 3 を足すだけでページが増える。
 */
const GRAD_OFFSETS = [1, 2] as const
export const TARGET_GRADS: readonly number[] = GRAD_OFFSETS.map(
  (offset) => (FISCAL_YEAR + offset) % 100,
)

/** 卒業年度の表示用ラベル（例: "27卒・28卒"）。TARGET_GRADS と必ず一致する */
export const TARGET_GRAD_LABEL = TARGET_GRADS.map(
  (g) => `${String(g).padStart(2, "0")}卒`,
).join("・")
