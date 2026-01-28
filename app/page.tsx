import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RankingPreview } from "@/components/ranking-preview"
import { ArticlePreview } from "@/components/article-preview"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/structured-data";
import dynamic from 'next/dynamic';
import { Metadata } from "next";

// AdBannerをクライアントサイドでのみ動的に読み込む
const DynamicAdBanner = dynamic(() => import('@/components/ad-banner').then(mod => mod.AdBanner), { ssr: false });

// 1時間（3600秒）ごとにデータを再検証して更新する設定（ISR）を追加
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "初任給ランキング 2026 | My Money Web",
  description: "2026年度の最新初任給ランキング。上場企業の初任給データを網羅的に掲載。業界別、地域別のランキングも検索可能。就職・転職活動に役立つ情報を提供します。",
  alternates: {
    canonical: "https://www.mymoneyweb.com/",
  },
};

export default function HomePage() {
  return (
    <>
      <StructuredData
        type="website"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: "https://www.mymoneyweb.com/",
          name: "初任給ランキング 2026",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.mymoneyweb.com/ranking?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroSection />
          <RankingPreview />
          <DynamicAdBanner />
          <ArticlePreview />
        </main>
        <Footer />
      </div>
    </>
  )
}
