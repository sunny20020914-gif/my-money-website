/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // ロゴURLはスプシ（K列）由来で任意ドメインになり得るため、httpsを全て許可する。
    // next/imageの最適化（WebP変換・リサイズ）が有効になり、LCP・Core Web Vitalsが改善する。
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // 旧「業界別分析」ページは /industries に統合。旧URLを 308 で恒久リダイレクトする。
  async redirects() {
    return [
      {
        source: "/industry-analysis",
        destination: "/industries",
        permanent: true,
      },
      // 旧: /ranking?type=annual → 独立ページ /ranking/annual へ集約。
      // クエリ付きURLが検索結果や外部リンクに残っていても正しく着地させる。
      {
        source: "/ranking",
        has: [{ type: "query", key: "type", value: "annual" }],
        destination: "/ranking/annual",
        permanent: true,
      },
    ]
  },
}

export default nextConfig