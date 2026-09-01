import { fetchRankingDataServer, type CompanyData, type RankingType } from "@/lib/sheets"
import { buildRankingSummary, buildRankingFaq } from "@/lib/ranking-summary"
import { RankingPageClient } from "./ranking-page-client"
import { SITE_URL, FISCAL_YEAR } from "@/lib/config"
import { updatedAt } from "@/lib/updated-at"

/**
 * 初任給ランキング（/ranking）と想定年収ランキング（/ranking/annual）の
 * 共通描画処理。
 *
 * 【なぜ分離したか】
 * 以前は1つのURLでタブ切り替えしていたため、検索エンジンから見て
 * 「このページは初任給の話なのか年収の話なのか」というテーマが分散していた。
 * ランキング種別ごとに独立したURLにすることで、
 * それぞれが個別に検索評価を受けられる。
 * データ取得と構造化データの組み立ては同じなので、ここに集約する。
 */
export async function renderRankingPage(rankingType: RankingType) {
  const isAnnual = rankingType === "annual"
  const path = isAnnual ? "/ranking/annual" : "/ranking"
  const pageName = isAnnual ? "想定年収ランキング" : "初任給ランキング"

  try {
    // 【転送量削減】一覧ページが実際に使う列だけをクライアントへ渡す。
    // ここで落とす列（企業サイトURL・一人当たり指標・対象期など）は企業詳細ページ専用で、
    // 4,000社規模ではHTML/RSCペイロードを数百KB単位で太らせるだけになる。
    // 【落とせない列に注意】カードは description・salaryUrl・logo/domain のほか、
    // 財務指標に revenue・operatingMargin・averageAnnualSalary・連結/単体従業員数・
    // accountingStandard（営業利益率/事業利益率のラベル分岐）を使う。
    // 列を落とす際は ranking-page-client と lib/financials の使用箇所を確認すること。
    const toListPayload = ({
      url,
      operatingProfit,
      salesPerEmployee,
      profitPerEmployee,
      capitalPerEmployee,
      laborShare,
      fiscalPeriod,
      ...rest
    }: CompanyData): CompanyData => rest

    const initialData = (await fetchRankingDataServer(rankingType)).map(toListPayload)

    // C列の業界データを抽出し、重複を除いたリストを作成
    const allIndustries = initialData.flatMap((c) => c.industry.split("/")).filter(Boolean)
    const uniqueIndustries = Array.from(new Set(allIndustries)).sort()

    // 冒頭サマリー用の集計（平均・中央値・業種別平均＝独自データ）
    const summary = buildRankingSummary(initialData)
    // 【ISR課金】日単位に丸める。時刻まで含めると再生成のたびにHTMLが変わり、
    // データが同じでもキャッシュ書き込みが毎回発生する（lib/updated-at.ts 参照）
    const updatedLabel = updatedAt().label

    const itemListLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${pageName} ${FISCAL_YEAR}`,
      description: isAnnual
        ? `${FISCAL_YEAR}年度 新卒の想定年収ランキング（賞与込み）`
        : `${FISCAL_YEAR}年度 新卒初任給ランキング（月額）`,
      // 【構造化データの肥大化対策】全社分入れると4,000社で数百KBのJSONが
      // 毎ページに埋まる。リッチリザルトの評価には上位分で十分なため100件に制限する。
      numberOfItems: Math.min(initialData.length, 100),
      itemListElement: initialData.slice(0, 100).map((company, i) => ({
        "@type": "ListItem",
        position: company.rank || i + 1,
        name: company.company,
        url: `${SITE_URL}/companies/${company.id}`,
      })),
    }

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE_URL}/` },
        ...(isAnnual
          ? [
              { "@type": "ListItem", position: 2, name: "初任給ランキング", item: `${SITE_URL}/ranking` },
              { "@type": "ListItem", position: 3, name: pageName, item: `${SITE_URL}${path}` },
            ]
          : [{ "@type": "ListItem", position: 2, name: pageName, item: `${SITE_URL}${path}` }]),
      ],
    }

    // 【SEO】FAQリッチリザルト用。クライアント側で表示するFAQと
    // 同じ関数・同じ入力から生成しているため、内容は必ず一致する。
    const faq = buildRankingFaq(summary, FISCAL_YEAR)
    const faqLd =
      faq.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }
        : null

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
        <RankingPageClient
          initialData={initialData}
          initialError={null}
          industryList={uniqueIndustries}
          summary={summary}
          updatedLabel={updatedLabel}
          rankingType={rankingType}
        />
      </>
    )
  } catch (error) {
    console.error(`[ranking] ${pageName}のデータ取得に失敗:`, error)
    return (
      <RankingPageClient
        initialData={[]}
        initialError="データの取得に失敗しました。後でもう一度お試しください。"
        industryList={[]}
        summary={null}
        updatedLabel=""
        rankingType={rankingType}
      />
    )
  }
}
