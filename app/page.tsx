import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RankingPreview } from "@/components/ranking-preview"
import { ArticlePreview } from "@/components/article-preview"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/structured-data";
import dynamic from 'next/dynamic';

// AdBannerをクライアントサイドでのみ動的に読み込む
const DynamicAdBanner = dynamic(() => import('@/components/ad-banner').then(mod => mod.AdBanner), { ssr: false });

export default function HomePage() {
  return (
    <>
      <StructuredData
        type="website"
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: "https://www.mymoneyweb.com/",
          name: "初任給ランキング 2025",
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
