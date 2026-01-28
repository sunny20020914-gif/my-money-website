import { ArrowRightIcon, TrendingUpIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative pt-20 lg:pt-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <TrendingUpIcon className="w-4 h-4 mr-2" />
            2026年最新データ
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="block bg-gradient-to-r from-primary from-30% via-primary-foreground to-primary to-70% bg-[length:200%_auto] bg-clip-text text-transparent animate-[animate-gradient_9s_ease_infinite]">
              <span className="block md:inline">2026年最新</span>
              <span className="block md:inline">
                初任給ランキング
              </span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground text-balance mb-12 max-w-3xl mx-auto leading-relaxed">
            就活生必見！大手から成長企業まで、初任給や年収などのリアルな情報を多角的に分析。
            あなたの就活を成功に導く情報がここにあります。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-primary">
              <Link href="/articles">
                就活記事を読む
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent border-border">
              <Link href="/ranking">ランキングを見る</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
