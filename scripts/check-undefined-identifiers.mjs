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

console.log(
  `\n検査 ${files.length} ファイル / 未定義の識別子 ${problems} 件 / 重複宣言 ${duplicates} 件 / import名の不一致 ${missing} 件`,
)
process.exit(problems + duplicates + missing > 0 ? 1 : 0)
