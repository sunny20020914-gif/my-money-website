import { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/config'

// 【404対策】以前は public/manifest.json を参照していたが public/ が存在せず404だった。
// App Router の manifest.ts はビルド時に /manifest.webmanifest として配信され、
// <link rel="manifest"> も自動で挿入されるため、静的ファイルを置く必要がない。
// （静的ファイルはコミット漏れで消えやすいが、こちらはソースコードなので消えない）
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} | 就活生のための初任給・年収ランキング`,
    short_name: SITE_NAME,
    description:
      '大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdfaf6',
    theme_color: '#fdfaf6',
    lang: 'ja',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
