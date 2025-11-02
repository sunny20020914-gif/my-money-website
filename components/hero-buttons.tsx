"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"

export function HeroButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <Button asChild size="lg" className="text-lg px-8 py-6">
        <Link href="/ranking">
          ランキングを見る
          <ArrowRightIcon className="ml-2 h-5 w-5" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent">
        <Link href="/articles">就活記事を読む</Link>
      </Button>
    </div>
  )
}