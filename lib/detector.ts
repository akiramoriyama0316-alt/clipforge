import path from 'path';
import fs from 'fs/promises';
import { extractFrames, getVideoMetadata } from './ffmpeg';
import sharp from 'sharp';

export interface KillScene {
  timestamp: number;
  score: number;
  killType: 'single' | 'double' | 'triple' | 'clutch' | null;
  framePath: string;
  confidence: number;
}

const TEMPLATE_DIR = path.join(process.cwd(), 'public', 'templates');

let killTemplate: Buffer | null = null;
let doubleKillTemplate: Buffer | null = null;
let tripleKillTemplate: Buffer | null = null;

export async function initTemplates() {
  try {
    const killPath = path.join(TEMPLATE_DIR, 'kill.png');
    const doubleKillPath = path.join(TEMPLATE_DIR, 'double_kill.png');
    const tripleKillPath = path.join(TEMPLATE_DIR, 'triple_kill.png');
    
    try {
      killTemplate = await fs.readFile(killPath);
      doubleKillTemplate = await fs.readFile(doubleKillPath);
      tripleKillTemplate = await fs.readFile(tripleKillPath);
      console.log('Templates loaded successfully');
    } catch (error) {
      console.warn('Template images not found. Using fallback detection method.');
      console.warn('Please add template images to public/templates/ for better accuracy.');
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

async function matchTemplate(
  framePath: string,
  templateBuffer: Buffer | null,
  threshold: number = 0.8
): Promise<{ matched: boolean; confidence: number }> {
  if (!templateBuffer) {
    return { matched: false, confidence: 0 };
  }

  try {
    const frame = await sharp(framePath).toBuffer();
    const template = await sharp(templateBuffer).toBuffer();
    
    const frameMetadata = await sharp(frame).metadata();
    const templateMetadata = await sharp(template).metadata();
    
    if (!frameMetadata.width || !frameMetadata.height || 
        !templateMetadata.width || !templateMetadata.height) {
      return { matched: false, confidence: 0 };
    }
    
    const frameData = await sharp(frame)
      .resize(frameMetadata.width, frameMetadata.height)
      .raw()
      .toBuffer();
    
    const templateData = await sharp(template)
      .resize(templateMetadata.width, templateMetadata.height)
      .raw()
      .toBuffer();
    
    const similarity = calculateSimilarity(frameData, templateData);
    const confidence = similarity / 100;
    
    return {
      matched: confidence >= threshold,
      confidence,
    };
  } catch (error) {
    console.error('Template matching error:', error);
    return { matched: false, confidence: 0 };
  }
}

function calculateSimilarity(buffer1: Buffer, buffer2: Buffer): number {
  if (buffer1.length !== buffer2.length) {
    return 0;
  }
  
  let sumSquaredDiff = 0;
  for (let i = 0; i < buffer1.length; i++) {
    const diff = buffer1[i] - buffer2[i];
    sumSquaredDiff += diff * diff;
  }
  
  const mse = sumSquaredDiff / buffer1.length;
  const maxPixelValue = 255;
  const similarity = 100 * (1 - Math.sqrt(mse) / maxPixelValue);
  
  return Math.max(0, Math.min(100, similarity));
}

async function detectKillInFrame(framePath: string): Promise<{ 
  isKill: boolean; 
  killType: string; 
  confidence: number 
}> {
  try {
    const frameMetadata = await sharp(framePath).metadata();
    
    if (!frameMetadata.width || !frameMetadata.height) {
      return { isKill: false, killType: 'none', confidence: 0 };
    }
    
    const width = frameMetadata.width;
    const height = frameMetadata.height;
    
    const killRegionPath = path.join(path.dirname(framePath), 'kill_region_' + path.basename(framePath));
    
    await sharp(framePath)
      .extract({
        left: Math.floor(width * 0.65),
        top: Math.floor(height * 0.05),
        width: Math.floor(width * 0.30),
        height: Math.floor(height * 0.20),
      })
      .toFile(killRegionPath);
    
    let bestMatch = { isKill: false, killType: 'none', confidence: 0 };
    
    if (tripleKillTemplate) {
      const match = await matchTemplate(killRegionPath, tripleKillTemplate, 0.75);
      if (match.matched && match.confidence > bestMatch.confidence) {
        bestMatch = { isKill: true, killType: 'triple', confidence: match.confidence };
      }
    }
    
    if (doubleKillTemplate && bestMatch.killType !== 'triple') {
      const match = await matchTemplate(killRegionPath, doubleKillTemplate, 0.75);
      if (match.matched && match.confidence > bestMatch.confidence) {
        bestMatch = { isKill: true, killType: 'double', confidence: match.confidence };
      }
    }
    
    if (killTemplate && bestMatch.killType === 'none') {
      const match = await matchTemplate(killRegionPath, killTemplate, 0.80);
      if (match.matched && match.confidence > bestMatch.confidence) {
        bestMatch = { isKill: true, killType: 'single', confidence: match.confidence };
      }
    }
    
    await fs.unlink(killRegionPath).catch(() => {});
    
    return bestMatch;
  } catch (error) {
    console.error('Kill detection error:', error);
    return { isKill: false, killType: 'none', confidence: 0 };
  }
}

function calculateScore(killType: string, frameIndex: number, totalFrames: number): number {
  let score = 10;
  
  switch (killType) {
    case 'triple':
      score += 80;
      break;
    case 'double':
      score += 50;
      break;
    case 'clutch':
      score += 40;
      break;
  }
  
  if (frameIndex > totalFrames * 0.8) {
    score += 20;
  }
  
  return score;
}

function normalizeKillType(killType: string): KillScene['killType'] {
  if (killType === 'triple') return 'triple';
  if (killType === 'double') return 'double';
  if (killType === 'clutch') return 'clutch';
  return 'single';
}

export async function detectKillScenes(
  videoPath: string,
  tempDir: string,
  checkTimeout?: () => void
): Promise<KillScene[]> {
  await initTemplates();
  
  const frameDir = path.join(tempDir, 'frames');
  console.log('Extracting frames...');
  const framePaths = await extractFrames(videoPath, frameDir, 1);
  console.log(`Extracted ${framePaths.length} frames`);
  
  const killScenes: KillScene[] = [];
  let lastKillFrame = -10;
  
  for (let i = 0; i < framePaths.length; i++) {
    // タイムアウトチェック（10フレームごと）
    if (checkTimeout && i % 10 === 0) {
      checkTimeout();
    }
    
    const framePath = framePaths[i];
    
    if (i - lastKillFrame < 3) {
      continue;
    }
    
    const detection = await detectKillInFrame(framePath);
    
    if (detection.isKill) {
      const score = calculateScore(detection.killType, i, framePaths.length);
      
      killScenes.push({
        timestamp: i,
        score,
        killType: normalizeKillType(detection.killType),
        framePath,
        confidence: detection.confidence,
      });
      
      lastKillFrame = i;
      
      console.log(`✓ Kill detected at ${i}s: ${detection.killType} (score: ${score}, confidence: ${detection.confidence.toFixed(2)})`);
    }
  }
  
  console.log(`Total kills detected: ${killScenes.length}`);
  
  return killScenes;
}

export function filterKillScenes(
  scenes: KillScene[],
  mode: 'all' | 'medium' | 'highlight'
): KillScene[] {
  let threshold: number;
  
  switch (mode) {
    case 'all':
      threshold = 10;
      break;
    case 'medium':
      threshold = 50;
      break;
    case 'highlight':
      threshold = 80;
      break;
  }
  
  const filtered = scenes.filter(scene => scene.score >= threshold);
  console.log(`Filtered: ${scenes.length} → ${filtered.length} (mode: ${mode}, threshold: ${threshold})`);
  
  return filtered;
}

