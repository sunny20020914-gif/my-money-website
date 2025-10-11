"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tag } from "lucide-react"

const categories = [
  { name: "すべて", count: 25, value: "all" },
  { name: "就活準備", count: 8, value: "就活準備" },
  { name: "企業研究", count: 6, value: "企業研究" },
  { name: "面接対策", count: 5, value: "面接対策" },
  { name: "ES対策", count: 4, value: "ES対策" },
  { name: "業界分析", count: 2, value: "業界分析" },
]

export function ArticleCategories() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-4 w-4" />
          カテゴリー
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.map((category) => (
          <Button key={category.value} variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-muted/50">
            <span className="text-sm font-medium">{category.name}</span>
            <Badge variant="secondary" className="text-xs">
              {category.count}
            </Badge>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
