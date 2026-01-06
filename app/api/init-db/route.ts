import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    return NextResponse.json({
      success: true,
      message: 'データベースが正常に初期化されました',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'データベースの初期化に失敗しました' },
      { status: 500 }
    );
  }
}

