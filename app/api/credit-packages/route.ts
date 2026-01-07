import { NextResponse } from 'next/server';

// サーバーサイドで環境変数からPrice IDを取得して返す
export async function GET() {
  const packages = [
    {
      name: '入門',
      credits: 250,
      price: 250,
      priceId: process.env.STRIPE_PRICE_BASIC || 'price_xxxxx1',
      discount: null,
      features: ['250クレジット', '約4時間分の動画処理'],
    },
    {
      name: 'ライト',
      credits: 1000,
      price: 900,
      priceId: process.env.STRIPE_PRICE_LIGHT || 'price_xxxxx2',
      discount: '10% OFF',
      features: ['1,000クレジット', '約16時間分の動画処理', 'おすすめ'],
    },
    {
      name: '標準',
      credits: 3000,
      price: 2700,
      priceId: process.env.STRIPE_PRICE_STANDARD || 'price_xxxxx3',
      discount: '10% OFF',
      popular: true,
      features: ['3,000クレジット', '約50時間分の動画処理', '最も人気'],
    },
    {
      name: '大容量',
      credits: 10000,
      price: 8500,
      priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_xxxxx4',
      discount: '15% OFF',
      features: ['10,000クレジット', '約166時間分の動画処理', '最大容量'],
    },
  ];

  return NextResponse.json({ packages });
}


