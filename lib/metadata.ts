import type { Metadata } from "next"
import { SITE_NAME, SITE_URL } from "./config"

// ------------------------------------------------------------------
// ページごとの OGP / Twitter カードを組み立てるヘルパー。
//
// 【なぜ必要か・Next.js metadata の落とし穴】
// ルートlayout（app/layout.tsx）に openGraph / twitter を書いても、
// Next.js はこれらを**深くマージしない**。
// ページ側で openGraph を1つでも定義すると、layout 側の openGraph は
// まるごと置き換えられる。
//
// その結果、実測で次の2つの壊れ方が同時に起きていた。
//
//   ① 自前の openGraph を持たないページ（/ranking・/companies・/lists など）
//      → layout の値がそのまま出るため、全ページが
//        og:url = https://www.mymoneyweb.com（ホーム）を名乗る
//      → og:title も「初任給ランキング 2026」固定
//
//   ② 自前の openGraph を持つページ（/companies/[id] など）
//      → og:title は正しいが og:url / og:site_name / og:locale / og:type が消える
//      → twitter は別キーなので置き換わらず、汎用文言のまま残る
//        （企業ページをXで共有すると見出しが企業名にならない）
//
// canonical は各ページで正しく出ているのでインデックス判定は壊れていないが、
// SNSで共有されたときに中身が伝わらないのは、被リンクと認知を取りに行く
// 局面では明確な機会損失になる。
//
// このヘルパーを使えば、ページ側は title / description / path を渡すだけで
// 必要なキーがすべて埋まった完全なオブジェクトが返る。
// ------------------------------------------------------------------

/** OG画像。app/opengraph-image.tsx が生成するものを使う */
const OG_IMAGE_NOTE =
  "images は指定しない。app/opengraph-image.tsx が各ルートのOG画像を自動生成し、og:image / twitter:image を挿入するため。"
void OG_IMAGE_NOTE

export interface PageMetaInput {
  /** そのページのタイトル（サイト名は付けない。layoutのtemplateが付ける） */
  title: string
  description: string
  /** サイトルートからのパス。例: "/companies/Accenture"。先頭のスラッシュを含める */
  path: string
  /** 記事ページだけ "article" を渡す。既定は "website" */
  type?: "website" | "article"
  /** 記事の公開日時（ISO文字列）。無ければ渡さない */
  publishedTime?: string
  /** 記事の著者名 */
  authors?: string[]
}

/**
 * canonical・openGraph・twitter をまとめて返す。
 *
 * 返り値をページの metadata にそのまま展開して使う。
 * title / description はページ側でも別途指定すること
 * （検索結果に出るのは metadata.title であり og:title ではないため）。
 */
export function buildPageMeta(input: PageMetaInput): Pick<
  Metadata,
  "alternates" | "openGraph" | "twitter"
> {
  const url = `${SITE_URL}${input.path}`

  return {
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      // 【重要】ページ自身のURLを入れる。
      // ここを省くと layout の値（ホーム）が使われず単に消えるため、
      // SNS側が共有元のページを特定できなくなる。
      url,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: input.type ?? "website",
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.authors ? { authors: input.authors } : {}),
    },
    // twitter は openGraph とは別のキーなので、ページ側で指定しないと
    // layout の汎用文言がそのまま残る。必ずページごとに上書きする。
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  }
}
