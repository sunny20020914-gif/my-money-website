import { permanentRedirect } from "next/navigation"

// 旧「業界別分析」ページ。手書きスプレッドシート（業界別データタブ）依存の実装から、
// 企業データを自動集計する /industries に統合した。
// 旧URLの被リンク・ブックマーク・検索インデックスを保持するため 308 で恒久リダイレクトする。
export default function IndustryAnalysisRedirect() {
  permanentRedirect("/industries")
}
