#!/usr/bin/env node
/**
 * 【未定義の識別子を検出する】
 *
 * ■ なぜ必要か
 * next.config.mjs で typescript.ignoreBuildErrors = true にしているため、
 * 「import を消したのに参照が残っている」といったミスがビルドを素通りし、
 * 本番のプリレンダリング時に
 *   ReferenceError: METRIC_RANKING_ORDER is not defined
 * となってデプロイが失敗する。
 *
 * 実際にこれでデプロイが2回落ちた。tsc --noEmit なら一発で分かるが、
 * 型チェック全体は時間がかかるため、この1種類だけを高速に調べる。
 *
 * ■ 判定方法
 * 「式の位置で参照されているのに、そのファイルのどこにも
 *   宣言・import されておらず、既知のグローバルでもない識別子」
 * を報告する。スコープの厳密な解析はせず、ファイル内のどこかに
 * 宣言があれば良しとする（過検出を避けるため）。
 * それでも今回のような「どこにも無い」ケースは確実に捕まえられる。
 *
 * 使い方: node scripts/check-undefined-identifiers.mjs
 */
import fs from "fs"
import path from "path"
import ts from "typescript"

const ROOTS = ["app", "components", "lib", "hooks"]

/** 宣言されていなくても使える名前 */
const GLOBALS = new Set([
  // JS 標準
  "Array","Object","String","Number","Boolean","Symbol","BigInt","Math","JSON","Date","RegExp",
  "Map","Set","WeakMap","WeakSet","Promise","Error","TypeError","RangeError","Intl","Infinity","NaN",
  "undefined","null","true","false","globalThis","isNaN","isFinite","parseInt","parseFloat",
  "encodeURIComponent","decodeURIComponent","encodeURI","decodeURI","structuredClone",
  // 実行環境
  "console","process","window","document","navigator","location","history","localStorage",
  "sessionStorage","fetch","Request","Response","Headers","URL","URLSearchParams","AbortController",
  "setTimeout","clearTimeout","setInterval","clearInterval","requestAnimationFrame",
  "cancelAnimationFrame","queueMicrotask","Buffer","__dirname","__filename","require","module","exports",
  "IntersectionObserver","ResizeObserver","MutationObserver","FormData","Blob","File","FileReader",
  "Image","Audio","Event","CustomEvent","HTMLElement","Node","performance","crypto","TextEncoder","TextDecoder",
  "alert","confirm","prompt","matchMedia","getComputedStyle","scrollTo","scrollBy","open","close",
  // 型でよく出るもの（式位置に現れることがある）
  "React","JSX","NodeJS",
  // declare global { … } の global
  "global",
])

/** そのファイル内で宣言・import されている名前をすべて集める */
function collectDeclared(sf) {
  const names = new Set()
  const addBinding = (name) => {
    if (!name) return
    if (ts.isIdentifier(name)) {
      names.add(name.text)
    } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const el of name.elements) {
        if (ts.isBindingElement(el)) addBinding(el.name)
      }
    }
  }

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const c = node.importClause
      if (c.name) names.add(c.name.text)
      const nb = c.namedBindings
      if (nb) {
        if (ts.isNamespaceImport(nb)) names.add(nb.name.text)
        else if (ts.isNamedImports(nb)) for (const el of nb.elements) names.add(el.name.text)
      }
    }
    if (ts.isVariableDeclaration(node)) addBinding(node.name)
    if (ts.isParameter(node)) addBinding(node.name)
    if (ts.isBindingElement(node)) addBinding(node.name)
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) names.add(node.name.text)
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)) {
      if (node.name) names.add(node.name.text)
    }
    if (ts.isFunctionExpression(node) && node.name) names.add(node.name.text)
    if (ts.isCatchClause(node) && node.variableDeclaration) addBinding(node.variableDeclaration.name)
    if (ts.isTypeParameterDeclaration(node) && node.name) names.add(node.name.text)
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return names
}

/** その識別子が「値としての参照」かどうか */
function isValueReference(node) {
  const p = node.parent
  if (!p) return false

  // 宣言側の名前は参照ではない
  if (
    (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p) ||
     ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isTypeAliasDeclaration(p) ||
     ts.isInterfaceDeclaration(p) || ts.isEnumDeclaration(p) || ts.isMethodDeclaration(p) ||
     ts.isPropertyDeclaration(p) || ts.isTypeParameterDeclaration(p)) &&
    p.name === node
  ) return false

  // import / export の指定子
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) ||
      ts.isNamespaceImport(p) || ts.isImportEqualsDeclaration(p)) return false

  // a.b の b、a?.b の b
  if (ts.isPropertyAccessExpression(p) && p.name === node) return false
  if (ts.isQualifiedName(p) && p.right === node) return false

  // 分割代入の「元の名前」。const { icon: Icon } = x の icon は参照ではない
  // （Icon 側が新しい変数名で、icon は取り出すプロパティ名）
  if (ts.isBindingElement(p) && p.propertyName === node) return false
  // declare global { … } のようなモジュール宣言名
  if (ts.isModuleDeclaration(p) && p.name === node) return false

  // { key: value } の key、{ key } は参照なので除外しない
  if (ts.isPropertyAssignment(p) && p.name === node) return false
  if (ts.isPropertySignature(p) && p.name === node) return false
  if (ts.isMethodSignature(p) && p.name === node) return false
  if (ts.isEnumMember(p) && p.name === node) return false

  // JSX の属性名 <div className=…> の className
  if (ts.isJsxAttribute(p) && p.name === node) return false
  // <div> のような小文字タグ
  if ((ts.isJsxOpeningElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxClosingElement(p)) &&
      p.tagName === node && /^[a-z]/.test(node.text)) return false

  // 型の位置（TypeReference等）は実行時に消えるのでReferenceErrorにならない
  let cur = p
  while (cur) {
    if (ts.isTypeReferenceNode(cur) || ts.isTypeQueryNode(cur) || ts.isTypeOperatorNode(cur) ||
        ts.isIndexedAccessTypeNode(cur) || ts.isTypeLiteralNode(cur) || ts.isUnionTypeNode(cur) ||
        ts.isIntersectionTypeNode(cur) || ts.isArrayTypeNode(cur) || ts.isFunctionTypeNode(cur) ||
        ts.isExpressionWithTypeArguments(cur)) return false
    if (ts.isBlock(cur) || ts.isSourceFile(cur)) break
    cur = cur.parent
  }

  // ラベル
  if (ts.isLabeledStatement(p) && p.label === node) return false
  if (ts.isBreakOrContinueStatement(p)) return false

  return true
}

const files = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p) }
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts")) files.push(p)
  }
}
ROOTS.forEach((r) => fs.existsSync(r) && walk(r))

let problems = 0
for (const f of files) {
  const src = fs.readFileSync(f, "utf8")
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX)
  const declared = collectDeclared(sf)
  const reported = new Set()

  const visit = (node) => {
    if (ts.isIdentifier(node) && isValueReference(node)) {
      const name = node.text
      if (!declared.has(name) && !GLOBALS.has(name) && !reported.has(name)) {
        reported.add(name)
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
        console.log(`  NG ${f}:${line + 1}  "${name}" が宣言も import もされていません`)
        problems++
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

// ------------------------------------------------------------------
// 【トップレベルの重複宣言】
//
// 同じ名前を同一ファイルで2回 export const すると
//   SyntaxError: Identifier 'X' has already been declared
// で実行時に落ちる。構文解析自体は通ってしまうため、
// 上の未定義チェックでも tsc を通さない限り気づけない。
//
// 実際に定数を追加した際、既に同名の定数があることに気づかず
// 二重宣言してビルドを壊したことがある。
// ------------------------------------------------------------------
let duplicates = 0
for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX)
  const seen = new Map()
  for (const st of sf.statements) {
    const names = []
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (d.name && ts.isIdentifier(d.name)) names.push(d.name.text)
      }
    }
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text)
    for (const n of names) {
      const line = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1
      if (seen.has(n)) {
        console.log(`  NG ${f}:${line}  "${n}" が二重に宣言されています（L${seen.get(n)} にも定義あり）`)
        duplicates++
      } else {
        seen.set(n, line)
      }
    }
  }
}

// ------------------------------------------------------------------
// 【import した名前が実在するか】
//
// 「import { foo } from './bar'」と書いたのに bar が foo を export
// していないケース。実行時に undefined になり、呼び出した瞬間に落ちる。
// リファクタで関数名を変えたときや、まだ書いていない関数を
// 先に import してしまったときに起きる。実際に何度かやっている。
// ------------------------------------------------------------------
const exportsOf = (f) => {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX)
  const out = new Set()
  const add = (n) => n && out.add(n.getText())
  for (const st of sf.statements) {
    const exported = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    if (ts.isVariableStatement(st) && exported) {
      for (const d of st.declarationList.declarations) add(d.name)
    }
    if (
      (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) ||
       ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) && exported
    ) add(st.name)
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) out.add(el.name.getText())
    }
  }
  return out
}

const resolveModule = (from, spec) => {
  const base = spec.startsWith("@/") ? spec.slice(2) : path.join(path.dirname(from), spec)
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (fs.existsSync(base + ext)) return base + ext
  }
  return fs.existsSync(base) && fs.statSync(base).isFile() ? base : null
}

let missing = 0
for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX)
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue
    const spec = st.moduleSpecifier.getText().slice(1, -1)
    if (!spec.startsWith("@/") && !spec.startsWith(".")) continue
    const target = resolveModule(f, spec)
    if (!target) continue
    const available = exportsOf(target)
    const nb = st.importClause?.namedBindings
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) {
        const name = (el.propertyName ?? el.name).getText()
        if (!available.has(name)) {
          const line = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1
          console.log(`  NG ${f}:${line}  "${name}" は ${spec} から export されていません`)
          missing++
        }
      }
    }
  }
}

// 【宣言より前での使用】
//
// ■ なぜ必要か
// const / let には一時的死角（TDZ）があり、宣言より前に参照すると
//   ReferenceError: Cannot access 'netSalary' before initialization
// で落ちる。これは「識別子がどこにも無い」わけではないので、
// 上の未定義チェックでは検出できない。
//
// 実際にこれでデプロイが落ちた。目次（navItems）を、それが参照する
// netSalary・savings・faq の宣言より前に置いてしまい、
// 159社ぶんのページ生成すべてが同じ例外で失敗した。
// （エラーが159回出力されてビルドログが4MB上限を超えた）
//
// ■ 判定方法
// 同じブロック直下に並ぶ文だけを順に見て、
// 「後で宣言される const/let を、それより前の文が即座に参照している」
// 場合を報告する。
// 関数の中や JSX のコールバックからの参照は、実行されるのが後なので
// 問題にならない。よって入れ子の関数には立ち入らない（過検出を防ぐ）。
let tdz = 0
const checkBlockTdz = (statements, sf, file) => {
  // このブロック直下で宣言される const/let と、その順番
  const declIndex = new Map()
  statements.forEach((st, i) => {
    if (!ts.isVariableStatement(st)) return
    const flags = st.declarationList.flags
    const isBlockScoped = (flags & ts.NodeFlags.Const) || (flags & ts.NodeFlags.Let)
    if (!isBlockScoped) return
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && !declIndex.has(d.name.text)) {
        declIndex.set(d.name.text, i)
      }
    }
  })
  if (declIndex.size === 0) return

  // その節点より内側で同じ名前が宣言し直されていないかを調べる。
  // 内側で宣言されていれば、そこでの参照は外側の変数とは別物なので
  //   for (const r of rows) { ... r ... }   ← 外の const r とは無関係
  //   const parts = [...]（内側のブロック）  ← 外の parts とは無関係
  // 見に行かない。これを無視すると正常なコードを誤って報告する。
  const declaredIn = (node) => {
    const names = new Set()
    const collect = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) names.add(n.name.text)
      if (ts.isParameter(n) && ts.isIdentifier(n.name)) names.add(n.name.text)
      if (ts.isBindingElement(n) && ts.isIdentifier(n.name)) names.add(n.name.text)
      ts.forEachChild(n, collect)
    }
    collect(node)
    return names
  }

  statements.forEach((st, i) => {
    // 関数・クラスの宣言そのものは中身が後で実行されるので、丸ごと飛ばす。
    // （これを漏らしていたため、モジュール末尾で定義したヘルパーを
    //   関数の中から呼んでいるだけの正常なコードを誤検出していた）
    if (
      ts.isFunctionDeclaration(st) ||
      ts.isClassDeclaration(st) ||
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) ||
      ts.isImportDeclaration(st) ||
      ts.isExportDeclaration(st)
    ) return

    // 「その文の中で、すぐに評価される部分」だけを見る。
    // 関数・アロー関数・クラスの中身は実行が後になるので入らない。
    const visit = (node) => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isClassDeclaration(node) ||
        ts.isClassExpression(node) ||
        ts.isMethodDeclaration(node)
      ) return

      // 内側のスコープで同名が宣言されていたら、その中は見ない
      if (
        ts.isBlock(node) ||
        ts.isForOfStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForStatement(node) ||
        ts.isCatchClause(node)
      ) {
        const shadowed = declaredIn(node)
        let hit = false
        for (const name of declIndex.keys()) if (shadowed.has(name)) hit = true
        if (hit) return
      }

      // 型注釈は実行されないので見ない（const x: Foo の Foo など）
      if (ts.isTypeNode(node) || ts.isTypeReferenceNode?.(node)) return

      if (ts.isIdentifier(node)) {
        // 【重要】識別子が全て「変数の参照」とは限らない。
        // 名前として書かれているだけのものを除外しないと、
        //   { label: "健康保険料" }   ← オブジェクトのキー
        //   est.label                 ← プロパティ名
        //   <Foo label="..." />       ← JSXの属性名
        // が変数 label の参照だと誤判定される。
        // 実際これを除外せずに走らせたところ、正常なコードで29件の誤検出が出た。
        const p = node.parent
        const isName =
          (ts.isPropertyAssignment(p) && p.name === node) ||
          (ts.isPropertyAccessExpression(p) && p.name === node) ||
          (ts.isJsxAttribute(p) && p.name === node) ||
          (ts.isBindingElement(p) && (p.name === node || p.propertyName === node)) ||
          (ts.isParameter(p) && p.name === node) ||
          (ts.isMethodDeclaration(p) && p.name === node) ||
          (ts.isPropertySignature(p) && p.name === node) ||
          (ts.isPropertyDeclaration(p) && p.name === node) ||
          (ts.isEnumMember(p) && p.name === node) ||
          (ts.isQualifiedName(p) && p.right === node) ||
          ts.isImportSpecifier(p) ||
          ts.isExportSpecifier(p) ||
          ts.isTypeReferenceNode(p) ||
          ts.isTypeQueryNode(p)
        if (isName) return

        const at = declIndex.get(node.text)
        // 自分自身の宣言文は除く（const a = ... の a）
        if (at !== undefined && at > i) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
          const declLine =
            sf.getLineAndCharacterOfPosition(statements[at].getStart(sf)).line + 1
          console.log(
            `  NG ${file}:${line}  "${node.text}" を宣言（${declLine}行）より前で使っています`,
          )
          tdz++
        }
        return
      }
      ts.forEachChild(node, visit)
    }
    // 宣言文なら、初期化式だけを見る（宣言している名前そのものは参照ではない）
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (d.initializer) visit(d.initializer)
      }
    } else {
      // 【注意】ここで forEachChild を使うと、文そのものが visit を通らず
      // 冒頭のスコープ判定が働かない。for 文の変数が外側と同名の場合に
      // 誤検出していたのはこれが原因だった。文そのものから見ること。
      visit(st)
    }
  })
}

for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX)
  const walk = (node) => {
    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      checkBlockTdz(node.statements, sf, f)
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
}

console.log(
  `\n検査 ${files.length} ファイル / 未定義の識別子 ${problems} 件 / 重複宣言 ${duplicates} 件 / import名の不一致 ${missing} 件 / 宣言前の使用 ${tdz} 件`,
)
process.exit(problems + duplicates + missing + tdz > 0 ? 1 : 0)
