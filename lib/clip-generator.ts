import path from 'path';
import fs from 'fs/promises';
import { cutVideo, convertAspectRatio, burnSubtitles, extractAudio } from './ffmpeg';
import { transcribeAudio } from './groq';
import { uploadToR2, generateUniqueKey } from './r2';
import { KillScene } from './detector';

export interface GeneratedClip {
  clipId: string;
  filename: string;
  r2Key: string;
  r2Url: string;
  localPath: string;
}

/**
 * SRT形式の字幕を生成
 */
function generateSRT(text: string, duration: number): string {
  // 簡易版: 全体に字幕を表示
  // TODO: より細かいタイムスタンプ分割
  
  const lines = text.split(/[。！？\n]/).filter(l => l.trim());
  if (lines.length === 0) {
    // 空の場合は全体に表示
    return `1\n00:00:00,000 --> ${formatSRTTime(duration)}\n${text}\n\n`;
  }
  
  const timePerLine = duration / lines.length;
  
  let srt = '';
  
  lines.forEach((line, i) => {
    const startTime = Math.floor(i * timePerLine);
    const endTime = Math.floor((i + 1) * timePerLine);
    
    srt += `${i + 1}\n`;
    srt += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srt += `${line.trim()}\n\n`;
  });
  
  return srt;
}

/**
 * SRT時間フォーマット (00:00:05,000)
 */
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * 1つのキルシーンからクリップを生成
 */
export async function generateClip(
  videoPath: string,
  scene: KillScene,
  options: {
    subtitleEnabled: boolean;
    aspectRatio: '16:9' | '9:16' | '1:1';
    videoId: string;
    tempDir: string;
  }
): Promise<GeneratedClip> {
  const { subtitleEnabled, aspectRatio, videoId, tempDir } = options;
  
  // クリップID生成
  const clipId = `clip_${scene.timestamp}_${Date.now()}`;
  const clipFilename = `${clipId}.mp4`;
  
  console.log(`Generating clip: ${clipFilename}`);
  
  // ステップ1: シーンを切り出し（前10秒、後5秒）
  const startTime = Math.max(0, scene.timestamp - 10);
  const duration = 15; // 10秒前 + 5秒後
  
  const cutPath = path.join(tempDir, `${clipId}_cut.mp4`);
  await cutVideo(videoPath, cutPath, startTime, duration);
  console.log(`✓ Cut video: ${startTime}s - ${startTime + duration}s`);
  
  let finalPath = cutPath;
  
  // ステップ2: 字幕を追加（有効な場合）
  if (subtitleEnabled) {
    try {
      console.log('Transcribing audio...');
      
      // 音声を抽出
      const audioPath = path.join(tempDir, `${clipId}.mp3`);
      await extractAudio(cutPath, audioPath);
      
      // Groq APIで文字起こし
      const audioBuffer = await fs.readFile(audioPath);
      const transcription = await transcribeAudio(audioBuffer, `${clipId}.mp3`);
      console.log(`Transcription: ${transcription.substring(0, 100)}...`);
      
      // SRT生成
      const srtContent = generateSRT(transcription, duration);
      const srtPath = path.join(tempDir, `${clipId}.srt`);
      await fs.writeFile(srtPath, srtContent, 'utf-8');
      
      // 字幕を焼き込み
      const subtitledPath = path.join(tempDir, `${clipId}_subtitled.mp4`);
      await burnSubtitles(cutPath, subtitledPath, srtPath);
      
      finalPath = subtitledPath;
      console.log('✓ Subtitles added');
      
      // 一時ファイル削除
      await fs.unlink(audioPath).catch(() => {});
      await fs.unlink(srtPath).catch(() => {});
      
    } catch (error) {
      console.error('Subtitle generation failed:', error);
      // 字幕なしで続行
    }
  }
  
  // ステップ3: アスペクト比を変換
  if (aspectRatio !== '16:9') {
    const convertedPath = path.join(tempDir, `${clipId}_converted.mp4`);
    await convertAspectRatio(finalPath, convertedPath, aspectRatio);
    
    // 元のファイルを削除
    if (finalPath !== cutPath) {
      await fs.unlink(finalPath).catch(() => {});
    }
    
    finalPath = convertedPath;
    console.log(`✓ Converted to ${aspectRatio}`);
  }
  
  // ステップ4: R2にアップロード
  const r2Key = generateUniqueKey(clipFilename, `clips/${videoId}`);
  const fileBuffer = await fs.readFile(finalPath);
  
  await uploadToR2(r2Key, fileBuffer, 'video/mp4');
  console.log(`✓ Uploaded to R2: ${r2Key}`);
  
  // R2のURL生成
  const r2Url = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${r2Key}`;
  
  // 一時ファイル削除
  await fs.unlink(cutPath).catch(() => {});
  if (finalPath !== cutPath) {
    await fs.unlink(finalPath).catch(() => {});
  }
  
  return {
    clipId,
    filename: clipFilename,
    r2Key,
    r2Url,
    localPath: finalPath,
  };
}

/**
 * 全てのキルシーンからクリップを生成
 */
export async function generateAllClips(
  videoPath: string,
  scenes: KillScene[],
  options: {
    subtitleEnabled: boolean;
    aspectRatio: '16:9' | '9:16' | '1:1';
    videoId: string;
    tempDir: string;
  }
): Promise<GeneratedClip[]> {
  console.log(`Generating ${scenes.length} clips...`);
  
  const clips: GeneratedClip[] = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`[${i + 1}/${scenes.length}] Processing scene at ${scene.timestamp}s...`);
    
    try {
      const clip = await generateClip(videoPath, scene, options);
      clips.push(clip);
    } catch (error) {
      console.error(`Failed to generate clip at ${scene.timestamp}s:`, error);
      // エラーがあってもスキップして続行
    }
  }
  
  console.log(`✓ Generated ${clips.length}/${scenes.length} clips`);
  
  return clips;
}

