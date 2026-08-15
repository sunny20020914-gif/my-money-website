import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { fetchRankingDataServer, fetchArticleDataServer } from "@/lib/sheets"
import { SavedClient } from "./saved-client"
import type { Metadata } from 'next'
import { REVALIDATE_STABLE } from "@/lib/config"

export const revalidate = REVALIDATE_STABLE

export const metadata: Metadata = {
  title: "お気に入り一覧 | My Money Web",
  description: "保存した企業や記事の一覧を確認できます。",
}

export default async function SavedPage() {
  const companies = await fetchRankingDataServer("monthly")
  const articles = await fetchArticleDataServer()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-grow py-8 md:py-12">
        <SavedClient initialCompanies={companies} initialArticles={articles} />
      </main>
      <Footer />
    </div>
  )
}
