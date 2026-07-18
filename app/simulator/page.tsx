import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AdBanner } from "@/components/ad-banner"
import { SimulatorClient } from "@/components/simulator-client"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"
import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: `初任給の手取り計算シミュレーター【${FISCAL_YEAR}年版】額面から自動計算`,
  description: `初任給の額面月給から手取り額を自動計算。社会保険料（健康保険・厚生年金・雇用保険）と所得税・住民税の内訳、1年目と2年目以降の違い、賞与込みの手取り年収まで無料でシミュレーションできます。`,
  alternates: {
    canonical: `${SITE_URL}/simulator`,
  },
  openGraph: {
    title: `初任給の手取り計算シミュレーター【${FISCAL_YEAR}年版】`,
    description: `額面月給を入力するだけで手取り額と控除の内訳を自動計算。1年目と2年目以降の違いも分かります。`,
  },
}

const faq = [
  {
    question: "初任給の手取りはどうやって計算しますか？",
    answer:
      "額面月給から社会保険料（健康保険料 約5%、厚生年金保険料 9.15%、雇用保険料 0.55%）と所得税（源泉徴収）を差し引いた金額が手取りです。目安として額面の80〜85%程度になります。",
  },
  {
    question: "新卒1年目は手取りが多いのはなぜですか？",
    answer:
      "住民税は前年の所得に対して課税されるため、前年に所得のない新卒1年目は住民税が徴収されません。2年目の6月から住民税の徴収が始まり、手取りは月1〜2万円程度減るのが一般的です。",
  },
  {
    question: "初任給25万円の手取りはいくらですか？",
    answer:
      "額面25万円の場合、社会保険料と所得税を差し引いた1年目の手取りは約21万円（額面の約84%）です。住民税が始まる2年目以降は約20万円が目安です（独身・扶養なしの概算）。",
  },
]

export default function SimulatorPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "手取り計算シミュレーター", item: `${SITE_URL}/simulator` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-3xl mx-auto space-y-8">
            <section>
              <nav aria-label="パンくずリスト" className="text-xs text-muted-foreground mb-3">
                <Link href="/" className="hover:underline">ホーム</Link>
                <span className="mx-1.5">›</span>
                <span>手取り計算シミュレーター</span>
              </nav>
              <h1 className="text-xl md:text-3xl font-bold text-primary">
                初任給の手取り計算シミュレーター【{FISCAL_YEAR}年版】
              </h1>
              {/* 【AI SEO】答えを先に書く1文 */}
              <p className="mt-4 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                額面月給を入力するだけで、社会保険料・税金を差し引いた手取り額を自動計算します。
                手取りの目安は額面の80〜85%で、住民税のない新卒1年目はやや多くなります。
              </p>
            </section>

            <SimulatorClient />

            <AdBanner />

            {/* --- 解説（SEO用の静的コンテンツ） --- */}
            <section className="space-y-4">
              <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                初任給から引かれるお金の内訳
              </h2>
              <div className="space-y-3 text-[15px] leading-relaxed">
                <p>
                  額面の初任給からは、健康保険料（料率約10%を会社と折半）、厚生年金保険料（18.3%を折半）、雇用保険料（本人負担0.55%）の社会保険料と、所得税（源泉徴収）が毎月差し引かれます。
                  合計すると額面のおよそ15〜20%にあたります。
                </p>
                <p>
                  住民税は前年の所得に課税される仕組みのため、新卒1年目は引かれず、2年目の6月から徴収が始まります。
                  「2年目に手取りが減った」と感じるのはこの住民税が理由です。
                </p>
                <p>
                  企業ごとの初任給・手取り目安は
                  <Link href="/ranking" className="text-primary hover:underline mx-1">初任給ランキング</Link>
                  や各企業の詳細ページで確認できます。
                </p>
              </div>
            </section>

            {/* --- FAQ --- */}
            <section className="space-y-4">
              <h2 className="text-lg md:text-xl font-bold text-primary border-b-2 border-primary/50 pb-2">
                手取り計算に関するよくある質問
              </h2>
              <dl className="space-y-5">
                {faq.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <dt className="font-bold text-[15px] md:text-base">Q. {item.question}</dt>
                    <dd className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">A. {item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <AdBanner />
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
