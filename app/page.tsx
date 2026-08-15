import { FISCAL_YEAR, SITE_NAME, SITE_URL, REVALIDATE_FRESH } from "@/lib/config"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RankingPreview } from "@/components/ranking-preview"
import { ArticlePreview } from "@/components/article-preview"
import { SiteGuide, DataPolicy } from "@/components/site-guide"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/structured-data"
import dynamic from "next/dynamic"
import { Metadata } from "next"
import { fetchAllUniqueCompanies } from "@/lib/sheets"

// AdBannerをクライアントサイドでのみ動的に読み込む
const DynamicAdBanner = dynamic(() => import("@/components/ad-banner").then((mod) => mod.AdBanner), {
  ssr: false,
})

export const revalidate = REVALIDATE_FRESH

/**
 * 【重要・トップページがインデックスされなかった原因】
 *
 * 以前のトップページは
 *   title: 「初任給ランキング 2026 | My Money Web」
 *   h1   : 「2026年最新 初任給ランキング」
 * であり、/ranking と完全に同じキーワード・同じ検索意図を狙っていた。
 *
 * ところが中身は /ranking の方が圧倒的に厚い（記事型リード文・全社の表・
 * 解説5セクション）。Googleは同一意図の2ページのうち強い方を正規URLに選ぶため、
 * トップページは「重複。Googleが別のページを正規と判断」として
 * インデックスから外れ続けていた。
 *
 * したがってトップページは検索キーワードを取りに行くのをやめ、
 *   ・ブランド検索（My Money Web）
 *   ・「初任給 調べる／データベース」のような回遊型クエリ
 *   ・サイト全体の案内図（クロールの起点）
 * に役割を限定する。titleからも「ランキング」という主要語を外す。
 *
 * ※ トップを廃止して /ranking へ301する案は採らない。
 *   検索結果に表示されるサイト名はトップページの WebSite 構造化データから
 *   のみ判定され、サイトリンクやブランド検索の受け皿も失うため。
 */
export async function generateMetadata(): Promise<Metadata> {
  let listedCount = 0
  try {
    listedCount = (await fetchAllUniqueCompanies()).length
  } catch {
    // データ取得に失敗しても件数抜きの説明文でメタデータは返す
  }

  const countText = listedCount > 0 ? `${listedCount}社` : "上場企業"

  return {
    title: {
      // 【重要】absolute にしないと layout の template（"%s | My Money Web"）が
      // 適用され「… | My Money Web | My Money Web」のように二重になる。
      absolute: `${SITE_NAME}｜企業の初任給・平均年収がわかるデータサイト`,
    },
    description:
      `${countText}の初任給を、手取り額・入社後の平均年収・業績データとあわせて調べられるサイトです。` +
      `採用ページと有価証券報告書をもとに${FISCAL_YEAR}年度のデータを収録。` +
      `業界別・条件別・企業名からも検索できます。`,
    alternates: {
      canonical: `${SITE_URL}/`,
    },
  }
}

export default function HomePage() {
  return (
    <>
      {/* 【検索結果のサイト名】
          Googleは検索結果のドメイン部分に表示する「サイト名」を、
          ホームページ(/)の WebSite 構造化データの name から判定する。
          そのためトップページがインデックスされていることが前提になる。

          name には「サイトの名称」だけを入れ、og:site_name・publisher・
          titleテンプレートとも完全に一致させている（食い違うとGoogleは
          名称を確定できず、ドメイン名 mymoneyweb.com にフォールバックする）。 */}
      <StructuredData
        type="website"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: `${SITE_URL}/`,
          name: SITE_NAME,
          // alternateName は指定しない。Googleがこちらを採用して
          // カタカナ表記が検索結果に出る可能性があるため。
          description:
            "就活生のための初任給・年収データサイト。企業の初任給、手取り、平均年収、業績データを比較できます。",
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: `${SITE_URL}/`,
          },
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/ranking?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroSection />
          {/* 【クロール導線】主要な一覧ページ全てへ本文中からリンクする。
              Googlebotが最も頻繁に訪れるトップから1クリックで各ハブに届き、
              その先の企業詳細ページまでの深さが浅くなる */}
          <SiteGuide />
          <RankingPreview />
          <DynamicAdBanner />
          <ArticlePreview />
          {/* 【E-E-A-T】データの素性を開示する。トップページ固有の文章であり
              /ranking のリード文とは切り口が重ならない */}
          <DataPolicy />
        </main>
        <Footer />
      </div>
    </>
  )
}
