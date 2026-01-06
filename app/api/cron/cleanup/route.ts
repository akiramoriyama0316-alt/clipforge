import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteFromR2 } from '@/lib/r2';

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000); // 秒単位
    
    // 期限切れのクリップを取得
    const result = await db.execute({
      sql: 'SELECT * FROM clips WHERE expires_at < ?',
      args: [now],
    });
    
    console.log(`Found ${result.rows.length} expired clips`);
    
    // R2から削除
    for (const clip of result.rows) {
      try {
        await deleteFromR2(clip.r2_url as string);
        console.log(`Deleted from R2: ${clip.r2_url}`);
      } catch (error) {
        console.error(`Failed to delete ${clip.r2_url}:`, error);
      }
    }
    
    // DBから削除
    await db.execute({
      sql: 'DELETE FROM clips WHERE expires_at < ?',
      args: [now],
    });
    
    return NextResponse.json({
      success: true,
      deletedCount: result.rows.length,
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

