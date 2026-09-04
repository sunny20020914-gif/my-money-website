"use client"

import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { useFavorites } from "@/hooks/use-favorites"
import { showToast } from "@/components/toaster"

/**
 * 企業を保存するボタン。
 *
 * 【なぜ詳細ページに置くか】
 * 以前はランキングカードの中だけに保存ボタンがあった。
 * だが一覧は「どの企業が高いか」を見比べる場所であって、
 * 各社を吟味する場所ではない。一覧の各行に操作を置くと、
 * 本来の主役である企業名と金額の領域を圧迫していた。
 *
 * 保存したくなるのは、その企業のページを読んで
 * 「気になる」と判断したあと。操作は判断の直後に置くのが自然なので、
 * 詳細ページに移した。
 *
 * 保存した企業は /saved で一覧できる。
 * ランキングから外すにあたり、保存する手段がサイト上から
 * 完全に消えないよう、こちらを先に用意している。
 *
 * 記事用の FavoriteArticleButton と体裁を揃えてある。
 */
export function FavoriteCompanyButton({
  companyId,
  companyName,
}: {
  companyId: string
  companyName?: string
}) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const isFav = isFavorite(companyId, "company")

  const handleFavoriteClick = () => {
    const added = toggleFavorite(companyId, "company")
    if (added) {
      showToast("企業を保存しました", "success")
    } else {
      showToast("企業の保存を解除しました", "info")
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFavoriteClick}
      aria-pressed={isFav}
      aria-label={
        companyName
          ? isFav
            ? `${companyName}の保存を解除`
            : `${companyName}を保存`
          : undefined
      }
      className={`gap-2 ${
        isFav
          ? "text-primary border-primary dark:text-green-500 dark:border-green-500"
          : "text-muted-foreground hover:text-primary hover:border-primary dark:hover:text-green-500 dark:hover:border-green-500"
      }`}
    >
      <Star className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
      {isFav ? "保存済み" : "この企業を保存"}
    </Button>
  )
}
