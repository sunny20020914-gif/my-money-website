"use client"

import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { useFavorites } from "@/hooks/use-favorites"
import { showToast } from "@/components/toaster"

export function FavoriteArticleButton({ articleId }: { articleId: string }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const isFav = isFavorite(articleId, "article")

  const handleFavoriteClick = () => {
    const added = toggleFavorite(articleId, "article")
    if (added) {
      showToast("記事を保存しました", "success")
    } else {
      showToast("記事の保存を解除しました", "info")
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFavoriteClick}
      className={`gap-2 ${
        isFav
          ? "text-primary border-primary dark:text-green-500 dark:border-green-500"
          : "text-muted-foreground hover:text-primary hover:border-primary dark:hover:text-green-500 dark:hover:border-green-500"
      }`}
    >
      <Star className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
      {isFav ? "保存済み" : "記事を保存"}
    </Button>
  )
}