'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface Package {
  name: string;
  credits: number;
  price: number;
  priceId: string;
  discount: string | null;
  popular?: boolean;
  features: string[];
}

export default function CreditPackages() {
  const [loading, setLoading] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // サーバーからPrice IDを取得
    fetch('/api/credit-packages')
      .then(res => res.json())
      .then(data => setPackages(data.packages))
      .catch(err => {
        console.error('Failed to fetch packages:', err);
        // フォールバック: デフォルト値を使用
        setPackages([
          {
            name: '入門',
            credits: 250,
            price: 250,
            priceId: 'price_xxxxx1',
            discount: null,
            features: ['250クレジット', '約4時間分の動画処理'],
          },
          {
            name: 'ライト',
            credits: 1000,
            price: 900,
            priceId: 'price_xxxxx2',
            discount: '10% OFF',
            features: ['1,000クレジット', '約16時間分の動画処理', 'おすすめ'],
          },
          {
            name: '標準',
            credits: 3000,
            price: 2700,
            priceId: 'price_xxxxx3',
            discount: '10% OFF',
            popular: true,
            features: ['3,000クレジット', '約50時間分の動画処理', '最も人気'],
          },
          {
            name: '大容量',
            credits: 10000,
            price: 8500,
            priceId: 'price_xxxxx4',
            discount: '15% OFF',
            features: ['10,000クレジット', '約166時間分の動画処理', '最大容量'],
          },
        ]);
      });
  }, []);

  const handlePurchase = async (priceId: string, packageName: string) => {
    // Price IDが無効な場合（デフォルト値の場合）
    if (priceId.startsWith('price_xxxxx')) {
      setError(`「${packageName}」パッケージのPrice IDが設定されていません。環境変数 STRIPE_PRICE_* を設定してください。`);
      return;
    }
    
    setLoading(priceId);
    setError(null);
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || '購入に失敗しました';
        
        // StripeのPrice IDが無効な場合のエラーメッセージ
        if (errorMessage.includes('No such price') || errorMessage.includes('resource_missing')) {
          throw new Error(`Price IDが無効です。Stripe Dashboardで商品を作成し、環境変数 STRIPE_PRICE_* に正しいPrice IDを設定してください。`);
        }
        
        throw new Error(errorMessage);
      }
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Checkout URLの取得に失敗しました');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      setError(error instanceof Error ? error.message : '購入に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-xl">❌</div>
            <div className="flex-1">
              <p className="text-red-900 font-bold mb-1">購入エラー</p>
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-red-600 text-sm underline"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {packages.map((pkg) => (
        <Card
          key={pkg.priceId}
          className={`relative ${
            pkg.popular ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200'
          }`}
        >
          {pkg.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              人気
            </div>
          )}
          
          <CardHeader>
            <CardTitle className="text-2xl">{pkg.name}</CardTitle>
            <div className="mt-4">
              <div className="text-4xl font-bold">¥{pkg.price.toLocaleString()}</div>
              {pkg.discount && (
                <div className="text-green-600 text-sm mt-1 font-medium">{pkg.discount}</div>
              )}
            </div>
            <CardDescription className="text-lg mt-2">
              {pkg.credits.toLocaleString()}クレジット
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <ul className="space-y-2 mb-6">
              {pkg.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button
              onClick={() => handlePurchase(pkg.priceId, pkg.name)}
              disabled={loading === pkg.priceId || pkg.priceId.startsWith('price_xxxxx')}
              className="w-full"
              size="lg"
              variant={pkg.popular ? 'default' : 'outline'}
            >
              {loading === pkg.priceId ? '処理中...' : pkg.priceId.startsWith('price_xxxxx') ? '設定が必要' : '購入する'}
            </Button>
            
            {pkg.priceId.startsWith('price_xxxxx') && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Price ID未設定
              </p>
            )}
          </CardContent>
        </Card>
        ))}
      </div>
    </div>
  );
}

