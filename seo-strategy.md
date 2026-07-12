# SEO・AI SEO（LLMO）強化方針

前提: スプシ＋GASのデータ取得ロジックは一切変更しない。すべてNext.js側（表示層・メタデータ層）の改善で完結させる。

---

## 現状評価

### できていること（維持する）
- Metadata API による title / description / OGP / canonical（主要ページ）
- ISR（revalidate 3600）＋ generateStaticParams で全企業・記事・業界ページを静的生成
- sitemap.ts / robots.ts の自動生成
- JSON-LD: WebSite, Organization, BreadcrumbList, ItemList（ランキング）, Article
- 業界別ハブページ（/industries/[industry]）による内部リンク構造
- ランキングは initialData をサーバーで渡しているためHTMLに内容が含まれる（SEO上OK）

### コード上の具体的な課題
| 箇所 | 問題 | 影響 |
|---|---|---|
| `next.config.mjs` | `images.unoptimized: true` | LCP悪化 → Core Web Vitals低評価 |
| `app/sitemap.ts` | 全URLの `lastModified: new Date()`（毎回更新） | 更新シグナルが無意味化しクロール効率低下 |
| `components/structured-data.tsx` | JSON-LDを `next/script`（afterInteractive）で注入 | 初期HTMLに構造化データが含まれない可能性。記事ページが該当 |
| `app/articles/[id]/page.tsx` | canonical未設定 | 重複コンテンツ判定リスク |
| `app/robots.ts` | AIクローラーへの明示的許可なし | AI検索（ChatGPT/Perplexity/Claude）への露出機会損失 |
| 全体 | `https://www.mymoneyweb.com` が20箇所以上ハードコード | ドメイン変更・検証環境で事故る。環境変数化推奨 |
| 全体 | 「2026」がタイトル等にハードコード | 年次更新漏れ → 古いサイトと判定される |

---

## 方針の柱

### 柱1: 技術SEOの修正（即効・低コスト）— 最優先
1. **画像最適化を有効化**: `unoptimized: true` を外し、`remotePatterns` で clearbit / Google Favicon ドメインを許可。ロゴのリンク切れフォールバック（課題②）と併せて実装。
2. **sitemapのlastModified修正**: 記事は `publishedAt` を使用（実装済み）。企業・静的ページはビルド日付を定数化し、実際に変わった時だけ更新。
3. **JSON-LDをサーバーレンダリングに統一**: `structured-data.tsx` を `next/script` から素の `<script>` に変更（companies ページの方式に統一）。
4. **記事ページに canonical 追加**。
5. **URL・年度の定数化**: `lib/config.ts` に `SITE_URL` と `FISCAL_YEAR` を定義し全ページで参照。

### 柱2: 既存スプシデータの「再利用」でページを厚くする
スプシは変えずに、取得済みデータの組み合わせだけで各ページの独自性・網羅性を上げる。

1. **企業ページに比較コンテキストを自動生成**:
   - 「業界内○位 / ○社中」「業界平均より＋○円」「全体平均との差」— ランキングデータから計算可能
   - 同業界の企業への内部リンク（関連企業セクション）→ クロール網羅性と回遊率が向上
2. **企業ページにFAQセクション自動生成**（後述のFAQPageスキーマとセット）:
   - 「○○の初任給はいくら？」「○○の想定年収は？」「○○の従業員数は？」— 全てスプシデータから機械生成
3. **業界ページに統計サマリー**: 平均・中央値・最高・最低をデータから算出して冒頭に表示。
4. **「最終更新日」の表示**: ISR再生成日時をページに明示。鮮度シグナルはSEO・AI SEO両方に効く。

### 柱3: 構造化データの拡充
1. **FAQPage スキーマ**（企業ページ・業界ページ）: 給与系クエリのリッチリザルト獲得。
2. **企業ページの Organization に給与情報を補強**: `Occupation` + `estimatedSalary`（MonetaryAmount）は求人でなくても職業給与情報として有効。
3. **Article スキーマに dateModified を正しく供給**（現状 publishedAt のフォールバックのみ）。
4. **動的OG画像**: `next/og`（ImageResponse）で企業名＋初任給入りのOG画像を自動生成。SNS・AI検索のプレビューで差別化。

### 柱4: AI SEO（LLMO / GEO）
AI検索（ChatGPT, Perplexity, Claude, Google AI Overviews）に引用されるための施策。

1. **robots.ts でAIクローラーを明示許可**: GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, CCBot。
2. **llms.txt を追加**（`app/llms.txt/route.ts`）: サイト概要＋主要ページ一覧をMarkdownで提供。sitemapと同様にスプシデータから自動生成。
3. **Bing Webmaster Tools 登録 + IndexNow 導入**: ChatGPT検索はBingインデックスに依存。IndexNowはISR再生成時にAPIを叩くだけで実装可能。
4. **「答えを先に書く」構造**: 各企業ページ冒頭に「○○の初任給は月額○円、想定年収は○円（2026年度）」の一文サマリーを機械生成で配置。AIが引用しやすい自己完結型の文。
5. **テーブルはHTMLで**: ランキング表がdivベースなら `<table>` セマンティクスへ。AIのパース精度が上がる。

### 柱5: E-E-A-T（給与情報はYMYL領域）
1. **データ出典・更新方針ページ**の新設: 「各社公式採用情報を元に、○ヶ月ごとに更新」等の方法論を明記。AIも検索エンジンも信頼性評価に使う。
2. **運営者情報の充実**（/about強化）: 誰が・何のために運営しているか。
3. **各給与データに出典リンク**: スプシに既にある salaryUrl（M列）を「出典: 公式採用ページ」として表示。既存データの再利用のみ。

---

## 優先順位ロードマップ

| 優先度 | 施策 | 工数目安 |
|---|---|---|
| P0 | 画像最適化ON、sitemap修正、JSON-LDサーバー化、記事canonical | 半日 |
| P0 | robots.tsのAIボット許可、llms.txt | 1〜2時間 |
| P1 | 企業ページの冒頭サマリー＋FAQ＋FAQPageスキーマ | 1日 |
| P1 | 業界内順位・平均比較・関連企業リンク | 1日 |
| P1 | Bing登録 + IndexNow | 半日 |
| P2 | 動的OG画像、出典表示、データ方針ページ | 1〜2日 |
| P2 | SITE_URL/年度の定数化リファクタ | 半日 |

**測定**: Search Console（既に検証タグあり）＋ Bing Webmaster。AI流入はGA4のリファラー（chatgpt.com, perplexity.ai等）でセグメント作成。

---

## やらないこと
- スプシのスキーマ変更・GAS改修（前提条件）
- JobPostingスキーマ（求人票ではないためポリシー違反リスク）
- 外部CMS導入・DB移行（現構成のISRで十分）
