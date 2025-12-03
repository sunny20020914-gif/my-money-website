import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RankingPreview } from "@/components/ranking-preview"
import { ArticlePreview } from "@/components/article-preview"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/structured-data"
import { AdBanner } from "@/components/ad-banner"

export default function HomePage() {
  return (
    <>
      <StructuredData type="website" data={{}} />
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroSection />
          <RankingPreview />
          <AdBanner />
          <ArticlePreview />
        </main>
        <Footer />
      </div>
    </>
  )
}
