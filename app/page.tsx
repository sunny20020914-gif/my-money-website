import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RankingPreview } from "@/components/ranking-preview"
// import { FeaturedCompaniesCta } from "@/components/featured-companies-cta"
// import { ArticlePreview } from "@/components/article-preview"
import { Footer } from "@/components/footer"
// import { StructuredData } from "@/components/structured-data"

export default function HomePage() {
  return (
    <>
      {/* <StructuredData type="website" data={{}} /> */}
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroSection />
          <RankingPreview />
          {/* <FeaturedCompaniesCta /> */}
          {/* <ArticlePreview /> */}
        </main>
        <Footer />
      </div>
    </>
  )
}
