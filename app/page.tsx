import { FISCAL_YEAR } from "@/lib/config"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RankingPreview } from "@/components/ranking-preview"
import { ArticlePreview } from "@/components/article-preview"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/structured-data";
import dynamic from 'next/dynamic';
import { Metadata } from "next";
import { fetchRankingDataServer } from "@/lib/sheets";

// AdBannerをクライアントサイドでのみ動的に読み込む
const DynamicAdBanner = dynamic(() => import('@/components/ad-banner').then(mod => mod.AdBanner), { ssr: false });

// 1時間（3600秒）ごとにデータを再検証して更新する設定（ISR）を追加
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  try {
    // ランキングページと同じデータソースから初任給ランキングを取得
    const rankingData = await fetchRankingDataServer("monthly");
    
    // 上位3社を抽出して説明文を作成
    // 例: "1位 〇〇(300,000円)、2位 △△(290,000円)..."
    const topCompaniesText = rankingData.slice(0, 3).map((company, index) => {
      const salary = typeof company.baseMonthly === 'number' 
        ? `${company.baseMonthly.toLocaleString()}円` 
        : `${company.baseMonthly}円`;
      return `${index + 1}位 ${company.company}(${salary})`;
    }).join("、");

    return {
      title: `初任給ランキング ${FISCAL_YEAR} | My Money Web`,
      description: `【${FISCAL_YEAR}年最新】初任給ランキング上位：${topCompaniesText}...。上場企業の初任給データを網羅的に掲載。業界別、地域別のランキングも検索可能。就職・転職活動に役立つ情報を提供します。`,
      alternates: {
        canonical: "https://www.mymoneyweb.com/",
      },
    };
  } catch (error) {
    return {
      title: `初任給ランキング ${FISCAL_YEAR} | My Money Web`,
      description: `${FISCAL_YEAR}年度の最新初任給ランキング。上場企業の初任給データを網羅的に掲載。業界別、地域別のランキングも検索可能。就職・転職活動に役立つ情報を提供します。`,
      alternates: {
        canonical: "https://www.mymoneyweb.com/",
      },
    };
  }
}

export default function HomePage() {
  return (
    <>
      <StructuredData
        type="website"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: "https://www.mymoneyweb.com/",
          name: `初任給ランキング ${FISCAL_YEAR}`,
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
