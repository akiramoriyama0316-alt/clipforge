import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDownloadUrl } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clipId } = await params;
    
    // DBからクリップ情報を取得
    const result = await db.execute({
      sql: 'SELECT * FROM clips WHERE id = ?',
      args: [clipId],
    });
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }
    
    const clip = result.rows[0] as any;
    
    // 有効期限チェック（秒単位で保存されているので、ミリ秒に変換）
    const now = Math.floor(Date.now() / 1000);
    if (now > clip.expires_at) {
      return NextResponse.json(
        { error: 'Clip has expired' },
        { status: 410 }
      );
    }
    
    // R2から署名付きURLを取得
    const downloadUrl = await getDownloadUrl(clip.r2_url as string, 300); // 5分間有効
    
    // リダイレクト
    return NextResponse.redirect(downloadUrl);
    
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}


