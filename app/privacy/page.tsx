import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "プライバシーポリシー",
  description: "当サイトのプライバシーポリシーに関するページです。",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="py-12 flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-balance mb-4 tracking-tight">
              プライバシーポリシー
            </h1>
            <p className="text-lg text-muted-foreground">
              本サイトは以下の通りプライバシーポリシーを定め、ユーザーのプライバシー保護に最大限努めます。
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none mx-auto mt-12 space-y-8">
            <h3>第1条：個人情報の取得と利用目的</h3>
            <p>本サイトでは、ユーザーから直接ご提供いただく情報およびサービス利用に伴い収集する情報を、以下の目的のために利用いたします。</p>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>取得する主な情報</th>
                    <th>利用目的</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>ユーザー提供情報</strong>（お名前、メールアドレス等）</td>
                    <td>お問い合わせ、コメントに対する回答や連絡、必要な情報の通知、サービスの提供。</td>
                  </tr>
                  <tr>
                    <td><strong>アクセス情報</strong>（IPアドレス、閲覧履歴、端末情報等）</td>
                    <td>サービス改善、統計的な分析、セキュリティの確保、広告効果測定。</td>
                  </tr>
                  <tr>
                    <td><strong>アンケート回答情報</strong>（年代、志向性など）</td>
                    <td>匿名化されたデータとして、サービスの改善および<strong>共同研究、ビジネス開発</strong>のために利用。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>第2条：個人情報に該当しない情報（匿名加工情報・統計情報）の利用と提供</h3>
            <p>本サイトは、以下の目的のため、個人を特定できない形に加工された情報（匿名加工情報、統計情報、メタデータなど）を積極的に活用し、<strong>ビジネス発展の可能性を最大化</strong>します。</p>
            <ol>
              <li><strong>サービスの改善と分析</strong>: ユーザーの行動パターンやアンケート結果を分析し、コンテンツの充実や機能改善に役立てます。</li>
              <li><strong>第三者への提供</strong>: 本サイトで収集した情報（アクセス解析データ、アンケートの集計結果、行動履歴のメタデータなど）を、<strong>個人が特定できない形式</strong>に完全に加工した上で、<strong>新たなビジネス機会の創出、市場調査、および共同研究</strong>を目的として第三者（企業、研究機関等）に提供することがあります。</li>
              <li><strong>提供情報の種類</strong>: 提供する情報には、ユーザーの属性（年齢層、興味関心など）、サイト上での行動履歴（ランキングの閲覧傾向など）の<strong>集計データ</strong>が含まれます。</li>
            </ol>

            <h3>第3条：広告の配信について</h3>
            <p>本サイトは第三者配信の広告サービス（Googleアドセンス等）を利用しています。</p>
            <ol>
              <li><strong>Cookieの利用</strong>: これらの広告配信事業者は、ユーザーの興味に応じた商品やサービスの広告を表示するため、当サイトや他サイトへのアクセスに関する情報である<strong>Cookie</strong>（クッキー）を使用することがあります。</li>
              <li><strong>個人情報の不使用</strong>: Cookieに含まれる情報には、氏名、住所、メールアドレス、電話番号など、<strong>個人を特定できる情報は一切含まれません</strong>。</li>
              <li><strong>無効化の方法</strong>: ユーザーは、ブラウザの設定を変更することでCookieの機能を無効にすることができます。詳細については、各広告配信事業者のプライバシーポリシーをご確認ください。</li>
            </ol>

            <h3>第4条：個人情報の第三者提供の例外</h3>
            <p>本サイトは、以下の場合を除き、ご提供いただいた個人情報を<strong>ご本人の同意なく第三者に開示または提供することはありません</strong>。</p>
            <ol>
              <li>法令に基づき開示が必要な場合。</li>
              <li>人の生命、身体または財産の保護のために必要であり、ご本人の同意を得ることが困難な場合。</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要があり、ご本人の同意を得ることが困難な場合。</li>
            </ol>

            <h3>第5条：免責事項</h3>
            <ol>
              <li><strong>外部サイト</strong>: 本サイトからリンクやバナーなどによって他のサイトに移動された場合、移動先サイトで提供される情報、サービス等について本サイトは一切の責任を負いません。</li>
              <li><strong>情報の正確性</strong>: 本サイトのコンテンツ・情報につきましては、可能な限り正確な情報を掲載するよう努めておりますが、誤情報や古い情報が含まれる可能性もございます。本サイトに掲載された内容によって生じた損害等の一切の責任を負いかねますのでご了承ください。</li>
            </ol>

            <h3>第6条：プライバシーポリシーの変更</h3>
            <p>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく変更することができるものとします。本サイトが別途定める場合を除いて、変更後のプライバシーポリシーは、本サイトに掲載したときから効力を生じるものとします。</p>

            <h3>📞 お問い合わせ窓口</h3>
            <p>本ポリシーに関するお問い合わせは、以下の窓口までお願いいたします。</p>
            <p>
              <a href="https://forms.gle/x3Qt8hA8B6YuuiaN8" target="_blank" rel="noopener noreferrer">
                https://forms.gle/x3Qt8hA8B6YuuiaN8
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
