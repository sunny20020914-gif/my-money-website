"use client"

import React, { useState, useMemo, CSSProperties } from "react"
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
import { buildCardFinancialMetrics } from "@/lib/financials"
import { buildRankingFaq, type RankingSummary } from "@/lib/ranking-summary"
import { MARKET_BENCHMARK, buildMarketComparison } from "@/lib/market-benchmark"
import { FISCAL_YEAR, TARGET_GRAD_LABEL } from "@/lib/config"

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

  const isNumberValue = typeof salaryValue === 'number';

  const SalaryDisplay = ({ isMobile = false }: { isMobile?: boolean }) => {
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
              <div className="text-left md:text-right w-28">
                <p className="text-sm text-muted-foreground">従業員数</p>
                <p className="text-base font-semibold text-foreground">{typeof company.employees === 'number' ? `${company.employees.toLocaleString()}人` : `${company.employees}人`}</p>
                <p className="text-sm text-muted-foreground">設立: {company.founded}年</p>
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
          {/* --- 財務指標エリア（PC）---
              指標は lib/financials.ts が返す配列をそのまま流し込む。
              項目が3個→4個…と増えてもグリッドが自動で並べるためレイアウトは崩れない。
              データが1つも無い企業では、この行ごと描画されない。

              【配置順の注意】直後の説明文は position:absolute で高さを持たないため、
              財務行を説明文より後ろに置くと説明文のテキストと重なる。必ず説明文より前に置くこと。 */}
          {/* --- 下段エリア: 業績データと説明文を横一列に並べる ---
              以前は業績データと説明文が別々の行にあり、説明文は absolute 配置で
              高さを持たないため余白が読みにくかった。
              両者の開始位置がほぼ揃っていたので1行にまとめ、カードの縦幅も詰めている。
              pl-[88px] は「順位バッジ(w-16=64px) + gap-6(24px)」でロゴ左端と揃う位置。 */}
          {(financials.length > 0 || company.description) && (
            <div className="mt-3 pt-3 border-t pl-[88px] flex items-start justify-between gap-6">
              {/* 左: 業績データ（指標が増えたら折り返す） */}
              {financials.length > 0 && (
                <div className="flex flex-wrap items-start gap-x-8 gap-y-2 shrink-0">
                  {financials.map((m) => (
                    <div key={m.key} className="min-w-0 max-w-[13rem]">
                      <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 右: 説明文。残り幅に収まるよう flex-1 + min-w-0 で制御する */}
              {company.description && (
                <p className="flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed text-right self-center">
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
                    <div className="text-sm font-semibold text-foreground">{company.employees.toLocaleString()}<span className="text-xs">人</span></div>
                  </div>
                  <div className="text-[13px] text-muted-foreground mt-0.5">設立: {company.founded}年</div>
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
    fallbackData: selectedRanking === 'monthly' ? initialData : undefined,
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

  const displayedCompanies = sortedAndFilteredCompanies;

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
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 text-center">
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
                  初任給が高い企業ランキング {FISCAL_YEAR}
                  <span className="block text-xl md:text-3xl mt-2 text-foreground">
                    月30万円超の高待遇企業を{summary?.withMonthly ?? ""}社掲載
                  </span>
                </h1>
              )}
              <p className="text-[17px] md:text-xl text-muted-foreground text-balance leading-relaxed max-w-3xl mx-auto">
                {TARGET_GRAD_LABEL}向けに、初任給の高い企業を厳選して掲載。<br className="hidden md:inline" />
                手取り額や入社後の年収の伸びまで確認できます。
              </p>
            </div>

            {/* 【SEO】集計サマリー: 結論の1文は常時表示、業種別表は折りたたみ
                （details内のコンテンツも初期HTMLに含まれクローラーに読まれる） */}
            {summary && summary.avgMonthly !== null && (
              <div className="mb-6 rounded-xl border bg-card p-4 md:p-5">
                {/* 主要指標をカード化して一目で掴めるようにする。
                    文章だけだと数字が埋もれ、データサイトとしての説得力が出ない。 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">平均初任給</div>
                    <div className="text-lg md:text-2xl font-bold text-primary tabular">
                      ¥{summary.avgMonthly.toLocaleString()}
                    </div>
                  </div>
                  {summary.medianMonthly !== null && (
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">中央値</div>
                      <div className="text-lg md:text-2xl font-bold text-foreground tabular">
                        ¥{summary.medianMonthly.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">掲載企業数</div>
                    <div className="text-lg md:text-2xl font-bold text-foreground tabular">
                      {summary.withMonthly}
                      <span className="text-sm font-normal text-muted-foreground">社</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">40万円以上</div>
                    <div className="text-lg md:text-2xl font-bold text-foreground tabular">
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
                    {(index + 1) % 6 === 0 && <AdBanner />}
                  </React.Fragment>
                ))}
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

                {/* ① 世間相場との比較。当サイトの母集団の偏りを正直に説明する */}
                {marketComparison && (
                  <div className="space-y-3">
                    <h2 className="text-xl md:text-2xl font-bold text-primary">
                      {FISCAL_YEAR}年の初任給の相場はいくら？
                    </h2>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      {marketComparison}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground mb-1">大学卒の全国平均</p>
                        <p className="text-lg md:text-xl font-bold text-foreground tabular">
                          ¥{MARKET_BENCHMARK.universityGraduate.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          前年比 +{MARKET_BENCHMARK.universityGraduateYoY}%
                        </p>
                      </div>
                      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                        <p className="text-xs text-muted-foreground mb-1">当サイト掲載企業の平均</p>
                        <p className="text-lg md:text-xl font-bold text-primary tabular">
                          ¥{summary?.avgMonthly?.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          高待遇企業を中心に{summary?.withMonthly}社を収録
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                    <h2 className="text-xl md:text-2xl font-bold text-primary">
                      初任給が高い業界とその理由
                    </h2>
                    <div className="space-y-3 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      <p>
                        当サイトのデータでは、平均初任給が高いのは
                        {summary.industryAverages.slice(0, 3).map((r, i) => (
                          <span key={r.industry}>
                            {i > 0 && "、"}
                            <Link
                              href={`/industries/${encodeURIComponent(r.industry)}`}
                              className="text-primary hover:underline font-semibold"
                            >
                              {r.industry}
                            </Link>
                            （月額{r.avgMonthly.toLocaleString()}円）
                          </span>
                        ))}
                        の順です。
                      </p>
                      <p>
                        これらの業界に共通するのは<strong className="text-foreground">「一人あたりが生み出す利益が大きい」</strong>という点です。
                        コンサルティングや不動産、外資系IT、金融などは、設備よりも人の働きが直接収益を生む構造のため、
                        優秀な人材の確保が業績に直結します。結果として給与水準が高くなります。
                      </p>
                      <p>
                        逆に、従業員数が多い大企業ほど初任給は横並びになりやすい傾向があります。
                        全社員の給与体系との整合が必要で、新卒だけを大幅に優遇しにくいためです。
                        業界ごとの水準は
                        <Link href="/industries" className="text-primary hover:underline mx-1">業界別ランキング</Link>
                        で比較できます。
                      </p>
                    </div>
                  </div>
                )}

                {/* ④ 注意点。ここが最も検索意図に応える部分 */}
                <div className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-bold text-primary">
                    初任給ランキングを見るときの3つの注意点
                  </h2>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      ① 固定残業代（みなし残業）が含まれていないか
                    </h3>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      提示額に固定残業代が含まれているかどうかで、実質的な条件は大きく変わります。
                      たとえば月給30万円でも、うち5万円が「40時間分の固定残業代」であれば、
                      基本給は25万円で、40時間働いて初めて30万円になる計算です。
                      同じ金額でも残業代込みかどうかで時給換算は大きく異なるため、
                      各社の求人票で内訳を必ず確認してください。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      ② 住宅手当など固定手当が上乗せされていないか
                    </h3>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      住宅手当や地域手当を含めた金額を初任給として提示している企業もあります。
                      これらは実家暮らしでは支給されない、転勤で変動するなど条件付きの場合があり、
                      全員が受け取れるとは限りません。
                      また手当の多くは賞与の算定基礎に含まれないため、
                      基本給が低いと年収ベースでは差が開くことがあります。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      ③ 入社後の昇給率まで見えているか
                    </h3>
                    <p className="text-[15px] md:text-base leading-relaxed text-muted-foreground">
                      初任給が高くても、その後の伸びが緩やかであれば生涯賃金では逆転されることがあります。
                      当サイトでは有価証券報告書をもとに全社員の平均年収を掲載しており、
                      各企業の詳細ページで<strong className="text-foreground">初任給から平均年収までの伸び倍率</strong>を確認できます。
                      初任給が控えめでも入社後に数倍まで伸びる企業もあれば、初任給の時点でほぼ頭打ちの企業もあります。
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
                      月額の初任給だけを見ていると、賞与の差を見落とします。同じ初任給30万円でも、
                      年間賞与が4か月分の企業と2か月分の企業では年収に数十万円の開きが出ます。
                      <Link href="/ranking/annual" className="text-primary hover:underline font-semibold mx-1">
                        想定年収ランキング
                      </Link>
                      では、賞与を含めた実質的な年収で順位を確認できます。
                    </p>
                    <p>
                      額面が同じでも、手取りは社会保険料と税金で1〜2割前後引かれます。
                      実際に使える金額は
                      <Link href="/simulator" className="text-primary hover:underline mx-1">手取り計算シミュレーター</Link>
                      で確認できます。企業研究には
                      <Link href="/articles" className="text-primary hover:underline mx-1">就活記事</Link>
                      もあわせてご活用ください。
                    </p>
                  </div>
                </div>
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
