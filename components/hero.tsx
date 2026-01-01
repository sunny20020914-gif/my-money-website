import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              あなたの市場価値を知る
              <br />
              未来のキャリアを描く
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
              国内最大級の初任給データベース。
              <br className="hidden sm:inline" />
              業界別・職種別の給与水準を比較し、あなたに最適な企業を見つけましょう。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 min-w-[200px]">
            <Button asChild size="lg" className="h-12 px-8 text-lg">
              <Link href="/ranking">
                ランキングを見る
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg">
              <Link href="/industry-analysis">
                業界分析を読む
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      </div>
    </section>
  )
}