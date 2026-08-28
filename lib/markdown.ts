// ------------------------------------------------------------------
// 記事本文（スプレッドシートのMarkdown）を扱うためのヘルパー。
//
// 記事ページは本文の途中に広告を挟むため、いったん本文を
// 前半・後半に分けてから別々にレンダリングしている。
// このとき単純に空行で切ると、表やコードブロックの途中で
// 分断されて表示が壊れることがある。
// ------------------------------------------------------------------

/**
 * Markdownを「空行で区切られたブロック」に分ける。
 *
 * 【コードブロックを守る】
 * ``` で囲まれた範囲には空行が含まれることがある。
 * 単純に /\n\n+/ で切ると、開きの ``` と閉じの ``` が
 * 前半と後半に分かれてしまい、両方とも壊れた表示になる。
 * フェンスの内側にいる間は区切らないようにする。
 *
 * 【表は空行を含まない】
 * Markdownの表は連続した行で書く決まりなので、
 * 空行で切るかぎり途中で分断されることはない。
 * 逆にいえば、表の途中に空行を入れると表として認識されなくなる。
 */
export function splitIntoBlocks(markdown: string): string[] {
  const lines = markdown.split("\n")
  const blocks: string[] = []
  let current: string[] = []
  let insideFence = false

  const flush = () => {
    const text = current.join("\n").trim()
    if (text) blocks.push(text)
    current = []
  }

  for (const line of lines) {
    // ``` または ~~~ で始まる行はコードフェンスの開始／終了
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence
      current.push(line)
      continue
    }

    if (!insideFence && line.trim() === "") {
      flush()
      continue
    }

    current.push(line)
  }
  flush()

  return blocks
}

/**
 * 生成済みHTMLの表を、横スクロールできる要素で包む。
 *
 * 【なぜ必要か】
 * 列の多い表はスマホの画面幅に収まらず、はみ出して
 * ページ全体が横スクロールする状態になる。
 * table 自体に overflow を効かせるには display:block にするしかなく、
 * それをすると列幅の自動調整が効かなくなる。
 * 外側のdivに預けるのが表の見た目を保ったまま解決できる唯一の方法。
 *
 * 本文は dangerouslySetInnerHTML で挿入しているためJSX側では包めない。
 * ここで文字列として包んでおく。
 */
export function withScrollableTables(html: string): string {
  return html
    .replace(/<table>/g, '<div class="md-table-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>")
}
