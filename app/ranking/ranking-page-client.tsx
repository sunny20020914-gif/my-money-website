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
import { Search, RefreshCw, ExternalLink, AlertCircle, ArrowRightIcon, ChevronDown, Star } from "lucide-react"
import { AdBanner } from "@/components/ad-banner"
import { useRankingData } from "@/hooks/use-sheets-data"
import type { CompanyData } from "@/lib/sheets"
import { useFavorites } from "@/hooks/use-favorites"
import { showToast } from "@/components/toaster"
import { CompanyLogo } from "@/components/company-logo"
import { buildAllListDefinitions } from "@/lib/list-definitions"
import { buildFinancialMetrics } from "@/lib/financials"
import type { RankingSummary } from "@/lib/ranking-summary"
import { FISCAL_YEAR } from "@/lib/config"

type RankingType = "annual" | "monthly" | "base"

const rankingTypes: { id: RankingType; label: string; description: string }[] = [
  {
    id: "monthly",
    label: "初任給",
    description: "月々の給与額面（固定残業代や手当を含む）に基づいたランキングです。住宅手当などの固定手当を含んでいる場合があります。ランキングの種類は上のボタンで切り替え可能です",
  },
  {
    id: "annual",
    label: "想定年収",
    description:
      "新卒入社時の想定年収ランキングです。賞与や残業代を含んだ理論値であり、実際の支給額とは異なる場合があります。",
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

  // 財務指標（売上高・営業利益・営業利益率…）。スプシに列が無い企業では空配列になり、
  // 下段の財務エリアごと非表示になる。指標を増やす場合も lib/financials.ts 側だけ触ればよい。
  const financials = buildFinancialMetrics(company);

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
          {financials.length > 0 && (
            <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
              {financials.map((m) => (
                <div key={m.key} className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* --- 下段エリア（説明文・既存挙動のまま最後に置く）--- */}
          <div className="min-h-[0.8rem] relative mt-2 w-full">
            {company.description && (
              <p
                className="text-sm text-muted-foreground leading-relaxed max-w-xl absolute"
                style={{
                  right: `${descriptionPosition}%`,
                }}
              >
                {company.description}
              </p>
            )}
          </div>
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
              <div className="ml-1 text-left">
                <h3 className="text-sm font-bold text-foreground leading-tight">{company.company}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {company.industry.split('/').map((industry: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[8px] px-1.5">{industry}</Badge>
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
                    <div className="text-xs text-muted-foreground">従業員数</div>
                    <div className="text-xs font-semibold text-foreground">{company.employees.toLocaleString()}<span className="text-xs">人</span></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">設立: {company.founded}年</div>
                </div>
              </div>
            </div>
          </div>
          {company.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed pl-[52px]">{company.description}</p>}

          {/* --- 財務指標エリア（モバイル）---
              狭い画面では2列固定。指標が増えても行が下に伸びるだけで横溢れしない。 */}
          {financials.length > 0 && (
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-6 gap-y-2 pl-[52px]">
              {financials.map((m) => (
                <div key={m.key} className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{m.label}</p>
                  <p className="text-xs font-semibold text-foreground truncate">{m.value}</p>
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
}: {
  initialData: CompanyData[];
  initialError: string | null;
  industryList: string[];
  summary: RankingSummary | null;
  updatedLabel: string;
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRanking, setSelectedRanking] = useState<RankingType>("monthly")
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
              <h1 className="text-2xl md:text-4xl font-bold text-balance mb-4 leading-tight text-primary">
                初任給・年収ランキング
              </h1>
              <p className="text-base md:text-lg text-muted-foreground text-balance leading-relaxed">
                27卒・28卒向けに、新卒の初任給・年収をリアルタイム検索。<br className="hidden md:inline" />
                ランキングを切り替えて、あなたの目指すキャリアを見つけよう。
              </p>
            </div>

            {/* 【SEO】集計サマリー: 結論の1文は常時表示、業種別表は折りたたみ
                （details内のコンテンツも初期HTMLに含まれクローラーに読まれる） */}
            {summary && summary.avgMonthly !== null && (
              <div className="mb-6 rounded-lg border bg-card p-4">
                <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
                  【{FISCAL_YEAR}年度】掲載{summary.withMonthly}社の平均初任給は月額{summary.avgMonthly.toLocaleString()}円
                  {summary.medianMonthly !== null && <>（中央値{summary.medianMonthly.toLocaleString()}円）</>}。
                  {summary.topCompany && summary.topMonthly !== null && (
                    <>最高は{summary.topCompany}の{summary.topMonthly.toLocaleString()}円。</>
                  )}
                  40万円以上{summary.over40}社・35万円以上{summary.over35}社・30万円以上{summary.over30}社。
                </p>
                {summary.industryAverages.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline">
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
                      金額は固定残業代や諸手当を含む場合があります。初任給は多くの企業で前年同水準か引き上げ傾向のため、27卒・28卒の企業選びの目安としてご活用ください。
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
                  <div className="flex flex-wrap gap-3">
                    {rankingTypes.map((type) => (
                      <Button
                        key={type.id}
                        variant={selectedRanking === type.id ? "default" : "outline"}
                        size="sm"
                        className={type.id === "base" ? "invisible pointer-events-none" : "px-5"}
                        onClick={() => {
                          // 既に選択されている場合は何もしない
                          if (selectedRanking === type.id) return
                          setSelectedIndustry(null)
                          setSelectedRanking(type.id)
                        }}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rankingTypes.find((type) => type.id === selectedRanking)?.description}
                  </p>
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

            {/* 【SEO】就活文脈の解説ブロック（「就活 初任給」系の複合クエリ対策 + 内部リンク） */}
            {!loading && companies.length > 0 && (
              <section className="mt-10 border-t pt-6 space-y-3 text-left">
                <h2 className="text-base md:text-lg font-bold">新卒の企業選びで初任給ランキングを活用するには</h2>
                <div className="space-y-3 text-sm md:text-[15px] leading-relaxed text-muted-foreground">
                  <p>
                    新卒で入社する企業を比較するとき、初任給の額面だけで判断するのは危険です。金額に固定残業代や住宅手当が含まれている場合があるため、
                    同じ30万円でも実質的な条件は企業によって大きく異なります。各企業の詳細ページで給与の内訳と
                    <Link href="/simulator" className="text-primary hover:underline mx-1">手取り額</Link>
                    まで確認するのがおすすめです。
                  </p>
                  <p>
                    また、初任給の水準は業界によって差があります。志望業界の
                    <Link href="/industries" className="text-primary hover:underline mx-1">業界別ランキング</Link>
                    で平均と比較すると、その企業の給与水準が業界内でどの位置にあるかが分かります。
                    エントリー前の企業研究には、面接対策や業界研究をまとめた
                    <Link href="/articles" className="text-primary hover:underline mx-1">就活記事</Link>
                    もあわせてご活用ください。
                  </p>
                </div>
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
