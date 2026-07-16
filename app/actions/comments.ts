"use server"

import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';

// コメント機能はランキング表示（読み取り専用APIキー）と異なり、
// スプレッドシートへの書き込みが必要なためサービスアカウント認証を使う。
// 必要な環境変数: GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_SHEET_ID
// さらにスプレッドシート自体を GOOGLE_CLIENT_EMAIL のアドレスに「編集者」として共有し、
// 「Comments」という名前のシート（A:companyId B:userName C:content D:createdAt）が必要。

const REQUIRED_ENVS = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'] as const;

const missingEnvs = (): string[] => REQUIRED_ENVS.filter((k) => !process.env[k]);

const getAuth = () => {
  // 環境変数の改行文字(\n)を実際の改行に変換して読み込む
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

// 利用者にはサーバー内部の詳細を見せず、汎用メッセージのみ返す。
// 原因特定用の詳細は console.error でVercelのFunctionログにのみ出力する。
const GENERIC_UNAVAILABLE = 'コメント機能は現在利用できません。';

const logDetail = (context: string, error: unknown) => {
  const e = error as { code?: number | string; message?: string };
  console.error(`[comments] ${context}:`, e?.code ?? '', e?.message ?? String(error));
};

export type Comment = {
  companyId: string;
  userName: string;
  content: string;
  createdAt: string;
};

export type CommentsResult = {
  comments: Comment[];
  error?: string;
};

export async function getComments(companyId: string): Promise<CommentsResult> {
  const missing = missingEnvs();
  if (missing.length > 0) {
    console.error('[comments] 環境変数が未設定です:', missing.join(', '));
    return { comments: [], error: GENERIC_UNAVAILABLE };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Comments!A:D',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return { comments: [] };

    // 1行目はヘッダーなので除外し、該当企業のコメントだけを抽出して新しい順に並べる
    const comments = rows.slice(1)
      .filter(row => row[0] === companyId)
      .map(row => ({
        companyId: row[0],
        userName: row[1] || '匿名',
        content: row[2] || '',
        createdAt: row[3] || '',
      }))
      .reverse();
    return { comments };
  } catch (error) {
    logDetail('コメントの取得に失敗', error);
    return { comments: [], error: GENERIC_UNAVAILABLE };
  }
}

export async function addComment(formData: FormData) {
  const companyId = formData.get('companyId') as string;
  const userName = (formData.get('userName') as string) || '匿名';
  const content = formData.get('content') as string;
  const createdAt = new Date().toISOString();

  if (!content?.trim() || !companyId) {
    return { error: "コメントを入力してください" };
  }

  const missing = missingEnvs();
  if (missing.length > 0) {
    console.error('[comments] 環境変数が未設定です:', missing.join(', '));
    return { error: GENERIC_UNAVAILABLE };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Comments!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[companyId, userName, content, createdAt]],
      },
    });

    // キャッシュをクリアして画面を更新させる
    revalidatePath(`/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    logDetail('コメントの投稿に失敗', error);
    return { error: 'コメントの送信に失敗しました。時間をおいて再度お試しください。' };
  }
}
