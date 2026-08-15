import { buildMetricMetadata, renderMetricRankingPage } from "../render-metric-ranking"
import type { Metadata } from "next"
import { REVALIDATE_FRESH } from "@/lib/config"

export const revalidate = REVALIDATE_FRESH

export function generateMetadata(): Promise<Metadata> {
  return buildMetricMetadata("margin")
}

export default async function OperatingMarginRankingPage() {
  return renderMetricRankingPage("margin")
}
