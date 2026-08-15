// ------------------------------------------------------------------
// 【最終更新日の表示】
//
// 【重要・ここを直した理由】
// 以前は各ページで次のように書いていた。
//
//   const lastUpdated = new Date()
//   <time dateTime={lastUpdated.toISOString()}>…</time>
//
// toISOString() は "2026-08-15T02:14:33.123Z" のようにミリ秒まで含む。
// ISRでページを再生成するたびにこの値が変わるため、
// データが1文字も変わっていなくてもHTMLは毎回別物になっていた。
//
// Vercelは「再生成しても出力が前回と同じなら書き込みを計上しない」仕様。
// つまりこの1行があるせいで、本来ゼロで済んだはずの再生成が
// すべて課金対象の書き込みになっていた。
// 企業180ページ＋条件一覧などを1時間ごとに再生成していたため、
// 月あたり16万回規模の書き込みが発生し、無料枠20万回の75%に達した。
//
// 日単位に丸めれば、同じ日のうちは何度再生成しても出力が完全に一致し、
// 書き込みは1日1回で済む。表示上も「最終更新日」は日付が分かれば十分。
//
// 【注意】ここに時刻・分・秒を足さないこと。
// 一見わずかな精度の違いだが、そのままISRの課金額に直結する。
// ------------------------------------------------------------------

/**
 * 今日の日付を "YYYY-MM-DD"（UTC基準）で返す。
 * <time> 要素の dateTime 属性にそのまま使える形式。
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 画面表示用の日付（例: "2026/8/15"）。
 *
 * toLocaleDateString をそのまま使うと実行環境のタイムゾーンに依存し、
 * dateTime属性（UTC基準）と食い違う可能性があるため、
 * 同じ文字列から組み立てて必ず一致させる。
 */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${Number(y)}/${Number(m)}/${Number(d)}`
}

/** 表示用と属性用をまとめて返すヘルパー */
export function updatedAt(): { iso: string; label: string } {
  const iso = todayIso()
  return { iso, label: formatIsoDate(iso) }
}
