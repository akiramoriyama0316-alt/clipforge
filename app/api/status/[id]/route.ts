import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    
    const videoResult = await db.execute({
      sql: 'SELECT * FROM videos WHERE id = ?',
      args: [videoId],
    });
    
    if (videoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    const video = videoResult.rows[0] as any;
    
    const clipsResult = await db.execute({
      sql: 'SELECT * FROM clips WHERE video_id = ? ORDER BY timestamp ASC',
      args: [videoId],
    });
    
    return NextResponse.json({
      status: video.status,
      clips: clipsResult.rows.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        score: row.score,
        killType: row.kill_type,
        filename: row.filename,
        r2_url: row.r2_url,
      })),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

