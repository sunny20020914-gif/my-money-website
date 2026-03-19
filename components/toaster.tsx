"use client"
import { useEffect, useState } from "react"
import { CheckCircle2, Info } from "lucide-react"

export type ToastType = "success" | "info"

export function Toaster() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([])

  useEffect(() => {
    const handleToast = (e: CustomEvent) => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message: e.detail.message, type: e.detail.type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    }

    window.addEventListener("show-toast" as any, handleToast as any)
    return () => window.removeEventListener("show-toast" as any, handleToast as any)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg transition-all animate-in slide-in-from-bottom-2 fade-in-0"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Info className="h-5 w-5 text-muted-foreground" />
          )}
          <p className="text-sm font-medium text-foreground">{toast.message}</p>
        </div>
      ))}
    </div>
  )
}

export const showToast = (message: string, type: ToastType = "success") => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message, type } }))
  }
}