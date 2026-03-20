"use server"

import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';

// 認証用の共通関数
const getAuth = () => {
  // .env.localの改行文字(\n)を実際の改行に変換して読み込む
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export type Comment = {
  companyId: string;
  userName: string;
  content: string;
  createdAt: string;
};

export async function getComments(companyId: string): Promise<Comment[]> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Comments!A:D',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    // 1行目はヘッダーなので除外し、該当企業のコメントだけを抽出して新しい順に並べる
    return rows.slice(1)
      .filter(row => row[0] === companyId)
      .map(row => ({
        companyId: row[0],
        userName: row[1] || '匿名',
        content: row[2] || '',
        createdAt: row[3] || '',
      }))
      .reverse();
  } catch (error) {
    console.error('コメントの取得に失敗しました:', error);
    return [];
  }
}

export async function addComment(formData: FormData) {
  const companyId = formData.get('companyId') as string;
  const userName = (formData.get('userName') as string) || '匿名';
  const content = formData.get('content') as string;
  const createdAt = new Date().toISOString();

  if (!content.trim() || !companyId) {
    return { error: "コメントを入力してください" };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
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
    return { error: "コメントの送信に失敗しました。時間をおいて再度お試しください。" };
  }
}
