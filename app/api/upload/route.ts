import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';
import { db, initDatabase } from '@/lib/db';
import { generateId, getCurrentTimestamp } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 300;

let dbInitialized = false;

export async function POST(request: NextRequest) {
  // 認証チェック
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json(
      { error: '認証が必要です。ログインしてください。' },
      { status: 401 }
    );
  }
  
  // データベースが初期化されていない場合は初期化
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
      // 初期化エラーでも続行を試みる（テーブルが既に存在する可能性がある）
    }
  }
  
  // クレジット残高を確認
  try {
    const userResult = await db.execute({
      sql: 'SELECT credits FROM users WHERE id = ?',
      args: [clerkUserId],
    });

    const credits = userResult.rows[0]?.credits || 0;

    if (credits <= 0) {
      return NextResponse.json(
        { 
          error: 'クレジットが不足しています。クレジットを購入してください。',
          redirectUrl: '/credits'
        },
        { status: 402 } // Payment Required
      );
    }
  } catch (error) {
    console.error('Failed to check credits:', error);
    return NextResponse.json(
      { error: 'クレジット情報の取得に失敗しました' },
      { status: 500 }
    );
  }
  
  let uploadedToR2 = false;
  let r2Key = '';
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'API called',data:{hasEnvVars:!!process.env.R2_ENDPOINT&&!!process.env.R2_ACCESS_KEY_ID&&!!process.env.R2_SECRET_ACCESS_KEY&&!!process.env.R2_BUCKET_NAME&&!!process.env.TURSO_DATABASE_URL&&!!process.env.TURSO_AUTH_TOKEN},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'FormData parsed',data:{hasFile:!!file,fileName:file?.name,fileSize:file?.size,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。MP4、MOV、AVIのみ対応しています。' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズは5GB以下にしてください（現在10GB対応準備中）' },
        { status: 400 }
      );
    }

    const videoId = generateId();
    const timestamp = getCurrentTimestamp();
    const fileExtension = file.name.split('.').pop() || 'mp4';
    r2Key = `videos/${videoId}.${fileExtension}`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'Before R2 upload',data:{videoId,r2Key},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToR2(r2Key, buffer, file.type);
    uploadedToR2 = true;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'R2 upload completed',data:{videoId,r2Key},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // ClerkのユーザーIDを使用
    const finalUserId = clerkUserId;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'Before DB insert',data:{videoId,userId:finalUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    await db.execute({
      sql: `
        INSERT INTO videos (
          id, user_id, filename, duration, status,
          filter_mode, subtitle_enabled, aspect_ratio,
          credits_used, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        videoId,
        finalUserId,
        file.name,
        0,
        'uploaded',
        'all',
        0,
        '16:9',
        0,
        timestamp,
      ],
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'DB insert completed',data:{videoId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      videoId,
      message: 'アップロードが完了しました',
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/upload/route.ts:POST',message:'Error caught',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('Upload error:', error);
    
    // R2にアップロード済みの場合はクリーンアップを試みる
    if (uploadedToR2 && r2Key) {
      try {
        const { deleteFromR2 } = await import('@/lib/r2');
        await deleteFromR2(r2Key);
      } catch (cleanupError) {
        console.error('Failed to cleanup R2 file:', cleanupError);
      }
    }
    
    // エラーメッセージを安全に返す（詳細情報は隠す）
    const errorMessage = error instanceof Error 
      ? (error.message.includes('FOREIGN KEY') 
          ? 'データベースエラーが発生しました。もう一度お試しください。'
          : 'アップロードに失敗しました')
      : 'アップロードに失敗しました';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

