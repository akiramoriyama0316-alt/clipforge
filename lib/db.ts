import { createClient, Client } from '@libsql/client';

// ビルド時には環境変数が設定されていない可能性があるため、
// 実際に使用する際に初期化する
function getDbClient(): Client {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }
  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN is not set');
  }
  
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

// 遅延初期化: 実際に使用されるまで初期化しない
let dbInstance: Client | null = null;

export const db = new Proxy({} as Client, {
  get(_target, prop) {
    if (!dbInstance) {
      dbInstance = getDbClient();
    }
    const value = dbInstance[prop as keyof Client];
    if (typeof value === 'function') {
      return value.bind(dbInstance);
    }
    return value;
  },
});

export async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      credits INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  // 匿名ユーザーを作成（存在しない場合）
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, credits, created_at) VALUES (?, ?, ?, ?)`,
      args: ['anonymous', 'anonymous@clipforge.local', 0, Math.floor(Date.now() / 1000)],
    });
  } catch (error) {
    // 既に存在する場合は無視
    console.log('Anonymous user already exists or error:', error);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      duration INTEGER NOT NULL,
      status TEXT NOT NULL,
      filter_mode TEXT NOT NULL,
      subtitle_enabled INTEGER NOT NULL,
      aspect_ratio TEXT NOT NULL,
      credits_used INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      score INTEGER NOT NULL,
      kill_type TEXT,
      r2_url TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    )
  `);
}

