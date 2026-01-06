import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, initDatabase } from '@/lib/db';
import { downloadFromR2ToFile } from '@/lib/r2';
import { detectKillScenes, filterKillScenes } from '@/lib/detector';
import { validateVideo, getVideoMetadata } from '@/lib/ffmpeg';
import { cleanupOldTempFiles } from '@/lib/cleanup';
import { generateAllClips } from '@/lib/clip-generator';
import { generateId } from '@/lib/utils';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Functionsの制限（無料プランは10秒、Proは60秒）

let dbInitialized = false;

export async function POST(request: NextRequest) {
  // データベースが初期化されていない場合は初期化
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }
  
  let videoId: string | null = null;
  let requestBody: any = null;
  
  const TIMEOUT_MS = 50 * 1000; // 50秒でタイムアウト警告
  const startTime = Date.now();
  
  function checkTimeout() {
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error('処理がタイムアウトしました。動画が長すぎる可能性があります。');
    }
  }
  
  try {
    // 認証チェック
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      );
    }
    
    // 古い一時ファイルをクリーンアップ
    await cleanupOldTempFiles();
    
    requestBody = await request.json();
    videoId = requestBody.videoId;
    const { filterMode, subtitleEnabled, aspectRatio } = requestBody;
    
    console.log(`Processing video ${videoId} with mode: ${filterMode}`);
    
    checkTimeout();
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    const result = await db.execute({
      sql: 'SELECT * FROM videos WHERE id = ?',
      args: [videoId],
    });
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    const video = result.rows[0] as any;
    
    // ユーザー認証チェック
    if (video.user_id !== userId) {
      return NextResponse.json(
        { error: 'この動画へのアクセス権限がありません' },
        { status: 403 }
      );
    }
    
    // 重複処理防止: 既に処理中または完了している場合は拒否
    if (video.status === 'processing') {
      return NextResponse.json(
        { error: 'Video is already being processed' },
        { status: 409 }
      );
    }
    
    if (video.status === 'completed') {
      return NextResponse.json(
        { error: 'Video has already been processed' },
        { status: 409 }
      );
    }
    
    await db.execute({
      sql: 'UPDATE videos SET status = ?, filter_mode = ?, subtitle_enabled = ?, aspect_ratio = ? WHERE id = ?',
      args: ['processing', filterMode, subtitleEnabled ? 1 : 0, aspectRatio, videoId],
    });
    
    console.log('Downloading video from R2...');
    checkTimeout();
    
    const fileExtension = (video.filename as string).split('.').pop() || 'mp4';
    const r2Key = `videos/${videoId}.${fileExtension}`;
    
    const tempDir = path.join(os.tmpdir(), `clipforge-${videoId}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    const videoPath = path.join(tempDir, `${videoId}.${fileExtension}`);
    
    // ストリーミングダウンロード（メモリ節約）
    await downloadFromR2ToFile(r2Key, videoPath);
    
    console.log(`Video saved to: ${videoPath}`);
    
    checkTimeout();
    
    // 動画のバリデーションとメタデータ取得
    console.log('Validating video...');
    const validation = await validateVideo(videoPath);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid video file');
    }
    
    // 動画の長さを取得してクレジットをチェック
    const metadata = await getVideoMetadata(videoPath);
    const videoDurationMinutes = Math.ceil(metadata.duration / 60); // 分単位（切り上げ）
    
    // クレジット残高を確認
    const userResult = await db.execute({
      sql: 'SELECT credits FROM users WHERE id = ?',
      args: [userId],
    });

    const credits = userResult.rows[0]?.credits || 0;

    if (credits < videoDurationMinutes) {
      // 処理状態を元に戻す
      await db.execute({
        sql: 'UPDATE videos SET status = ? WHERE id = ?',
        args: ['uploaded', videoId],
      });
      
      return NextResponse.json(
        { 
          error: `クレジットが不足しています。必要: ${videoDurationMinutes}クレジット、残高: ${credits}クレジット`,
          redirectUrl: '/credits'
        },
        { status: 402 } // Payment Required
      );
    }
    
    checkTimeout();
    
    console.log('Detecting kill scenes...');
    const killScenes = await detectKillScenes(videoPath, tempDir, checkTimeout);
    
    const filteredScenes = filterKillScenes(
      killScenes,
      filterMode as 'all' | 'medium' | 'highlight'
    );
    
    console.log(`Detected ${killScenes.length} kills, filtered to ${filteredScenes.length}`);
    
    // クリップ生成
    console.log('Generating clips...');
    const generatedClips = await generateAllClips(videoPath, filteredScenes, {
      subtitleEnabled,
      aspectRatio,
      videoId,
      tempDir,
    });
    
    // DBにクリップ情報を保存
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60; // 10分後
    
    for (let i = 0; i < generatedClips.length; i++) {
      const clip = generatedClips[i];
      const scene = filteredScenes[i];
      
      await db.execute({
        sql: `INSERT INTO clips (id, video_id, filename, timestamp, score, kill_type, r2_url, created_at, expires_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          clip.clipId,
          videoId,
          clip.filename,
          scene.timestamp,
          scene.score,
          scene.killType,
          clip.r2Key, // R2のキーを保存
          Math.floor(Date.now() / 1000),
          expiresAt,
        ],
      });
    }
    
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    
    // クレジットを消費
    await db.execute({
      sql: 'UPDATE users SET credits = credits - ? WHERE id = ?',
      args: [videoDurationMinutes, userId],
    });
    
    // 使用したクレジット数を記録
    await db.execute({
      sql: 'UPDATE videos SET credits_used = ? WHERE id = ?',
      args: [videoDurationMinutes, videoId],
    });
    
    await db.execute({
      sql: 'UPDATE videos SET status = ? WHERE id = ?',
      args: ['completed', videoId],
    });
    
    console.log(`✓ Processing completed for video ${videoId} (Credits used: ${videoDurationMinutes})`);
    
    return NextResponse.json({
      success: true,
      videoId,
      totalKills: killScenes.length,
      filteredKills: filteredScenes.length,
      generatedClips: generatedClips.length,
      creditsUsed: videoDurationMinutes,
      clips: generatedClips.map((clip, i) => ({
        clipId: clip.clipId,
        filename: clip.filename,
        timestamp: filteredScenes[i].timestamp,
        score: filteredScenes[i].score,
        killType: filteredScenes[i].killType,
      })),
    });
    
  } catch (error) {
    console.error('Process error:', error);
    
    // エラー時にステータスを更新を試みる（videoIdは既に取得済み）
    const videoIdForCleanup = videoId || requestBody?.videoId;
    
    if (videoIdForCleanup) {
      try {
        // エラー時は処理状態を元に戻す（クレジットは消費しない）
        await db.execute({
          sql: 'UPDATE videos SET status = ? WHERE id = ?',
          args: ['uploaded', videoIdForCleanup],
        });
      } catch (dbError) {
        console.error('Failed to update video status:', dbError);
      }
    }
    
    // 一時ファイルのクリーンアップを試みる
    try {
      const tempDir = path.join(os.tmpdir(), `clipforge-${videoIdForCleanup || 'unknown'}`);
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    } catch (cleanupError) {
      // 無視
    }
    
    // エラーメッセージを安全に返す
    const errorMessage = error instanceof Error 
      ? (error.message.includes('not found') || error.message.includes('File not found')
          ? '動画ファイルが見つかりませんでした'
          : '処理に失敗しました')
      : '処理に失敗しました';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

