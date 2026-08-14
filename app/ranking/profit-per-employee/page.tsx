import { buildMetricMetadata, renderMetricRankingPage } from "../render-metric-ranking"
import type { Metadata } from "next"

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return buildMetricMetadata("profit-per-employee")
}

export default async function ProfitPerEmployeeRankingPage() {
  return renderMetricRankingPage("profit-per-employee")
}
