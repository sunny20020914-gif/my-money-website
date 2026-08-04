import { ImageResponse } from 'next/og'
import { FISCAL_YEAR } from '@/lib/config'

// 【404対策 + OGP改善】
// layout.tsx が /og-image.jpg を参照していたが public/ が無く404だった。
// そのためSNSやAI検索でシェアされてもプレビュー画像が出ていない状態だった。
// 画像ファイルを置く代わりに next/og で動的生成する。
// （静的ファイルと違いソースコードなので、コミット漏れで消える心配がない）
//
// ※日本語はデフォルトフォントに無く豆腐（□）になるため、
//   描画するテキストは英数字のみに限定している。

export const runtime = 'edge'
export const alt = 'My Money Web - 就活生のための初任給・年収ランキング'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fdfaf6',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              backgroundColor: '#1d7fe0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            Y
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: '#12263f',
            }}
          >
            My Money Web
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: '#5b6b7f',
          }}
        >
          Starting Salary Rankings {FISCAL_YEAR}
        </div>
      </div>
    ),
    size,
  )
}
