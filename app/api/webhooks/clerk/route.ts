import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db, initDatabase } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    // データベースを初期化
    await initDatabase();
    
    const { id, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address || '';

    // DBにユーザーを作成
    try {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO users (id, email, credits, created_at) VALUES (?, ?, ?, ?)',
        args: [id, email, 0, Math.floor(Date.now() / 1000)],
      });

      console.log(`User created: ${id} (${email})`);
    } catch (error) {
      console.error('Failed to create user in DB:', error);
      // エラーでも続行（既に存在する可能性がある）
    }
  }

  return new Response('', { status: 200 });
}

