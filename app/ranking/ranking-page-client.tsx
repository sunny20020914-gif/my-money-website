"use client"

import React, { useState, useMemo, useEffect, CSSProperties } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, ExternalLink, AlertCircle, ArrowRightIcon, ChevronDown, Star, TrendingUpIcon } from "lucide-react"
import { AdBanner } from "@/components/ad-banner"
import { useRankingData } from "@/hooks/use-sheets-data"
import type { CompanyData } from "@/lib/sheets"
import { useFavorites } from "@/hooks/use-favorites"
import { showToast } from "@/components/toaster"
import { CompanyLogo } from "@/components/company-logo"
import { buildAllListDefinitions } from "@/lib/list-definitions"
import { buildCardFinancialMetrics, LISTED_COMPANY_NOTE } from "@/lib/financials"
import { buildRankingFaq, type RankingSummary } from "@/lib/ranking-summary"
import { MARKET_BENCHMARK, buildMarketComparison, buildRankingLead } from "@/lib/market-benchmark"
import { FISCAL_YEAR, TARGET_GRAD_LABEL, TARGET_GRAD_YEAR_SHORT } from "@/lib/config"
import { NO_DATA, isBlankValue, formatWithUnit, formatYear, splitValueAndUnit } from "@/lib/format"
// 【バンドル削減】集計ロジックを含む lib/metric-rankings は import しない。
// ここで必要なのはパスとラベルだけなので、軽量な定義ファイルだけを読む。
import { METRIC_RANKING_LINKS } from "@/lib/metric-ranking-links"

type RankingType = "annual" | "monthly" | "base"

const rankingTypes: { id: RankingType; label: string; description: string }[] = [
  {
    id: "monthly",
    label: "初任給",
    description:
      "月々の給与額面（固定残業代や手当を含む）に基づくランキングです。毎月の生活に直結する金額で、手取りの目安を知りたい方向け。住宅手当などの固定手当を含む場合があります。",
  },
  {
    id: "annual",
    label: "想定年収",
    description:
      "賞与（ボーナス）や残業代まで含めた、新卒入社1年目の想定年収ランキングです。月額が同水準でも賞与で年収差が大きく開くため、初任給ランキングとは順位が入れ替わります。理論値のため実際の支給額とは異なる場合があります。",
  },
  { id: "base", label: "基本給", description: "各種手当を含まない、基本給の高さに基づいたランキングです。企業の安定性や給与体系の基礎を知る上での参考になります。" },
]

/**
 * リード文の中の数値（金額・％・社数）を強調表示に変換する。
 *
 * 【意図】競合の上位サイトはいずれも本文中の重要な数字を色や太字で立たせている。
 * 自動生成の文章をそのまま流すと数字が地の文に埋もれ、
 * データサイトとしての説得力が出ないため、描画時にハイライトする。
 *
 * dangerouslySetInnerHTML は使わず、Reactノードの配列を返す（XSS耐性）。
 */
const highlightNumbers = (text: string): React.ReactNode[] => {
  // 「262,300円」「+5.6%」「157社」「約1.4倍」などにマッチ
  const SPLIT = /([+＋]?[\d,]+(?:\.\d+)?(?:円|%|社|倍))/g
  // 【注意】判定用は g フラグを付けない。
  // g付き正規表現の .test() は lastIndex を保持するため、
  // 同じインスタンスを繰り返し使うと結果が交互にずれる。
  const IS_NUMBER = /^[+＋]?[\d,]+(?:\.\d+)?(?:円|%|社|倍)$/
  return text.split(SPLIT).map((part, i) =>
    IS_NUMBER.test(part) ? (
      <strong key={i} className="font-bold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

const calculateDescriptionPosition = (index: number, total: number) => {
  // 常に中央に配置するため、固定値50を返す。0に近いほど右、100に近いほど左に寄る。
  return 12.3;
}

interface CompanyCardProps {
  company: CompanyData;
  index: number;
  selectedRanking: RankingType;
}

const CompanyCard = ({
  company,
  index,
  selectedRanking,
}: CompanyCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = company.id ? isFavorite(company.id, "company") : false;

  // 財務指標。カードには onCard: true の3項目（売上高・営業利益率・一人当たり営業利益）だけを出す。
  // スプシに列が無い企業では空配列になり、下段の財務エリアごと非表示になる。
  const financials = buildCardFinancialMetrics(company);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!company.id) return;
    const added = toggleFavorite(company.id, "company");
    if (added) {
      showToast("お気に入りに保存しました", "success");
    } else {
      showToast("お気に入りから削除しました", "info");
    }
  };

  const descriptionPosition = calculateDescriptionPosition(index, 0)
  const salaryValue =
    selectedRanking === "annual"
      ? company.annualSalary
      : company.baseMonthly ?? company.monthlySalary ?? company.baseSalary

  const unit = selectedRanking === "annual" ? "年" : "月"

  const isNumberValue = typeof salaryValue === 'number' && Number.isFinite(salaryValue) && salaryValue > 0;
  // スプシの賃金セルが空欄のとき parseSalaryValue は null を返す。
  // 従来はそれをそのまま描画していたため、ラベルだけ残って値が消え、
  // salaryUrl がある企業では「中身が空のリンク」になっていた。
  const isSalaryBlank = isBlankValue(salaryValue);

  const SalaryDisplay = ({ isMobile = false }: { isMobile?: boolean }) => {
    // データ無しは "-" を控えめな色で置く。単位（/月・/年）も呼び出し側で抑止する。
    if (isSalaryBlank) {
      return (
        <span
          className={
            (isMobile ? "text-2xl" : "text-3xl") + " font-bold text-muted-foreground"
          }
        >
          {NO_DATA}
        </span>
      );
    }

    const valueComponent = (
      <span className={
        isNumberValue
          ? (isMobile ? "text-2xl" : "text-3xl") + " font-bold text-primary"
          : (isMobile ? "text-base" : "text-lg") + " font-semibold text-primary"
      }>
        {isNumberValue ? `¥${(salaryValue as number).toLocaleString()}` : salaryValue}
      </span>
    );

    if (company.salaryUrl && !isNumberValue) {
      return (
        <a href={company.salaryUrl.startsWith('http') ? company.salaryUrl : `https://www.google.com/search?q=${encodeURIComponent(company.company + " " + "採用情報")}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {valueComponent}
          <ExternalLink className="inline-block w-3 h-3 ml-1 text-muted-foreground" />
        </a>
      );
    }

    return valueComponent;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      {/* PC (lg以上) 用のレイアウト */}
      <div className="hidden lg:block">
        <CardContent className="px-6 pt-4 pb-2 flex flex-col">
          {/* --- 上段エリア --- */}
          <div className="flex flex-grow flex-col md:flex-row md:items-center md:justify-between gap-0">
            {/* 左側: 企業情報 */}
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl shrink-0">
                {company.rank || index + 1}
              </div>
              <CompanyLogo
                logo={company.logo}
                domain={company.domain}
                company={company.company}
                size={64}
                className="w-16 h-16 rounded-lg object-contain"
              />
              <div>
                <h3 className="text-xl font-bold text-foreground">{company.company}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {company.industry.split('/').map((industry: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{industry}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {/* 右側: 給与・従業員数・ボタン */}
            <div className="flex-shrink-0 flex flex-wrap justify-start md:justify-end items-center gap-x-1 gap-y-4">
              <div className="text-left md:text-right w-48">
                <p className="text-xs md:text-sm text-muted-foreground">{rankingTypes.find((r) => r.id === selectedRanking)?.label}</p>
                <div className="flex items-baseline justify-start md:justify-end">
                  <SalaryDisplay />
                  {isNumberValue && <span className="ml-0 text-sm font-normal text-muted-foreground">/{unit}</span>}
                </div>
              </div>
              {/* 従業員数・設立。ボタン列との間に余白を作るため pr-4 を入れる
                  （以前は gap-x-1 のみで「詳しく見る」と接触して窮屈だった） */}
              <div className="text-left md:text-right w-28 pr-4">
                <p className="text-sm text-muted-foreground">従業員数</p>
                {/* 【空欄の扱い】スプシが空だと従業員数は "?"、設立年は 0 になる。
                    そのまま出すと「?人」「設立: 0年」という誤情報に見えるため、
                    lib/format.ts で単位ごと "-" に置き換える。 */}
                <p className="text-base font-semibold text-foreground">{formatWithUnit(company.employees, "人")}</p>
                <p className="text-sm text-muted-foreground">設立: {formatYear(company.founded)}</p>
              </div>
              {/* 詳細ページへの導線: 塗りつぶしボタンを幅いっぱいに置き、★は下段に分離。
                  横並びで圧縮されていた従来より遷移が促進される。 */}
              <div className="w-32 flex flex-col gap-1.5">
                {company.id && (
                  <Button asChild size="default" className="w-full font-semibold">
                    <Link href={`/companies/${company.id}`}>
                      詳しく見る
                      <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFavoriteClick}
                  className={`bg-transparent w-full transition-colors ${
                    isFav
                      ? "text-primary border-primary dark:text-green-500 dark:border-green-500"
                      : "text-muted-foreground hover:text-primary hover:border-primary dark:hover:text-green-500 dark:hover:border-green-500"
                  }`}
                >
                  <Star className="h-3.5 w-3.5 mr-1" fill={isFav ? "currentColor" : "none"} />
                  <span className="text-xs">{isFav ? "保存済み" : "保存"}</span>
                </Button>
              </div>
            </div>
          </div>
          {/* --- 下段エリア: 業績データと説明文を横一列に並べる ---
              【重要】指標側を nowrap + 自然幅にしておくこと。
              以前は各指標に max-w-[13rem] を付けていたため3項目で約700pxを占有し、
              説明文が入りきらずに下の行へ折り返っていた。
              指標は内容ぴったりの幅（w-fit）にし、余った幅を説明文に渡す。
              pl-[88px] は「順位バッジ(w-16=64px) + gap-6(24px)」でロゴ左端と揃う位置。 */}
          {(financials.length > 0 || company.description) && (
            /* pr-[136px] は上段のボタン列の幅（w-32=128px）+ 余白8px。
               これにより説明文の右端が「詳しく見る／保存」ボタンの左端で揃い、
               ボタンの下に文字が潜り込んだような見え方にならない。 */
            <div className="mt-3 pt-3 border-t pl-[88px] pr-[136px] flex items-center justify-between gap-8">
              {/* 左: 業績データ。折り返さず自然幅に収める */}
              {financials.length > 0 && (
                <div className="flex items-start gap-x-7 shrink-0">
                  {financials.map((m) => (
                    <div key={m.key} className="whitespace-nowrap">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-sm font-semibold text-foreground">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 右: 説明文。残り幅に収まるよう flex-1 + min-w-0 で制御する */}
              {company.description && (
                <p className="flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed text-right">
                  {company.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </div>
      {/* スマホ・タブレット (lg未満) 用のレイアウト */}
      <div className="px-2 pt-0 pb-1 md:px-6 md:pt-6 md:pb-4 lg:hidden">
        <div className="pl-2">
          <div className="flex flex-col gap-4 py-2">
            {/* 上段：企業情報 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                {company.rank || index + 1}
              </div>
              <CompanyLogo
                logo={company.logo}
                domain={company.domain}
                company={company.company}
                size={40}
                className="w-10 h-10 rounded-lg object-contain"
              />
              {/* min-w-0 が無いと長い企業名がflexを押し広げてカードから溢れる。
                  text-balance は2行に折り返る際に行の長さを均等に分割し、
                  最終行に1〜2文字だけ残る不格好な折り返しを防ぐ。 */}
              <div className="ml-1 text-left min-w-0">
                <h3 className="text-base font-bold text-foreground leading-snug text-balance">{company.company}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {company.industry.split('/').map((industry: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[11px] px-1.5">{industry}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {/* 下段：詳細情報 */}
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 items-start pl-[52px]">
                <div>
                  <div className="text-sm text-muted-foreground">{rankingTypes.find((r) => r.id === selectedRanking)?.label}</div>
                  <div className="flex items-baseline">
                    <SalaryDisplay isMobile />
                  </div>
                </div>
                <div>
                  <div>
                    <div className="text-[13px] text-muted-foreground">従業員数</div>
                    {/* 単位「人」だけ小さい文字にしているため、単純な文字列連結ではなく
                        値と単位を分けて受け取る。空欄なら単位が "" になり "-" だけが出る。 */}
                    <div className="text-sm font-semibold text-foreground">
                      {(() => {
                        const { text, unit: u } = splitValueAndUnit(company.employees, "人")
                        return (
                          <>
                            {text}
                            {u && <span className="text-xs">{u}</span>}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="text-[13px] text-muted-foreground mt-0.5">設立: {formatYear(company.founded)}</div>
                </div>
              </div>
            </div>
          </div>
          {company.description && <p className="text-[15px] text-muted-foreground mt-1 leading-relaxed pl-[52px]">{company.description}</p>}

          {/* --- 財務指標エリア（モバイル）---
              狭い画面では2列固定。指標が増えても行が下に伸びるだけで横溢れしない。 */}
          {financials.length > 0 && (
            /* pl-[52px] は「順位バッジ(w-9=36px) + gap-4(16px)」。PC同様ロゴ左端に揃う。 */
            <div className="mt-3 pt-3 border-t pl-[52px] flex flex-wrap items-start gap-x-8 gap-y-2">
              {financials.map((m) => (
                <div key={m.key} className="min-w-0 max-w-[10rem]">
                  <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {company.id && (
          <div className="mt-4 flex flex-col gap-1.5">
            {/* 詳細ページへの導線を塗りつぶし＋幅いっぱいにし、★は下段に分離 */}
            <Button asChild size="sm" className="w-full font-semibold">
              <Link href={`/companies/${company.id}`}>
                詳しく見る
                <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFavoriteClick}
              className={`bg-transparent w-full transition-colors ${
                isFav
                  ? "text-primary border-primary dark:text-green-500 dark:border-green-500"
                  : "text-muted-foreground hover:text-primary hover:border-primary dark:hover:text-green-500 dark:hover:border-green-500"
              }`}
            >
              <Star className="h-3.5 w-3.5 mr-1" fill={isFav ? "currentColor" : "none"} />
              <span className="text-xs">{isFav ? "保存済み" : "保存"}</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export function RankingPageClient({
  initialData,
  initialError,
  industryList,
  summary,
  updatedLabel,
  rankingType,
}: {
  initialData: CompanyData[];
  initialError: string | null;
  industryList: string[];
  summary: RankingSummary | null;
  updatedLabel: string;
  /**
   * 【SEO・テーマ分散の解消】
   * 以前は1つのURLでタブ切り替えしていたため、検索エンジンから見て
   * 「初任給のページなのか年収のページなのか」が曖昧になっていた。
   * ランキング種別をURL（ルート）ごとに固定し、
   *   /ranking        … 初任給ランキング
   *   /ranking/annual … 想定年収ランキング
   * と独立させることで、それぞれが個別に検索評価を受けられるようにする。
   */
  rankingType: RankingType;
}) {
  const [searchTerm, setSearchTerm] = useState("")
  // 種別はURLで決まるため状態として持たない
  const selectedRanking = rankingType
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [isIndustryFilterOpen, setIsIndustryFilterOpen] = useState(false)
  const { data: companies, loading, error, refreshData } = useRankingData(selectedRanking, {
    // 種別はURLごとに固定（selectedRanking === rankingType が常に成立）なので、
    // SSRで埋め込んだ初期データをそのままSWRの初期値にする。
    // 以前の「monthlyのみfallback」はタブ切り替え時代の名残で、
    // /ranking/annual だけ毎回クライアントが全件を取り直す無駄が残っていた。
    fallbackData: initialData,
  })
  
  const sortedAndFilteredCompanies = useMemo(() => {
    return [...companies]
      .filter(
        (company) => {
          const matchesSearch = 
          company.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (company.description && company.description.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesIndustry = !selectedIndustry || company.industry.split('/').includes(selectedIndustry);
          return matchesSearch && matchesIndustry;
        }
      )
      .sort((a, b) => a.rank - b.rank)
  }, [companies, searchTerm, selectedIndustry]);

  /**
   * 【表示件数の制限】
   *
   * 以前は絞り込み結果を全件そのまま描画していた。1社あたりのカードは
   * PC用33要素＋モバイル用34要素の計67要素あり、157社では約10,500要素になる。
   * Lighthouseが「過大なDOM」と判定する閾値は1,400要素なので7倍以上の状態だった。
   *
   * さらに6枚ごとに広告を挟んでいるため、157社では26枚のAdBannerが同時に
   * マウントされ、1回の表示で26回 adsbygoogle.push() が走っていた。
   * 外部スクリプトの実行は静的なDOMより遥かに重く、速度への影響が大きい。
   *
   * 初期表示を50社に絞り、続きはボタンで読み込む方式にする。
   * ・初期DOM      約10,500要素 → 約3,350要素
   * ・初期の広告枠  26枚 → 8枚
   *
   * 【SEOへの影響】51位以降がHTMLから消えるが、
   * 全社への内部リンクは /companies（掲載企業一覧）が担っており、
   * 各社は sitemap にも個別に載っているためクロール経路は失われない。
   * また「初任給が高い企業ランキング」という検索意図は上位50社で満たせる。
   */
  const INITIAL_VISIBLE = 50
  const LOAD_MORE_STEP = 50
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  // 検索語・業界フィルタが変わったら表示件数を初期値に戻す。
  // これをしないと「絞り込んだのに前回の展開状態が残る」挙動になる。
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [searchTerm, selectedIndustry, selectedRanking])

  const displayedCompanies = useMemo(
    () => sortedAndFilteredCompanies.slice(0, visibleCount),
    [sortedAndFilteredCompanies, visibleCount],
  )
  const remainingCount = sortedAndFilteredCompanies.length - displayedCompanies.length

  // クロス条件ページへのリンク（該当数の多い順に上位12件）
  const listLinks = useMemo(() => buildAllListDefinitions(initialData).slice(0, 12), [initialData])

  // FAQ。サーバー側のFAQPage構造化データと同じ関数・同じ入力で生成するため内容が一致する
  const rankingFaq = useMemo(
    () => (summary ? buildRankingFaq(summary, FISCAL_YEAR) : []),
    [summary],
  )

  // 公的統計（厚労省）との比較文。掲載企業が高給側に偏っている事実を明示する
  const marketComparison = useMemo(
    () => (summary ? buildMarketComparison(summary.avgMonthly, summary.withMonthly) : null),
    [summary],
  )

  // 【SEO】記事型のリード文。検索上位の就活メディアはいずれも表の前に
  // 「相場 → このページのデータ → 高い企業の特徴 → 注意点」の導入を置いている。
  // 初任給ランキング（月額）でのみ表示し、年収ランキングでは文脈が変わるため出さない。
  const leadBlocks = useMemo(
    () =>
      summary && selectedRanking === "monthly"
        ? buildRankingLead({
            listedCount: summary.withMonthly,
            avgMonthly: summary.avgMonthly,
            medianMonthly: summary.medianMonthly,
            topCompany: summary.topCompany,
            topMonthly: summary.topMonthly,
            over30: summary.over30,
            over40: summary.over40,
            topIndustries: summary.industryAverages.slice(0, 3),
            fiscalYear: FISCAL_YEAR,
            gradLabel: TARGET_GRAD_LABEL,
          })
        : [],
    [summary, selectedRanking],
  )

  const currentError = initialError || error

  // 初期表示時にサーバーサイドでエラーが発生した場合
  if (initialError && initialData.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-12 text-center text-destructive">
                <h3 className="text-lg font-semibold text-foreground mb-2">データの取得に失敗しました</h3>
                <p className="text-muted-foreground mb-4">{initialError}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  ページを再読み込み
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-8 md:pb-12">
        {/* 【ヒーロー】タイトル領域に背景を敷いて本文と明確に切り分ける。
            以前は白地に文字が並ぶだけで、上位サイトと比べて視覚的な起点が無かった。
            全幅の淡いグラデーション＋下端の罫線で「ここまでが導入」と伝わるようにする。 */}
        <div className="bg-gradient-to-b from-primary/[0.07] via-primary/[0.03] to-transparent border-b border-border/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <div className="max-w-5xl mx-auto text-center">
              {/* データの鮮度と対象学年を最初に示すバッジ。
                  業界別ページと同じ意匠に揃え、サイト全体で一貫させる */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
                <TrendingUpIcon className="w-4 h-4 mr-2" />
                {FISCAL_YEAR}年最新データ・{TARGET_GRAD_LABEL}向け
              </div>

              {/* 【SEO】検索クエリは「初任給ランキング 2026」。
                  従来のH1は「初任給・年収ランキング」で年号が無く、
                  「初任給ランキング」も中黒で分断されていた。
                  クエリと同じ語順・表記をH1に含める。 */}
              {/* 【SEO】H1は「初任給が高い企業」という明確な検索意図に寄せる。
                  当サイトは高待遇企業に特化したデータセットなので、
                  一般的な「初任給ランキング」より競合が薄く、意図も一致する。 */}
              {selectedRanking === "annual" ? (
                <h1 className="text-3xl md:text-5xl font-bold text-balance mb-4 leading-tight text-primary">
                  新卒の想定年収が高い企業ランキング {FISCAL_YEAR}
                  <span className="block text-xl md:text-3xl mt-2 text-foreground">
                    賞与を含めた1年目の年収で{summary?.withMonthly ?? ""}社を比較
                  </span>
                </h1>
              ) : (
                <h1 className="text-3xl md:text-5xl font-bold text-balance mb-4 leading-tight text-primary">
                  初任給ランキング {FISCAL_YEAR}
                  {/* 【年号】実測で年号付きクエリは10位前後、年号なしは45位。
                      就活生は自分の卒業年度で検索するため、西暦も併記して
                      「初任給ランキング 2027」のようなクエリを直接狙う。 */}
                  <span className="block text-xl md:text-3xl mt-2 text-foreground">
                    {TARGET_GRAD_YEAR_SHORT}向け・月30万円超の高待遇企業を
                    {summary?.withMonthly ?? ""}社掲載
                  </span>
                </h1>
              )}
              {/* 【行数】以前は無条件の <br /> で2文を分けたうえに
                  text-wrap: balance が両方の塊を均等割りしていたため、
                  スマホで4行になり折り返しが多すぎた。
                  <br /> をPC専用にし、スマホでは端まで詰めて3行に収める。
                  文言も「手取り額」→「手取り」等でわずかに短縮している。 */}
              <p className="jp-lead text-[17px] md:text-xl text-muted-foreground leading-[1.85] max-w-3xl mx-auto">
                {TARGET_GRAD_LABEL}向けに、初任給の高い企業を厳選して掲載。
                <br className="hidden md:inline" />
                手取りや入社後の年収の伸びまで確認できます。
              </p>

              {/* 【E-E-A-T】更新日・出典・掲載社数を横並びで明示する。
                  上位サイト（GBase等）はいずれもタイトル直下にこの帯を置いており、
                  「誰がいつ何を根拠に作ったか」が一目で伝わる。
                  YMYL領域では信頼性の提示が検索評価にも直結する。 */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs md:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  最終更新: {updatedLabel}
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span>出典: 各社採用情報・有価証券報告書</span>
                <span className="hidden sm:inline text-border">|</span>
                <span>掲載 {summary?.withMonthly ?? "—"} 社</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- ここから本文 --- */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10">
          <div className="max-w-5xl mx-auto">

            {/* 【SEO・最重要】記事型のリード文。
                データの表だけのページは「文章量が少ない」と判定され順位が伸びない。
                検索上位の就活メディアと同じく、表の前に
                「相場 → このページのデータ → 高い企業の特徴 → 注意点」を置く。
                全てスプシの集計値から自動生成しているため、企業が増減しても数字が追従する。

                【デザイン】以前はタイトル直下に段落をベタ書きしていて壁のように見えた。
                見出し付きのカードに入れ、最初の段落だけ大きくし、
                本文中の数値をハイライトすることで読み進められる形にしている。 */}
            {/* 【見出しなし】タイトル直下の文章は読者にとって自明に導入なので、
                「このページの要点」のようなラベルは置かない。
                記事型の競合（日本人材ニュース・WhiteCareer）も同様にリードは無題。
                h2 を消費せず、下部の解説セクションの見出しと競合しない利点もある。
                左のアクセント罫だけで導入部であることを視覚的に示す。 */}
            {/* 【可読性】スマホでの読みやすさを優先し、本文を17px・行間2.1に設定。
                text-[17px] のような任意値は globals.css のスマホ用底上げ（text-base等）の
                対象外になるため、ここで直接指定している。
                段落間の余白（space-y-5）も広めに取り、文章の塊が見分けやすいようにする。 */}
            {/* 【囲みを外した理由】枠線・背景・左のアクセント罫で囲むと、
                ページ冒頭に「装飾された箱」が並ぶ見た目になり、
                機械が組み立てた画面という印象が強くなっていた。
                リード文は記事の導入なので、背景そのままに文章として置く。
                読み手には普通の記事の書き出しに見えるほうが自然。 */}
            {leadBlocks.length > 0 && (
              <section className="mb-8">
                <div className="space-y-6 text-left">
                  {leadBlocks.map((block, i) => (
                    <div key={i}>
                      {/* 小見出しに結論を書き、本文は補足に徹する。
                          文章だけを並べると長さに圧倒されて読まれないため、
                          読み飛ばしても要点が拾える構成にしている。 */}
                      {/* jp-heading: スマホでは端まで詰めて折り返す。
                          h2の既定（text-wrap: balance）のままだと1行の文字数が
                          削られ、鉤括弧の途中で割れて読みにくくなる。 */}
                      <h2 className="jp-heading text-[17px] md:text-lg font-bold text-foreground mb-2 leading-snug">
                        {highlightNumbers(block.heading)}
                      </h2>
                      <p className="text-[16px] md:text-base leading-[2.05] text-muted-foreground">
                        {highlightNumbers(block.body)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 【SEO】集計サマリー: 結論の1文は常時表示、業種別表は折りたたみ
                （details内のコンテンツも初期HTMLに含まれクローラーに読まれる） */}
            {summary && summary.avgMonthly !== null && (
              <div className="mb-6 rounded-xl border bg-card p-4 md:p-5">
                {/* 主要指標をカード化して一目で掴めるようにする。
                    文章だけだと数字が埋もれ、データサイトとしての説得力が出ない。 */}
                {/* 【スマホでの見え方】数字が18pxだとカードの余白ばかり目立っていた。
                    22pxまで上げ、ラベルとの間隔を詰めて数字を主役にする。
                    ¥368,230 のような8文字でも2列グリッドに収まる大きさ。 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-4">
                  <div className="rounded-lg bg-muted/50 px-2 py-3 text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">平均初任給</div>
                    <div className="text-[22px] md:text-2xl font-bold text-primary tabular leading-tight">
                      ¥{summary.avgMonthly.toLocaleString()}
                    </div>
                  </div>
                  {summary.medianMonthly !== null && (
                    <div className="rounded-lg bg-muted/50 px-2 py-3 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">中央値</div>
                      <div className="text-[22px] md:text-2xl font-bold text-foreground tabular leading-tight">
                        ¥{summary.medianMonthly.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/50 px-2 py-3 text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">掲載企業数</div>
                    <div className="text-[22px] md:text-2xl font-bold text-foreground tabular leading-tight">
                      {summary.withMonthly}
                      <span className="text-sm font-normal text-muted-foreground">社</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-3 text-center">
                    <div className="text-xs text-muted-foreground mb-0.5">40万円以上</div>
                    <div className="text-[22px] md:text-2xl font-bold text-foreground tabular leading-tight">
                      {summary.over40}
                      <span className="text-sm font-normal text-muted-foreground">社</span>
                    </div>
                  </div>
                </div>

                {/* 【SEO・AI検索】数値だけでなく文章でも自己完結させる（引用されやすくするため） */}
                <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                  【{FISCAL_YEAR}年度】掲載{summary.withMonthly}社の平均初任給は月額{summary.avgMonthly.toLocaleString()}円
                  {summary.medianMonthly !== null && <>（中央値{summary.medianMonthly.toLocaleString()}円）</>}。
                  {summary.topCompany && summary.topMonthly !== null && (
                    <>最高は{summary.topCompany}の{summary.topMonthly.toLocaleString()}円。</>
                  )}
                  35万円以上{summary.over35}社・30万円以上{summary.over30}社。
                </p>
                {summary.industryAverages.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[15px] font-semibold text-primary hover:underline">
                      業種別の平均初任給・調査概要を見る
                    </summary>
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-sm">
                        <caption className="sr-only">業種別平均初任給（{FISCAL_YEAR}年度・当サイト調べ）</caption>
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th scope="col" className="py-2 pr-4 text-left font-medium">業界</th>
                            <th scope="col" className="py-2 pr-4 text-right font-medium">掲載社数</th>
                            <th scope="col" className="py-2 text-right font-medium">平均初任給（月額）</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.industryAverages.slice(0, 10).map((row) => (
                            <tr key={row.industry} className="border-b last:border-b-0">
                              <th scope="row" className="py-2 pr-4 text-left font-normal">
                                <Link href={`/industries/${encodeURIComponent(row.industry)}`} className="text-primary hover:underline">
                                  {row.industry}
                                </Link>
                              </th>
                              <td className="py-2 pr-4 text-right">{row.count}社</td>
                              <td className="py-2 text-right font-semibold">¥{row.avgMonthly.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      出典: 各社の新卒採用情報をもとに当サイト編集部が集計（{FISCAL_YEAR}年度・掲載3社以上の業界のみ表示）。
                      金額は固定残業代や諸手当を含む場合があります。初任給は多くの企業で前年同水準か引き上げ傾向のため、{TARGET_GRAD_LABEL}の企業選びの目安としてご活用ください。
                      最終更新: {updatedLabel}（データは自動更新）
                    </p>
                  </details>
                )}
              </div>
            )}

            {/* 検索・絞り込み（コンパクト化: ランキング1位がファーストビューに入るように） */}
            <Card className="mb-6">
              <CardContent className="pt-4 md:pt-5">
                <div className="flex flex-col gap-3">
                  {/* 【意図】以前は小さなボタンが並ぶだけで「切り替えられる」ことに気づかれず、
                      初期表示の初任給しか見られていなかった。
                      枠で囲ったセグメント型トグルにし、見出しを添えて切り替えを明示する。 */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">
                      ランキングの種類を切り替え
                      <span className="ml-2 font-normal text-muted-foreground">
                        （2種類を比べると企業選びの精度が上がります）
                      </span>
                    </p>
                    {/* 【SEO】状態切り替えではなく実際のページ遷移にする。
                        別URLの独立ページなので、検索エンジンにそれぞれ別テーマとして
                        認識され、内部リンクとしても機能する。 */}
                    <div
                      aria-label="ランキングの種類"
                      className="inline-flex w-full sm:w-auto rounded-xl border-2 border-primary/25 bg-muted/50 p-1.5 gap-1.5"
                    >
                      {rankingTypes
                        .filter((type) => type.id !== "base")
                        .map((type) => {
                          const isSelected = selectedRanking === type.id
                          const href = type.id === "annual" ? "/ranking/annual" : "/ranking"
                          const cls = `flex-1 sm:flex-none sm:px-12 px-4 py-3 rounded-lg text-base md:text-lg font-bold transition-all text-center ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-primary hover:bg-background"
                          }`
                          // 選択中の項目はリンクにしない（自ページへの無意味なリンクを作らない）
                          return isSelected ? (
                            <span key={type.id} aria-current="page" className={cls}>
                              {type.label}
                            </span>
                          ) : (
                            <Link key={type.id} href={href} className={cls}>
                              {type.label}
                            </Link>
                          )
                        })}
                    </div>
                  </div>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {rankingTypes.find((type) => type.id === selectedRanking)?.description}
                  </p>

                  {/* 【導線】もう一方のランキングへのテキストリンク */}
                  {selectedRanking === "monthly" ? (
                    <Link
                      href="/ranking/annual"
                      className="self-start text-[15px] font-semibold text-primary hover:underline text-left"
                    >
                      賞与を含めた「想定年収ランキング」も見る →
                    </Link>
                  ) : (
                    <Link
                      href="/ranking"
                      className="self-start text-[15px] font-semibold text-primary hover:underline text-left"
                    >
                      毎月の手取りに直結する「初任給ランキング」も見る →
                    </Link>
                  )}

                  {/* 【導線】給与額以外の切り口で並べたランキングへ。
                      初任給と平均年収の順位はほとんど連動しないため、
                      「額面の順位」だけ見て離脱する読者をここで拾いたい。
                      小さなピルだと押せると気づかれにくいので高さ56pxのボタンにする。 */}
                  <div className="border-t pt-4">
                    <p className="text-[15px] font-semibold text-foreground mb-1">
                      金額以外の切り口で並べる
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      初任給の順位と、入社後の年収の順位はほとんど一致しません。
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {METRIC_RANKING_LINKS.map((link) => (
                        <Link
                          key={link.slug}
                          href={link.path}
                          className="group flex h-14 items-center justify-between gap-1 rounded-xl border-2 bg-card px-4 text-[15px] font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          {link.shortLabel}
                          <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="企業名、業界などで検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 h-12 text-base placeholder:text-sm"
                    />
                  </div>
                  {industryList.length > 0 && (
                    <div className="border-t border-border pt-4 space-y-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setIsIndustryFilterOpen(prev => !prev)}
                        className="w-full md:w-auto font-semibold text-base"
                      >
                        業界で絞り込む
                        <ChevronDown className={`ml-2 h-5 w-5 transition-transform ${isIndustryFilterOpen ? 'rotate-180' : ''}`} />
                      </Button>
                      {isIndustryFilterOpen && (
                        <div className="flex flex-wrap gap-2">
                          {industryList.map((industry) => (
                            <Button
                              key={industry}
                              variant={selectedIndustry === industry ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedIndustry(prev => prev === industry ? null : industry)}
                            >
                              {industry}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {loading && companies.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">データを読み込み中...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedCompanies.map((company, index) => (
                  <React.Fragment key={`${selectedRanking}-${company.company}-${index}`}>
                    <CompanyCard
                      company={company}
                      index={index}
                      selectedRanking={selectedRanking}
                    />
                    {/* 【広告の間隔】6枚ごと（157社で26枚）→ 12枚ごと と絞りすぎたため
                        収益が落ちた。8枚ごとに戻す。
                        初期表示は50社なので広告は6枚。全件展開しても20枚で、
                        26枚だった頃より軽い。「もっと見る」で追加された分にも
                        同じ間隔で入るので、読み進めた読者ほど広告に触れる。 */}
                    {(index + 1) % 8 === 0 && <AdBanner />}
                  </React.Fragment>
                ))}

                {/* 【もっと見る】初期表示を50社に絞ってDOMと広告リクエストを削減する。
                    ボタンを押すと50社ずつ追加される。 */}
                {remainingCount > 0 && (
                  <div className="pt-6 text-center">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-transparent px-8 font-semibold"
                      onClick={() => setVisibleCount((n) => n + LOAD_MORE_STEP)}
                    >
                      さらに{Math.min(remainingCount, LOAD_MORE_STEP)}社を表示
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {displayedCompanies.length}社 / 全{sortedAndFilteredCompanies.length}社を表示中
                    </p>
                  </div>
                )}

                {/* 全件表示しきったときは、次の行き先を示して離脱を防ぐ */}
                {remainingCount === 0 && sortedAndFilteredCompanies.length > INITIAL_VISIBLE && (
                  <div className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      全{sortedAndFilteredCompanies.length}社を表示しました。
                      <Link href="/companies" className="ml-1 underline hover:text-foreground transition-colors">
                        企業名から探す
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 【SEO】クロス条件一覧への内部リンク（リスト下・クロール導線 + 回遊性向上） */}
            {listLinks.length > 0 && !loading && (
              <div className="mt-10 border-t pt-6">
                <p className="text-sm font-semibold text-muted-foreground mb-2">条件から探す</p>
                <div className="flex flex-wrap gap-2">
                  {listLinks.map((def) => (
                    <Button key={def.slug} asChild variant="outline" size="sm" className="bg-transparent">
                      <Link href={`/lists/${encodeURIComponent(def.slug)}`}>{def.shortName}</Link>
                    </Button>
                  ))}
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/lists">すべての条件 →</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* 【SEO・最重要】解説テキストコンテンツ。
                データの一覧（ツール）だけではクローラーに「文章量の少ないページ」と
                判定されるため、検索意図に答える解説を厚く置く。
                見出し（h2/h3）で構造化し、読者の疑問に順番に答える構成にしている。 */}
            {!loading && companies.length > 0 && (
              <section className="mt-12 border-t pt-8 text-left space-y-8">

                {/* ① 企業規模による格差。
                    冒頭のリード文では「全国平均」と「当サイト平均」の対比を扱っているため、
                    ここでは重複を避けて「規模による差」という別の切り口に踏み込む。 */}
                <div className="space-y-3">
                  <h2 className="text-xl md:text-2xl font-bold text-primary">
                    同じ大卒でも、企業規模で初任給は3万円変わる
                  </h2>
                  <div className="space-y-3 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                    <p>
                      初任給は「大卒だからいくら」と一律に決まるものではありません。
                      {MARKET_BENCHMARK.surveyName}を企業規模別に見ると、従業員1,000人以上では
                      <strong className="text-foreground">{MARKET_BENCHMARK.largeCompany.toLocaleString()}円</strong>、
                      10〜99人では
                      <strong className="text-foreground">{MARKET_BENCHMARK.smallCompany.toLocaleString()}円</strong>で、
                      その差は月額
                      <strong className="text-foreground">
                        {(MARKET_BENCHMARK.largeCompany - MARKET_BENCHMARK.smallCompany).toLocaleString()}円
                      </strong>
                      です。年間では約
                      {Math.round(((MARKET_BENCHMARK.largeCompany - MARKET_BENCHMARK.smallCompany) * 12) / 10000)}
                      万円の開きになります。
                    </p>
                    <p>
                      ただし規模が大きいほど得とは限りません。大企業は給与テーブルが整備されているぶん
                      初任給は安定していますが、同期入社の人数が多く、若手のうちは横並びになりやすい構造です。
                      一方で中小・ベンチャーは初任給の幅が大きく、下は全国平均を下回る企業から、
                      上は当ランキング上位のように月40万円を超える企業まで分かれます。
                      <strong className="text-foreground">規模で決まるのではなく、その企業がどれだけ利益を上げているかで決まる</strong>
                      と考えるほうが実態に近いといえます。
                    </p>
                    <p>
                      なお学歴による差もあります。多くの企業で修士了（院卒）は学部卒より月2〜4万円高く設定されており、
                      理系職を中心に初任給の起点そのものが変わります。募集要項では学部卒の金額だけが
                      大きく表示されていることもあるため、自分に当てはまる区分の金額を確認してください。
                    </p>
                  </div>
                </div>

                {/* ② 引き上げが続く背景 */}
                <div className="space-y-3">
                  <h2 className="text-xl md:text-2xl font-bold text-primary">
                    なぜ今、初任給の引き上げが相次いでいるのか
                  </h2>
                  <div className="space-y-3 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                    <p>
                      大学卒の平均初任給は{MARKET_BENCHMARK.yearLabel}に前年比+{MARKET_BENCHMARK.universityGraduateYoY}%と大きく伸び、
                      初めて26万円台に到達しました。背景には主に3つの要因があります。
                    </p>
                    <p>
                      <strong className="text-foreground">1つ目は人手不足です。</strong>
                      少子化により新卒の母数そのものが減り続けており、採用競争が激化しています。
                      初任給は求職者が最初に目にする条件のため、他社より見劣りすると応募数に直結します。
                    </p>
                    <p>
                      <strong className="text-foreground">2つ目は物価上昇です。</strong>
                      生活コストが上がるなかで従来の水準を維持すると、実質的な待遇引き下げになってしまいます。
                    </p>
                    <p>
                      <strong className="text-foreground">3つ目は初任給の「発信効果」です。</strong>
                      初任給の引き上げは報道されやすく、採用広報として費用対効果が高いという側面があります。
                      一方で、初任給だけを引き上げて中堅層の給与が据え置かれるケースもあるため、
                      入社後の伸びまで確認することが重要です。
                    </p>
                  </div>
                </div>

                {/* ③ 業界別の傾向。実データから生成 */}
                {summary && summary.industryAverages.length >= 3 && (
                  <div className="space-y-3">
                    {/* 【独自コンテンツ】冒頭では「どの業界が高いか」を扱っているため、
                        ここでは「初任給の高さと生涯賃金は一致しない」という、
                        有報データを持つ当サイトだけが書ける踏み込んだ話にする。 */}
                    <h2 className="text-xl md:text-2xl font-bold text-primary">
                      初任給が高い＝生涯賃金が高い、ではない
                    </h2>
                    <div className="space-y-3 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      <p>
                        当サイトでは有価証券報告書をもとに、掲載企業の
                        <strong className="text-foreground">全社員の平均年収</strong>もあわせて収録しています。
                        そこで初任給と平均年収の関係を集計したところ、
                        両者の順位にはほとんど相関がありませんでした。
                        <strong className="text-foreground">初任給が高い企業ほど生涯賃金も高い、とは言えない</strong>のが実態です。
                      </p>
                      <p>
                        分かれ目は「入社後の伸び方」です。初任給ベースの年収から全社員の平均年収までの倍率を見ると、
                        掲載企業の中央値はおよそ<strong className="text-foreground">2.2倍</strong>。
                        しかし企業ごとの差は大きく、初任給を抑えるかわりに入社後6倍以上まで伸びる企業がある一方、
                        初任給の時点で既に高く、平均年収との差が1.2倍程度にとどまる企業もあります。
                      </p>
                      <p>
                        前者は年功や成果に応じて段階的に上げていく設計、後者は最初から高い水準を提示して
                        人材を集める設計です。どちらが良いかは、
                        <strong className="text-foreground">若いうちに稼ぎたいのか、長く働いて積み上げたいのか</strong>
                        という自分の優先順位によって変わります。
                        各企業の詳細ページでは、この伸び倍率と掲載企業内での順位を掲載しているので、
                        気になる企業がどちらのタイプかを確認できます。
                      </p>
                    </div>
                  </div>
                )}

                {/* ④ 注意点。ここが最も検索意図に応える部分 */}
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-bold text-primary">
                    求人票の初任給を正しく読み解く3つのポイント
                  </h2>
                  <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                    同じ「月30万円」でも、内訳次第で実際に手元に入る額も働き方も変わります。
                    企業ごとの求人票を見るときに確認すべき箇所を、具体例で説明します。
                  </p>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      ① 固定残業代を除いた「基本給」はいくらか
                    </h3>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      月給30万円のうち5万円が「40時間分の固定残業代」だとすると、基本給は25万円です。
                      このとき時給換算は、残業なしの企業（月160時間）が1,875円なのに対し、
                      40時間残業して30万円の企業は<strong className="text-foreground">1,500円</strong>となり、2割ほど低くなります。
                      さらに基本給は賞与や退職金の算定基礎になることが多いため、
                      <strong className="text-foreground">基本給が低いと年収ベースでは差がさらに開きます</strong>。
                      求人票では「固定残業代◯時間分を含む」の記載と、その時間数を必ず確認してください。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      ② 自分にも支給される手当かどうか
                    </h3>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      住宅手当や地域手当を含めた金額を初任給として提示している企業もあります。
                      たとえば家賃補助が月10万円含まれている場合、実家から通う人には支給されず、
                      提示額から10万円下がることになります。
                      東京勤務を前提とした地域手当も、配属先によっては対象外です。
                      <strong className="text-foreground">「全員が受け取れる金額」と「条件付きの金額」を分けて考える</strong>
                      ことが重要です。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      ③ 額面ではなく手取りで生活を想像できているか
                    </h3>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      額面から社会保険料と所得税が引かれるため、手取りはおおむね額面の8割前後になります。
                      月30万円なら手取りは24万円台が目安です。
                      さらに<strong className="text-foreground">2年目からは住民税が加わる</strong>点に注意が必要です。
                      1年目は前年の所得がないため住民税がかかりませんが、2年目に月1〜2万円ほど引かれ、
                      額面が変わらなくても手取りが減ったように感じます。
                      当サイトの
                      <Link href="/simulator" className="text-primary hover:underline mx-1">手取り計算シミュレーター</Link>
                      では、1年目と2年目以降の両方を確認できます。
                    </p>
                  </div>
                </div>

                {/* ⑤ 実務的な使い方と内部リンク */}
                <div className="space-y-3">
                  <h2 className="text-xl md:text-2xl font-bold text-primary">
                    新卒の企業選びでランキングを活用するには
                  </h2>
                  <div className="space-y-3 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                    <p>
                      月額の初任給だけを見ていると、<strong className="text-foreground">賞与の差を見落とします</strong>。
                      同じ初任給30万円でも、年間賞与が4か月分の企業と2か月分の企業では、
                      年収にして60万円の開きが出ます。月額の順位と年収の順位が入れ替わるのはこのためです。
                      <Link href="/ranking/annual" className="text-primary hover:underline font-semibold mx-1">
                        想定年収ランキング
                      </Link>
                      と見比べて、両方で上位に入る企業を探すのが効率的です。
                    </p>
                    <p>
                      次に、志望業界の中での位置を確認します。全体で20位でも、
                      その業界の中では1位ということがあります。逆に全体で上位でも、
                      その業界では平均的という場合もあります。
                      応募先を絞る段階では全体順位より
                      <Link href="/industries" className="text-primary hover:underline mx-1">業界内での順位</Link>
                      のほうが判断材料になります。
                    </p>
                    <p>
                      最後に、気になる企業が数社に絞れたら詳細ページで
                      収益性と平均年収まで確認してください。
                      面接で給与について聞かれた際も、
                      業績の裏付けを持って話せると志望度の高さが伝わります。
                      企業研究の進め方は
                      <Link href="/articles" className="text-primary hover:underline mx-1">就活記事</Link>
                      でも解説しています。
                    </p>
                  </div>
                </div>

                {/* 【母集団の明示】カード内に平均年収を出しているため、
                    その数値がどの範囲の企業のものかをこのページでも明記する。
                    有報の提出義務は原則上場企業にあり、書かないと
                    日本企業全体の相場だと誤解される。 */}
                <p className="mt-6 pt-4 border-t text-xs text-muted-foreground leading-relaxed">
                  ※{LISTED_COMPANY_NOTE}
                </p>
              </section>
            )}

            {/* 【SEO】よくある質問。FAQPage構造化データ（app/ranking/page.tsx）と
                完全に同一の内容にすること。lib/ranking-summary.ts の同じ関数から
                同じ入力で生成しているため自動的に一致する。 */}
            {!loading && rankingFaq.length > 0 && (
              <section className="mt-10 border-t pt-6 text-left space-y-4">
                <h2 className="text-lg md:text-xl font-bold text-primary">
                  初任給ランキングに関するよくある質問
                </h2>
                <dl className="space-y-5">
                  {rankingFaq.map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <dt className="font-bold text-[15px] md:text-base">Q. {item.question}</dt>
                      <dd className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
                        A. {item.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {sortedAndFilteredCompanies.length === 0 && !loading && (
              <Card className="mt-8">
                {currentError ? (
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">データの取得に失敗しました</h3>
                    <p className="text-muted-foreground mb-4">{currentError}</p>
                    <Button onClick={() => refreshData()} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      再試行
                    </Button>
                  </CardContent>
                ) : (
                  <CardContent className="p-12 text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">検索結果が見つかりません</h3>
                    <p className="text-muted-foreground">検索条件を変更して再度お試しください。</p>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
