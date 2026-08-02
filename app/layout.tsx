import type { Metadata } from "next"
import { ThemeProvider } from "@/app/providers"
import "./globals.css"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "@/components/toaster"

export const metadata: Metadata = {
  title: {
    default: "My Money Web | 就活生のための初任給・年収ランキングサイト",
    template: "%s | My Money Web",
  },
  description:
    "大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。2026年最新データで企業選択をサポート。",
  keywords: [
    "初任給",
    "ランキング",
    "就活",
    "新卒",
    "給与",
    "年収",
    "企業比較",
    "就職活動",
    "2026年",
    "業界別",
    "職種別",
  ],
  authors: [{ name: "初任給ランキング編集部" }],
  creator: "初任給ランキング",
  publisher: "初任給ランキング",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.mymoneyweb.com"),
  // 【重要・SEO】ここで alternates.canonical を設定してはいけない。
  // ルートlayoutのmetadataは全ページのデフォルトとして継承されるため、
  // canonicalを自前設定していないページ（/about・/featured・/privacy・/terms や
  // notFound()時のエラーページ）が「ホームページが正規URL」と宣言してしまい、
  // Googleにホームの複製と見なされてインデックスから外される。
  // canonicalは各ページの generateMetadata / metadata で個別に指定すること。
  openGraph: {
    title: "初任給ランキング 2026 | 就活生のための給与情報サイト",
    description: "大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。",
    url: "https://www.mymoneyweb.com",
    siteName: "初任給ランキング",
    // images は指定しない。app/opengraph-image.tsx が自動でOG画像を生成し
    // og:image / twitter:image を挿入するため。
    // （以前は存在しない /og-image.jpg を指しており404になっていた）
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "初任給ランキング 2026 | 就活生のための給与情報サイト",
    description: "大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "a_S1UPZldDGqHo0zX2mfgEBKBNQSw0uQOpknC14uP5w",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 【404対策】以前ここで /favicon.ico・/favicon.jpg・/apple-touch-icon.png・
            /manifest.json を参照していたが、public/ ディレクトリが存在せず
            全ページで4件ずつ404が発生していた（実機で確認済み）。
            faviconは App Router の規約により app/icon.png が自動で使われるため、
            手書きの <link> は不要。manifestは app/manifest.ts が自動で <link> を挿入する。 */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fdfaf6" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#020817" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2945316858541395"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZDV57DQ647"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZDV57DQ647');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
