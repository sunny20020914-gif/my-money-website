"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, RefreshCwIcon } from "@/components/icons";
import type { RankingType } from "@/lib/sheets";

export function RankingFilters({
  rankingType,
  setRankingType,
  searchTerm,
  setSearchTerm,
  industries,
  selectedIndustry,
  setSelectedIndustry,
  onRefresh,
}: {
  rankingType: RankingType;
  setRankingType: (type: RankingType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  industries: string[];
  selectedIndustry: string;
  setSelectedIndustry: (industry: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            検索・フィルター
          </CardTitle>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCwIcon className="mr-2 h-3 w-3" />
            更新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={rankingType === "annual" ? "default" : "outline"} onClick={() => setRankingType("annual")}>年俸ランキング</Button>
            <Button variant={rankingType === "monthly" ? "default" : "outline"} onClick={() => setRankingType("monthly")}>月額額面ランキング</Button>
            <Button variant={rankingType === "base" ? "default" : "outline"} onClick={() => setRankingType("base")}>基本給ランキング</Button>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="企業名または業界で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-foreground"
            >
              <option value="all">すべての業界</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
