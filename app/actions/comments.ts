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

// Googleからのエラーを、原因が特定できる利用者向けメッセージに変換する
const toUserError = (error: unknown): string => {
  const e = error as { code?: number | string; message?: string };
  const msg = e?.message || String(error);
  if (e?.code === 403 || msg.includes('does not have permission')) {
    return 'サーバー設定エラー(403): サービスアカウントにスプレッドシートの権限がありません。シートをGOOGLE_CLIENT_EMAILのアドレスに「編集者」で共有してください。';
  }
  if (e?.code === 404 || msg.includes('Requested entity was not found')) {
    return 'サーバー設定エラー(404): GOOGLE_SHEET_ID のスプレッドシートが見つかりません。IDを確認してください。';
  }
  if (msg.includes('Unable to parse range')) {
    return 'サーバー設定エラー: スプレッドシートに「Comments」シートが存在しません。タブ名を確認してください。';
  }
  if (msg.includes('DECODER') || msg.includes('PEM') || msg.includes('private_key') || msg.includes('invalid_grant')) {
    return 'サーバー設定エラー: GOOGLE_PRIVATE_KEY の形式が不正です。改行を含む鍵全体を正しく設定してください。';
  }
  return 'コメントの処理に失敗しました。時間をおいて再度お試しください。';
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
    console.error('コメント機能: 環境変数が未設定です:', missing.join(', '));
    return { comments: [], error: `サーバー設定エラー: 環境変数 ${missing.join(', ')} が未設定です。` };
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
    console.error('コメントの取得に失敗しました:', error);
    return { comments: [], error: toUserError(error) };
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
    console.error('コメント機能: 環境変数が未設定です:', missing.join(', '));
    return { error: `サーバー設定エラー: 環境変数 ${missing.join(', ')} が未設定です。` };
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
    console.error('コメントの投稿に失敗しました:', error);
    return { error: toUserError(error) };
  }
}
