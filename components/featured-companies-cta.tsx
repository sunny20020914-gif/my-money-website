import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ArrowRight } from "lucide-react"

export function FeaturedCompaniesCta() {
  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="bg-card border-primary/20 shadow-lg">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium mb-3">
                  <Star className="w-3 h-3 mr-1.5" />
                  注目企業
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  初任給非公開の注目企業をチェック
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  業界水準や企業規模から高額な給与が期待される、今注目の企業をご紹介します。
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button asChild size="lg">
                  <Link href="/featured">
                    一覧を見る
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
