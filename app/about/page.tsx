import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Users, TrendingUp, Shield } from "lucide-react"

export const metadata = {
  title: "サイトについて | 日本企業初任給ランキング 2025",
  description: "日本企業初任給ランキングサイトの目的、データソース、運営方針について詳しくご紹介します。",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4">サイトについて</h1>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              日本企業初任給ランキングサイトの目的と取り組みについてご紹介します。
            </p>
          </div>

          <div className="space-y-8">
            {/* Mission */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  私たちの使命
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  就活生の皆さんが適切な企業選択を行えるよう、正確で最新の初任給情報を提供することが私たちの使命です。
                  給与情報だけでなく、企業文化、成長性、働きやすさなど、多角的な視点から企業を評価できる情報をお届けします。
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  また、就活に関する実践的なアドバイスや業界動向の分析を通じて、
                  皆さんのキャリア形成をトータルでサポートしたいと考えています。
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    データの信頼性
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    企業の公式発表、有価証券報告書、採用情報など、信頼できる情報源から収集したデータを使用しています。
                    定期的な更新により、常に最新の情報をお届けします。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-4 w-4 text-primary" />
                    ユーザー第一
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    就活生の視点に立ったサイト設計を心がけています。
                    使いやすいインターフェースと分かりやすい情報表示で、効率的な企業研究をサポートします。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-4 w-4 text-primary" />
                    中立性の維持
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    特定の企業や業界に偏らない中立的な立場から情報を提供します。
                    客観的なデータに基づいた分析により、公正な企業比較を可能にします。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-4 w-4 text-primary" />
                    継続的改善
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    ユーザーの皆様からのフィードバックを大切にし、 サイトの機能やコンテンツを継続的に改善しています。
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Data Sources */}
            <Card>
              <CardHeader>
                <CardTitle>データソース</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      公式
                    </Badge>
                    <span className="text-sm text-muted-foreground">企業の公式採用サイト・IR情報</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      法定
                    </Badge>
                    <span className="text-sm text-muted-foreground">有価証券報告書・決算資料</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      調査
                    </Badge>
                    <span className="text-sm text-muted-foreground">業界団体・調査機関のデータ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      報道
                    </Badge>
                    <span className="text-sm text-muted-foreground">信頼できるメディアの報道</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>お問い合わせ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  サイトに関するご質問、データの修正依頼、掲載企業の追加希望などがございましたら、
                  お気軽にお問い合わせください。
                </p>
                <p className="text-sm text-muted-foreground">
                  ※ 個別の就活相談には対応しておりませんが、 サイトのコンテンツ改善に関するご提案は大歓迎です。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
