import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

// クレジット数をPrice IDから取得するマッピング
// 環境変数から取得
function getPriceToCreditsMapping(): Record<string, number> {
  return {
    [process.env.STRIPE_PRICE_BASIC || 'price_xxxxx1']: 250,   // 入門: 250クレジット
    [process.env.STRIPE_PRICE_LIGHT || 'price_xxxxx2']: 1000,  // ライト: 1,000クレジット
    [process.env.STRIPE_PRICE_STANDARD || 'price_xxxxx3']: 3000,  // 標準: 3,000クレジット
    [process.env.STRIPE_PRICE_PREMIUM || 'price_xxxxx4']: 10000, // 大容量: 10,000クレジット
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // 支払い成功時にクレジットを付与
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    
    if (!userId) {
      console.error('No userId in session metadata');
      return NextResponse.json({ error: 'No userId' }, { status: 400 });
    }

    try {
      // Line itemsからPrice IDを取得
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (!priceId) {
        console.error('No price ID found');
        return NextResponse.json({ error: 'No price ID' }, { status: 400 });
      }

      // クレジット数を取得
      const PRICE_TO_CREDITS = getPriceToCreditsMapping();
      const credits = PRICE_TO_CREDITS[priceId];

      if (!credits) {
        console.error('Unknown price ID:', priceId);
        // Price IDがマッピングにない場合、Stripeから直接取得を試みる
        const price = await stripe.prices.retrieve(priceId);
        // メタデータからクレジット数を取得するか、デフォルト値を設定
        const metadataCredits = price.metadata?.credits;
        if (metadataCredits) {
          const creditsToAdd = parseInt(metadataCredits, 10);
          await db.execute({
            sql: 'UPDATE users SET credits = credits + ? WHERE id = ?',
            args: [creditsToAdd, userId],
          });
          console.log(`Added ${creditsToAdd} credits to user ${userId} (from metadata)`);
          return NextResponse.json({ received: true });
        }
        return NextResponse.json({ error: 'Unknown price ID' }, { status: 400 });
      }

      // クレジットを付与
      await db.execute({
        sql: 'UPDATE users SET credits = credits + ? WHERE id = ?',
        args: [credits, userId],
      });

      console.log(`Added ${credits} credits to user ${userId}`);
    } catch (error) {
      console.error('Failed to add credits:', error);
      return NextResponse.json(
        { error: 'Failed to add credits' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}

