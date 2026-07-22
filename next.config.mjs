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
    ]
  },
}

export default nextConfig