import { SITE_URL, SITE_NAME } from "@/lib/config"

interface StructuredDataProps {
  type: "website" | "article" | "organization" | "breadcrumbs"
  data: any
}

// 【SEO】next/script(afterInteractive)ではなく素の<script>を使うことで、
// JSON-LDが初期HTMLに必ず含まれ、クローラーがJS実行なしで確実に読み取れる。
export function StructuredData({ type, data }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
    }

    switch (type) {
      case "website":
        return {
          ...data,
        }

      case "article":
        return {
          ...baseData,
          "@type": "Article",
          headline: data.title,
          description: data.description,
          image: data.image,
          datePublished: data.publishedAt,
          dateModified: data.modifiedAt || data.publishedAt,
          author: {
            "@type": "Person",
            name: data.author,
          },
          publisher: {
            "@type": "Organization",
            name: `${SITE_NAME}編集部`,
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/logo.png`,
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": data.url,
          },
        }

      case "organization":
        return {
          ...baseData,
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/logo.png`,
          description: "日本の大手企業の初任給情報を提供し、就活生のキャリア選択をサポートする情報サイトです。",
          sameAs: [],
        }

      case "breadcrumbs":
        return {
          ...baseData,
          "@type": "BreadcrumbList",
          itemListElement: data.map((item: any, index: number) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        }

      default:
        return baseData
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateStructuredData()),
      }}
    />
  )
}
