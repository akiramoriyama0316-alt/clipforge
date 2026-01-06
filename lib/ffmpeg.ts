import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

// ffmpegのパスを設定（環境変数またはシステムのffmpegを使用）
const getFfmpegPath = () => {
  // 環境変数で指定されている場合
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }
  
  // Windowsの場合
  if (process.platform === 'win32') {
    // システムにインストールされているffmpegを使用
    return 'ffmpeg';
  }
  
  // Linux/Macの場合
  return 'ffmpeg';
};

try {
  const ffmpegPath = getFfmpegPath();
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch (error) {
  console.warn('FFmpeg path not set, using system default:', error);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }
      
      const fps = videoStream.r_frame_rate 
        ? eval(videoStream.r_frame_rate) 
        : 30;
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: fps || 30,
      });
    });
  });
}

export async function validateVideo(videoPath: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const metadata = await getVideoMetadata(videoPath);
    
    // 基本チェック
    if (metadata.duration <= 0) {
      return { valid: false, error: 'Invalid duration' };
    }
    
    if (metadata.duration > 4 * 60 * 60) {
      return { valid: false, error: 'Video exceeds 4 hours' };
    }
    
    if (metadata.width === 0 || metadata.height === 0) {
      return { valid: false, error: 'Invalid resolution' };
    }
    
    return { valid: true };
    
  } catch (error) {
    return { valid: false, error: 'File is corrupted or unsupported' };
  }
}

export async function extractAudio(
  videoPath: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputPath)
      .audioCodec('libmp3lame')
      .noVideo()
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function extractFrame(
  videoPath: string,
  timestamp: number,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function extractFrames(
  videoPath: string,
  outputDir: string,
  interval: number = 1
): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });
  
  const metadata = await getVideoMetadata(videoPath);
  const duration = Math.floor(metadata.duration);
  
  const framePaths: string[] = [];
  
  for (let t = 0; t < duration; t += interval) {
    const framePath = path.join(outputDir, `frame_${String(t).padStart(6, '0')}.jpg`);
    await extractFrame(videoPath, t, framePath);
    framePaths.push(framePath);
  }
  
  return framePaths;
}

export async function cutVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function convertAspectRatio(
  inputPath: string,
  outputPath: string,
  aspectRatio: '16:9' | '9:16' | '1:1'
): Promise<string> {
  return new Promise((resolve, reject) => {
    let filter: string;
    
    switch (aspectRatio) {
      case '9:16':
        filter = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
        break;
      case '1:1':
        filter = 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080';
        break;
      case '16:9':
      default:
        filter = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080';
        break;
    }
    
    ffmpeg(inputPath)
      .videoFilters(filter)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export async function burnSubtitles(
  inputPath: string,
  outputPath: string,
  srtPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoFilters(`subtitles=${srtPath}:force_style='FontName=Noto Sans JP,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=2'`)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

