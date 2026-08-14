import { buildMetricMetadata, renderMetricRankingPage } from "../render-metric-ranking"
import type { Metadata } from "next"

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return buildMetricMetadata("margin")
}

export default async function OperatingMarginRankingPage() {
  return renderMetricRankingPage("margin")
}
