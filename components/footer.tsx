import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">￥</span>
              </div>
              <span className="font-bold text-xl text-foreground">My Money Web</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              企業の初任給情報を提供し、就活生のキャリア選択をサポートします。
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">コンテンツ</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/ranking" className="text-muted-foreground hover:text-foreground transition-colors">
                  初任給ランキング
                </Link>
              </li>
              <li>
                <Link href="/industries" className="text-muted-foreground hover:text-foreground transition-colors">
                  業界別分析
                </Link>
              </li>
              <li>
                <Link href="/featured" className="text-muted-foreground hover:text-foreground transition-colors">
                  注目企業
                </Link>
              </li>
              <li>
                <Link href="/articles" className="text-muted-foreground hover:text-foreground transition-colors">
                  就活記事
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">サイト情報</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  サイトについて
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  利用規約
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-xs text-muted-foreground mb-4">
            当サイトに掲載されている会社名、製品名、ロゴマークは、各社の商標または登録商標です。
          </p>
          <p className="text-muted-foreground">© My Money Web. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
}
