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
            name: "初任給ランキング編集部",
            logo: {
              "@type": "ImageObject",
              url: "https://www.mymoneyweb.com/logo.png",
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
          url: "https://www.mymoneyweb.com",
          logo: "https://www.mymoneyweb.com/logo.png",
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
