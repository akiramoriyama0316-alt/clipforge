import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function cleanupOldTempFiles() {
  try {
    const tempRoot = os.tmpdir();
    const entries = await fs.readdir(tempRoot);
    const now = Date.now();
    
    for (const entry of entries) {
      if (entry.startsWith('clipforge-')) {
        const fullPath = path.join(tempRoot, entry);
        try {
          const stats = await fs.stat(fullPath);
          
          // 1時間以上古いディレクトリを削除
          if (now - stats.mtimeMs > 60 * 60 * 1000) {
            await fs.rm(fullPath, { recursive: true, force: true });
            console.log(`Cleaned up old temp dir: ${entry}`);
          }
        } catch (error) {
          // ファイルが既に削除されている場合は無視
          console.log(`Skipping ${entry}: ${error}`);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    // クリーンアップエラーは処理を続行
  }
}


