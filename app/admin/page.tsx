import { AdminPanel } from "@/components/admin-panel"
import { Metadata } from "next"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminPanel />
}
