"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, RefreshCw, FileSpreadsheet, BookOpen, BarChart3, AlertCircle, CheckCircle } from "lucide-react"
import { useRankingData, useArticleData } from "@/hooks/use-sheets-data"

export function AdminPanel() {
  const { data: rankingData, loading: rankingLoading, refreshData: refreshRanking } = useRankingData()
  const { data: articleData, loading: articleLoading, refreshData: refreshArticles } = useArticleData()

  const handleShowSettings = () => {
    alert(
      "環境変数の設定方法:\n\n1. Vercelプロジェクト設定で以下の環境変数を追加:\n   - GOOGLE_SHEETS_API_KEY (サーバーサイド専用)\n   - SPREADSHEET_ID (サーバーサイド専用)\n\n2. デプロイ後にページを再読み込みしてください。\n\n注意: セキュリティのため、APIキーはサーバーサイドでのみ使用されます。",
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">管理画面</h1>
        <Badge variant="secondary">
          <Settings className="mr-1 h-3 w-3" />
          データ管理システム
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="ranking">ランキング管理</TabsTrigger>
          <TabsTrigger value="articles">記事管理</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">登録企業数</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rankingData.length}</div>
                <p className="text-xs text-muted-foreground">ランキングに登録されている企業数</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">公開記事数</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{articleData.length}</div>
                <p className="text-xs text-muted-foreground">サイトに公開されている記事数</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">データソース</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Google Sheets</div>
                <p className="text-xs text-muted-foreground">スプレッドシートから自動取得</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>スプレッドシート構成ガイド</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">ランキング用シート (3種類)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  「年俸ランキング」「月額額面ランキング」「基本給ランキング」の3つのシートに、それぞれ以下の列を設定してください：
                </p>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                  <Badge variant="outline">A: 順位</Badge>
                  <Badge variant="outline">B: 企業名</Badge>
                  <Badge variant="outline">C: 業界</Badge>
                  <Badge variant="outline">D: 想定年収</Badge>
                  <Badge variant="outline">E: 初任給(月額)</Badge>
                  <Badge variant="outline">F: 従業員数</Badge>
                  <Badge variant="outline">G: 設立年</Badge>
                  <Badge variant="outline">H: 企業説明</Badge>
                  <Badge variant="outline">I: 公式URL</Badge>
                  <Badge variant="outline">J: ドメイン</Badge>
                  <Badge variant="outline">K: ロゴURL</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">「記事」シート</h4>
                <p className="text-sm text-muted-foreground mb-2">以下の列を設定してください：</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Badge variant="outline">A: 記事ID</Badge>
                  <Badge variant="outline">B: タイトル</Badge>
                  <Badge variant="outline">C: 概要</Badge>
                  <Badge variant="outline">D: 本文</Badge>
                  <Badge variant="outline">E: カテゴリ</Badge>
                  <Badge variant="outline">F: 公開日</Badge>
                  <Badge variant="outline">G: 著者</Badge>
                  <Badge variant="outline">H: 読了時間</Badge>
                  <Badge variant="outline">I: 画像URL</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ランキングデータ管理</CardTitle>
              <Button onClick={refreshRanking} disabled={rankingLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${rankingLoading ? "animate-spin" : ""}`} />
                データ更新
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {rankingLoading ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    {rankingLoading
                      ? "データを読み込み中..."
                      : `${rankingData.length}件のランキングデータが読み込まれています`}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    スプレッドシートでデータを編集後、「データ更新」ボタンをクリックして最新情報を反映してください。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>記事データ管理</CardTitle>
              <Button onClick={refreshArticles} disabled={articleLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${articleLoading ? "animate-spin" : ""}`} />
                データ更新
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {articleLoading ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    {articleLoading
                      ? "データを読み込み中..."
                      : `${articleData.length}件の記事データが読み込まれています`}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>スプレッドシートで記事を編集後、「データ更新」ボタンをクリックして最新情報を反映してください。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets API設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">セキュリティ改善済み</span>
                </div>
                <p className="text-sm text-green-700">
                  APIキーはサーバーサイドでのみ使用され、ブラウザには露出されません。
                </p>
              </div>

              <Button onClick={handleShowSettings} className="w-full">
                環境変数設定ガイドを表示
              </Button>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>設定手順：</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Google Cloud Consoleで新しいプロジェクトを作成</li>
                  <li>Google Sheets APIを有効化</li>
                  <li>APIキーを作成（制限設定推奨）</li>
                  <li>スプレッドシートを「リンクを知っている全員」に共有設定</li>
                  <li>スプレッドシートURLからIDを取得</li>
                  <li>Vercelプロジェクト設定で環境変数を追加</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
