"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MenuIcon, XIcon, ChevronDownIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 font-['Zen_Kaku_Gothic_New']">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="relative -top-px text-primary-foreground font-bold text-xl leading-none">￥</span>
              </div>
              <span className="font-bold text-xl text-foreground tracking-normal">初任給ランキング</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isActive("/") ? "text-foreground" : "text-muted-foreground",
              )}
            >
              ホーム
            </Link>
            <Link
              href="/ranking"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isActive("/ranking") ? "text-foreground" : "text-muted-foreground",
              )}
            >
              ランキング
            </Link>
            <Link
              href="/industry-analysis"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isActive("/industry-analysis") ? "text-foreground" : "text-muted-foreground",
              )}
            >
              業界別分析
            </Link>
            <Link
              href="/featured"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isActive("/featured") ? "text-foreground" : "text-muted-foreground",
              )}
            >
              注目企業
            </Link>
            <Link
              href="/articles"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isActive("/articles") ? "text-foreground" : "text-muted-foreground",
              )}
            >
              就活記事
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                その他
                <ChevronDownIcon className="ml-1 h-3 w-3" />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-md">
                  <Link
                    href="/about"
                    className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    サイトについて
                  </Link>
                  <Link
                    href="/privacy"
                    className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    プライバシーポリシー
                  </Link>
                  <Link
                    href="/terms"
                    className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    利用規約
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/20">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive("/") ? "text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                ホーム
              </Link>
              <Link
                href="/ranking"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive("/ranking") ? "text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                ランキング
              </Link>
              <Link
                href="/industry-analysis"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive("/industry-analysis") ? "text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                業界別分析
              </Link>
              <Link
                  href="/featured"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground",
                    isActive("/featured") ? "text-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  注目企業
                </Link>
                <Link
                href="/articles"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive("/articles") ? "text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                就活記事
              </Link>
              <div className="border-t border-border/20 pt-4 space-y-4">
                <Link
                  href="/about"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  サイトについて
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/terms"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  利用規約
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
