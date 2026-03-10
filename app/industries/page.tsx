import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AdBanner } from "@/components/ad-banner"
import { IndustryOverview } from "@/components/industry-overview"
import { IndustryRankings } from "@/components/industry-rankings"

// 1時間（3600秒）ごとにデータを再検証して更新する設定（ISR）
export const revalidate = 3600

export const metadata = {
  title: "業界別初任給分析 | 日本企業初任給ランキング 2026",
  description:
    "業界別の初任給データを詳細分析。各業界の特徴、将来性、キャリアパスを比較して最適な業界選択をサポートします。",
}

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4">業界別分析</h1>
            <p className="text-lg text-muted-foreground text-balance max-w-3xl">
              各業界の初任給データと特徴を詳しく分析。業界の将来性やキャリアパスも含めて、あなたの業界選択をサポートします。
            </p>
          </div>

          <AdBanner />

          <IndustryOverview />
          <IndustryRankings />
        </div>
      </main>
      <Footer />
    </div>
  )
}
