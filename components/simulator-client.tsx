"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { estimateNetSalary, roundNet } from "@/lib/net-salary"

const PRESETS = [220_000, 250_000, 280_000, 320_000, 400_000]

const yen = (n: number) => `¥${n.toLocaleString()}`

function SimulatorForm() {
  const params = useSearchParams()
  const presetMonthly = Number(params.get("monthly"))
  const presetName = params.get("name") || ""

  const [monthly, setMonthly] = useState<number>(
    Number.isFinite(presetMonthly) && presetMonthly > 0 ? presetMonthly : 250_000,
  )
  const [bonus, setBonus] = useState<number>(0)
  const [dependents, setDependents] = useState<number>(0)

  const est = useMemo(() => estimateNetSalary(monthly, { dependents }), [monthly, dependents])

  // 年収ベースの概算（賞与にも同率の社会保険・税がかかる前提の簡易計算）
  const annual = useMemo(() => {
    if (!est) return null
    const grossAnnual = monthly * 12 + bonus
    const ratio1 = est.netMonthlyFirstYear / monthly
    const ratio2 = est.netMonthlySecondYear / monthly
    return {
      grossAnnual,
      netAnnualFirstYear: Math.round(grossAnnual * ratio1),
      netAnnualSecondYear: Math.round(grossAnnual * ratio2),
    }
  }, [est, monthly, bonus])

  return (
    <div className="space-y-6">
      {presetName && (
        <p className="text-sm text-muted-foreground">
          {presetName}の初任給（月額{monthly.toLocaleString()}円）を初期値にしています。自由に変更できます。
        </p>
      )}

      {/* --- 入力 --- */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4 md:p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="sim-monthly" className="text-sm font-semibold">初任給（月額・額面）</label>
            <Input
              id="sim-monthly"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={monthly || ""}
              onChange={(e) => setMonthly(Number(e.target.value) || 0)}
              className="max-w-[220px] text-lg font-semibold"
            />
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  variant={monthly === p ? "default" : "outline"}
                  size="sm"
                  className={monthly === p ? "" : "bg-transparent"}
                  onClick={() => setMonthly(p)}
                >
                  {p / 10_000}万円
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="sim-bonus" className="text-sm font-semibold">賞与（年間・任意）</label>
              <Input
                id="sim-bonus"
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                value={bonus || ""}
                placeholder="0"
                onChange={(e) => setBonus(Number(e.target.value) || 0)}
                className="max-w-[220px]"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-semibold block">扶養人数</span>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((d) => (
                  <Button
                    key={d}
                    variant={dependents === d ? "default" : "outline"}
                    size="sm"
                    className={dependents === d ? "" : "bg-transparent"}
                    onClick={() => setDependents(d)}
                  >
                    {d}人
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- 結果 --- */}
      {est ? (
        <Card className="py-0 gap-0 border-primary/40">
          <CardContent className="p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">手取り（1年目・住民税なし）</p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  約{yen(roundNet(est.netMonthlyFirstYear))}<span className="text-sm font-normal">/月</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">額面の{Math.round((est.netMonthlyFirstYear / est.grossMonthly) * 100)}%</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">手取り（2年目以降・住民税あり）</p>
                <p className="text-2xl md:text-3xl font-bold">
                  約{yen(roundNet(est.netMonthlySecondYear))}<span className="text-sm font-normal">/月</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">額面の{Math.round((est.netMonthlySecondYear / est.grossMonthly) * 100)}%</p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold mb-2">控除の内訳（月額）</h2>
              <dl className="text-sm divide-y">
                <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">健康保険料</dt><dd>{yen(est.healthInsurance)}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">厚生年金保険料</dt><dd>{yen(est.pension)}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">雇用保険料</dt><dd>{yen(est.employmentInsurance)}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">所得税（源泉徴収）</dt><dd>{yen(est.incomeTaxMonthly)}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">住民税（2年目以降）</dt><dd>{yen(est.residentTaxMonthly)}</dd></div>
              </dl>
            </div>

            {annual && (
              <div>
                <h2 className="text-sm font-bold mb-2">年収ベースの概算{bonus > 0 && "（賞与込み）"}</h2>
                <dl className="text-sm divide-y">
                  <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">額面年収</dt><dd>{yen(annual.grossAnnual)}</dd></div>
                  <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">手取り年収（1年目）</dt><dd className="font-semibold">約{yen(roundNet(annual.netAnnualFirstYear))}</dd></div>
                  <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">手取り年収（2年目以降）</dt><dd>約{yen(roundNet(annual.netAnnualSecondYear))}</dd></div>
                </dl>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              ※健康保険料率10%（労使折半）・厚生年金18.3%（労使折半）・雇用保険0.55%・所得税（復興特別所得税込み）で計算した概算です。
              賞与分は月給と同率で控除される前提の簡易計算です。実際の手取りは勤務地の保険料率や手当・控除により変わります。
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">月額を入力すると手取りが表示されます。</p>
      )}
    </div>
  )
}

export function SimulatorClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">読み込み中...</p>}>
      <SimulatorForm />
    </Suspense>
  )
}
