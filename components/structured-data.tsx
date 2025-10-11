import Script from "next/script"

interface StructuredDataProps {
  type: "website" | "article" | "organization"
  data: any
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
    }

    switch (type) {
      case "website":
        return {
          ...baseData,
          "@type": "WebSite",
          name: "日本企業初任給ランキング 2025",
          url: "https://salary-ranking.vercel.app",
          description: "日本の大手企業の初任給を徹底比較。業界別・職種別の給与データと就活に役立つ情報を提供します。",
          publisher: {
            "@type": "Organization",
            name: "初任給ランキング編集部",
          },
          potentialAction: {
            "@type": "SearchAction",
            target: "https://salary-ranking.vercel.app/ranking?search={search_term_string}",
            "query-input": "required name=search_term_string",
          },
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
            name: "初任給ランキング編集部",
            logo: {
              "@type": "ImageObject",
              url: "https://salary-ranking.vercel.app/logo.png",
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
          name: "初任給ランキング編集部",
          url: "https://salary-ranking.vercel.app",
          logo: "https://salary-ranking.vercel.app/logo.png",
          description: "日本の大手企業の初任給情報を提供し、就活生のキャリア選択をサポートする情報サイトです。",
          sameAs: [],
        }

      default:
        return baseData
    }
  }

  return (
    <Script
      id={`structured-data-${type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateStructuredData()),
      }}
    />
  )
}
