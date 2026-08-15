import { buildMetricMetadata, renderMetricRankingPage } from "../render-metric-ranking"
import type { Metadata } from "next"
import { REVALIDATE_FRESH } from "@/lib/config"

export const revalidate = REVALIDATE_FRESH

export function generateMetadata(): Promise<Metadata> {
  return buildMetricMetadata("growth")
}

export default async function SalaryGrowthRankingPage() {
  return renderMetricRankingPage("growth")
}
