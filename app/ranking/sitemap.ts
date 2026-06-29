import { MetadataRoute } from 'next'

// このファイルは無効化済み。サイトマップはルートの /app/sitemap.ts に一本化。
// （削除できない場合の代替措置として空配列を返す）
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return []
}