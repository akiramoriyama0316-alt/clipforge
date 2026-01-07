import Stripe from 'stripe';

// ビルド時には環境変数が設定されていない可能性があるため、
// 実際に使用する際にチェックする
function getStripeInstance(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });
}

// 遅延初期化: 実際に使用されるまで初期化しない
let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!stripeInstance) {
      stripeInstance = getStripeInstance();
    }
    const value = stripeInstance[prop as keyof Stripe];
    if (typeof value === 'function') {
      return value.bind(stripeInstance);
    }
    return value;
  },
});


