export type RankingType = "annual" | "monthly" | "base"

// 必要に応じて Node.js の型定義をインポート
/// <reference types="node" />

export interface CompanyData {
  id: string
  rank: number
  company: string
  industry: string
  annualSalary: number | string | null // 想定年収（データなしの場合 null）
  baseMonthly: number | string | null // 基本給（月）（データなしの場合 null）
  monthlySalary?: number | null // 追加
  baseSalary?: number | null // 追加
  employees: number | string
  founded: number
  description: string
  url?: string
  domain?: string
  logo?: string
  salaryUrl?: string // 給与関連のURL
}

export interface ArticleData {
  id: string
  title: string
  excerpt: string
  content: string
  category: string
  publishedAt: string
  author: string
  readTime: number
  image?: string
}

export interface FeaturedCompanyData {
  company: string
  industry: string
  estimatedAnnualSalary: number
  reason: string
  logoUrl?: string
  domainUrl?: string
}

export interface CompanyDetailData {
  long_description?: string
  strength?: string
  salary_details?: string
  future_potential?: string
}

export interface IndustryData {
  industry: string
  averageAnnualSalary: number
  companyCount: number
  description: string
}

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || process.env.NEXT_PUBLIC_SPREADSHEET_ID
const COMPANIES_SHEET_NAME = "companies"

export async function fetchRankingDataServer(rankingType: RankingType = "annual"): Promise<CompanyData[]> {
  console.log("[v0] 環境変数チェック:")
  console.log(
    "[v0] GOOGLE_SHEETS_API_KEY:",
    SHEETS_API_KEY ? `設定済み (${SHEETS_API_KEY.substring(0, 10)}...)` : "未設定",
  )
  console.log("[v0] SPREADSHEET_ID:", SPREADSHEET_ID ? `設定済み (${SPREADSHEET_ID})` : "未設定")
  console.log("[v0] 要求されたランキングタイプ:", rankingType)

  if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
    console.warn("[v0] Google Sheets API設定が見つかりません。サンプルデータを使用します。")
    return []
  }

  const getSheetName = (type: RankingType) => {
    switch (type) {
      case "annual":
        return "年俸ランキング"
      case "monthly":
        return "月額額面ランキング"
      case "base":
        return "基本給ランキング"
    }
  }

  try {
    const sheetName = getSheetName(rankingType)
    const range = `${sheetName}!A2:M1000` // M列(salaryUrl)まで取得
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`

    console.log("[v0] Google Sheets APIリクエスト:", url.replace(SHEETS_API_KEY, "***"))

    // 開発中はキャッシュせず、本番環境では1時間キャッシュする
    const response = await fetch(url, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
    })

    console.log("[v0] APIレスポンスステータス:", response.status)

    const data = await response.json()

    console.log("[v0] 取得したデータ行数:", data.values?.length || 0)

    if (!data.values) {
      console.warn("[v0] スプレッドシートにデータが見つかりません。空の配列を返します。")
      return []
    }

    const parseSalaryValue = (value: string): number | string | null => {
      if (typeof value !== 'string' || value.trim() === '') {
        return null;
      }

      // 全角数字を半角に、不要な文字を削除
      const cleaned = value
        .toString()
        .normalize('NFKC') // 全角英数記号を半角に変換
        .replace(/[¥,円\s]/g, ""); // 不要な文字を削除

      // 文字列が数値として解釈できるかチェック
      const num = Number(cleaned);
      // 解釈できなければ（NaNであれば）nullを、解釈できれば数値を返す
      return isNaN(num) ? value.trim() : num;
    }

    const parseStrictNumber = (value: string): number => {
      if (typeof value !== 'string' || value.trim() === '') {
        return 0;
      }
      const cleaned = value.toString().normalize('NFKC').replace(/[¥,円\s]/g, "");
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    }

    const parseEmployees = (value: string): number | string => {
      if (value === '?') return '?'
      return parseSalaryValue(value) ?? '?';
    }

    return data.values.map((row: any[], index: number) => {
      const id = row[11] || row[1]?.toLowerCase().replace(/\s/g, '_') || `company-${index}`
      const baseData = {
        rank: parseStrictNumber(row[0]) || index + 1,
        company: row[1] || "",
        industry: row[2] || "",
        employees: parseEmployees(row[5]),
        founded: parseStrictNumber(row[6]), // G列
        description: row[7] || "", // H列
        url: row[8] || undefined, // I列
        domain: row[9] || undefined, // J列
        logo: row[10] || undefined, // K列
        id: id, // L列
        salaryUrl: row[12] || undefined, // M列
      }

      return {
        ...baseData,
        // D列を想定年収、E列を初任給（月額）として固定で解釈する
        annualSalary: parseSalaryValue(row[3]),
        baseMonthly: parseSalaryValue(row[4]),
      }
    })
  } catch (error) {
    console.error("[v0] Google Sheetsからのデータ取得に失敗:", error)
    return []
  }
}

async function fetchCompanyDetailRow(id: string): Promise<any[] | undefined> {
  if (!SHEETS_API_KEY || !SPREADSHEET_ID) return undefined;

  const range = `${COMPANIES_SHEET_NAME}!A2:E`; // A列からE列まで取得 (適宜変更)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`
  const response = await fetch(url, {
    cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
  })
  const data = await response.json()
  return data.values?.find((row: any[]) => row[0] === id);
}

export async function fetchAllUniqueCompanies(): Promise<CompanyData[]> {
  // 年俸・月額の両シートから全企業を取得し、id で重複排除してマージする。
  // 同じ企業が両シートに存在する場合は年俸シートのデータを優先しつつ、
  // 片方にしかない給与データは欠けたままにする（null）。
  const [annualList, monthlyList] = await Promise.all([
    fetchRankingDataServer("annual"),
    fetchRankingDataServer("monthly"),
  ]);

  const map = new Map<string, CompanyData>();

  // まず月額シートを登録
  for (const c of monthlyList) {
    if (c.id) map.set(c.id, c);
  }

  // 年俸シートで上書き（年俸を優先）。ただし月額データは月額シートから引き継ぐ。
  for (const c of annualList) {
    if (!c.id) continue;
    const existing = map.get(c.id);
    if (existing) {
      // 両シートにいる企業：年俸シート情報を基本として月額データを補完
      map.set(c.id, {
        ...c,
        baseMonthly: c.baseMonthly ?? existing.baseMonthly,
        monthlySalary: c.monthlySalary ?? existing.monthlySalary,
      });
    } else {
      map.set(c.id, c);
    }
  }

  return Array.from(map.values());
}

export async function fetchCompanyById(id: string): Promise<(CompanyData & CompanyDetailData) | null> {
  try {
    // 年俸・月額両シートから探す＋企業詳細シートを並行取得
    const [allCompanies, companyDetailRow] = await Promise.all([
      fetchAllUniqueCompanies(),
      fetchCompanyDetailRow(id),
    ]);

    const companyBasicInfo = allCompanies.find(c => c.id === id);
    if (!companyBasicInfo) return null;

    const companyDetailInfo: CompanyDetailData = companyDetailRow ? {
      long_description: companyDetailRow[1] || '',
      strength: companyDetailRow[2] || '',
      salary_details: companyDetailRow[4] || '',
      future_potential: companyDetailRow[3] || '',
    } : {};

    return { ...companyBasicInfo, ...companyDetailInfo };

  } catch (e) {
    console.error(`Failed to fetch company data for id: ${id}`, e);
    return null;
  }
}

export async function fetchIndustryDataServer(): Promise<IndustryData[]> {
  if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
    console.warn("[v0] Google Sheets API設定が見つかりません。業界データは取得できません。")
    return []
  }

  try {
    const range = "業界別データ!A2:D" // ヘッダー行を除く
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`

    console.log("[v0] Google Sheets APIリクエスト (業界別):", url.replace(SHEETS_API_KEY, "***"))

    // 開発中はキャッシュせず、本番環境では1時間キャッシュする
    const response = await fetch(url, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
    })

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }

    const data = await response.json()

    if (!data.values) {
      console.warn("[v0] 「業界別データ」シートにデータが見つかりません。")
      return []
    }

    const parseNumber = (value: string): number => {
      if (!value) return 0
      const cleaned = value.toString().replace(/[¥,\s]/g, "")
      return Number.parseInt(cleaned) || 0
    }

    return data.values.map((row: any[]) => ({
      industry: row[0] || "",
      averageAnnualSalary: parseNumber(row[1]),
      companyCount: parseNumber(row[2]),
      description: row[3] || "",
    }))
  } catch (error) {
    console.error("[v0] Google Sheetsからの業界データ取得に失敗:", error)
    return []
  }
}

export async function fetchSheetNames(): Promise<string[]> {
  if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
    console.warn("[v0] Google Sheets API設定が見つかりません。シート名は取得できません。")
    return []
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title&key=${SHEETS_API_KEY}`
    console.log("[v0] Google Sheets APIリクエスト (シート名一覧):", url.replace(SHEETS_API_KEY, "***"))

    const response = await fetch(url, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
    })

    if (!response.ok) throw new Error(`API responded with status ${response.status}`)

    const data = await response.json()
    return data.sheets.map((sheet: any) => sheet.properties.title)
  } catch (error) {
    console.error("[v0] Google Sheetsからのシート名一覧取得に失敗:", error)
    return []
  }
}

export async function fetchArticleDataServer(): Promise<ArticleData[]> {
  console.log("[v0] 環境変数チェック:")
  console.log(
    "[v0] GOOGLE_SHEETS_API_KEY:",
    SHEETS_API_KEY ? `設定済み (${SHEETS_API_KEY.substring(0, 10)}...)` : "未設定",
  )
  console.log("[v0] SPREADSHEET_ID:", SPREADSHEET_ID ? `設定済み (${SPREADSHEET_ID})` : "未設定")

  if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
    console.warn("[v0] Google Sheets API設定が見つかりません。サンプルデータを使用します。")
    return []
  }

  try {
    const range = "記事!A2:I" // ヘッダー行を除く
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`

    console.log("[v0] Google Sheets APIリクエスト:", url.replace(SHEETS_API_KEY, "***"))

    // 開発中はキャッシュせず、本番環境では1時間キャッシュする
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    })

    console.log("[v0] APIレスポンスステータス:", response.status)

    const data = await response.json()

    console.log("[v0] 取得した記事データ行数:", data.values?.length || 0)

    if (!data.values) {
      console.warn("[v0] スプレッドシートに記事データが見つかりません。空の配列を返します。")
      return []
    }

    return data.values.map((row: any[], index: number) => {
      let publishedAt = new Date().toISOString()
      if (row[5]) {
        const d = new Date(row[5])
        if (!isNaN(d.getTime())) {
          publishedAt = d.toISOString()
        }
      }

      return {
        id: (row[0] || `article-${index + 1}`).toString().trim(),
        title: row[1] || "",
        excerpt: row[2] || "",
        content: row[3] || "",
        category: row[4] || "その他",
        publishedAt,
        author: row[6] || "編集部",
        readTime: Number.parseInt(row[7]) || 5,
        image: row[8] || undefined,
      }
    })
  } catch (error) {
    console.error("[v0] Google Sheetsからの記事データ取得に失敗:", error)
    return []
  }
}

export async function fetchArticleById(id: string): Promise<ArticleData | null> {
  try {
    const articles = await fetchArticleDataServer()
    return articles.find((article) => article.id === id) || null
  } catch (error) {
    console.error(`[v0] 記事ID ${id} の取得に失敗:`, error)
    return null
  }
}

export async function fetchFeaturedCompaniesDataServer(): Promise<FeaturedCompanyData[]> {
  if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
    console.warn("[v0] Google Sheets API設定が見つかりません。注目企業データは取得できません。")
    return []
  }

  try {
    const range = "注目企業!A2:F" // ヘッダー行を除く
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`

    console.log("[v0] Google Sheets APIリクエスト (注目企業):", url.replace(SHEETS_API_KEY, "***"))

    // 開発中はキャッシュせず、本番環境では1時間キャッシュする
    const response = await fetch(url, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
    })

    console.log("[v0] 注目企業APIレスポンスステータス:", response.status)
    const responseData = await response.json()
    console.log(
      "[v0] 注目企業APIレスポンスデータ:",
      JSON.stringify(responseData, null, 2),
    )

    if (!response.ok) {
      const errorBody = responseData
      throw new Error(
        `API responded with status ${response.status}: ${errorBody?.error?.message || "Unknown error"}`,
      )
    }

    const data = responseData

    if (!data.values) {
      console.warn("[v0] 「注目企業」シートにデータが見つかりません。")
      return []
    }

    const parseSalaryValue = (value: string): number | string => {
      if (typeof value !== 'string' || value.trim() === '') {
        return 0;
      }
      const cleaned = value.toString().normalize('NFKC').replace(/[¥,円\s]/g, "");
      const num = Number(cleaned);
      return isNaN(num) ? value : num;
    }

    return data.values.map((row: any[]) => ({
      company: row[0] || "",
      industry: row[1] || "",
      estimatedAnnualSalary: parseSalaryValue(row[2]),
      reason: row[3] || "",
      domainUrl: row[4] || undefined,
      logoUrl: row[5] || undefined,
    }))
  } catch (error) {
    console.error("[v0] Google Sheetsからの注目企業データ取得に失敗:", error)
    return []
  }
}

// サンプルランキングデータ（フォールバック用）
function getSampleRankingData(): CompanyData[] {
  return [
    {
      id: "mitsubishi_corp",
      rank: 1,
      company: "三菱商事",
      industry: "総合商社",
      annualSalary: 25500000,
      baseMonthly: 255000,
      employees: 5725,
      founded: 1954,
      description: "日本最大級の総合商社として、エネルギー、金属、機械、化学品、生活産業など幅広い分野で事業を展開。",
      domain: "mitsubishicorp.com",
      logo: "/mitsubishi-logo.png",
      url: "https://www.mitsubishicorp.com/",
    },
    {
      id: "mitsui_and_co",
      rank: 2,
      company: "三井物産",
      industry: "総合商社",
      annualSalary: 25000000,
      baseMonthly: 250000,
      employees: 5587,
      founded: 1947,
      description: "金属、エネルギー、機械・インフラ、化学品、鉄鋼製品、生活産業、情報・金融の7事業セグメントで展開。",
      domain: "mitsui.com",
      logo: "/mitsui-logo.png",
      url: "https://www.mitsui.com/jp/ja/index.html",
    },
    {
      id: "itochu",
      rank: 3,
      company: "伊藤忠商事",
      industry: "総合商社",
      annualSalary: 24800000,
      baseMonthly: 248000,
      employees: 4285,
      founded: 1949,
      description: "繊維、機械、金属、エネルギー・化学品、食料、住生活、情報・金融の各分野で多角的に事業を展開。",
      domain: "itochu.co.jp",
      logo: "/itochu-logo.jpg",
      url: "https://www.itochu.co.jp/ja/index.html",
    },
    {
      id: "sumitomo_corp",
      rank: 4,
      company: "住友商事",
      industry: "総合商社",
      annualSalary: 24500000,
      baseMonthly: 245000,
      employees: 5240,
      founded: 1919,
      description: "金属、輸送機・建機、インフラ、メディア・デジタル、生活・不動産、資源・化学品の6事業部門で展開。",
      domain: "sumitomocorp.com",
      logo: "/sumitomo-logo.png",
      url: "https://www.sumitomocorp.com/ja/jp",
    },
    {
      id: "marubeni",
      rank: 5,
      company: "丸紅",
      industry: "総合商社",
      annualSalary: 24200000,
      baseMonthly: 242000,
      employees: 4389,
      founded: 1949,
      description:
        "ライフスタイル、情報・不動産、フォレストプロダクツ、食料、アグリ事業、電力・インフラ、航空宇宙・船舶、金属、エネルギーの9分野で事業展開。",
      domain: "marubeni.com",
      logo: "/marubeni-logo.jpg",
      url: "https://www.marubeni.com/jp/",
    },
  ]
}
