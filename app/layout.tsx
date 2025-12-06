import type { Metadata } from "next"
import { ThemeProvider } from "@/app/providers"
import "./globals.css"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
  title: {
    default: "初任給ランキング 2025 | 就活生のための給与情報サイト",
    template: "%s | 初任給ランキング 2025",
  },
  description:
    "大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。2025年最新データで企業選択をサポート。",
  keywords: [
    "初任給",
    "ランキング",
    "就活",
    "新卒",
    "給与",
    "年収",
    "企業比較",
    "就職活動",
    "2025年",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "初任給ランキング 2025 | 就活生のための給与情報サイト",
    description: "大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。",
    url: "https://www.mymoneyweb.com",
    siteName: "初任給ランキング",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "初任給ランキング 2025 | 就活生のための給与情報サイト",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "初任給ランキング 2025 | 就活生のための給与情報サイト",
    description: "大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。",
    images: ["/og-image.jpg"],
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
    google: "ここにGoogle Search Consoleで取得した認証コードを貼り付けます",
  },
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.jpg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
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
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
