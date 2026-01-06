import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CreditPackages from '@/components/credit-packages';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';

export default async function CreditsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // 現在のクレジット残高を取得
  let credits = 0;
  try {
    const result = await db.execute({
      sql: 'SELECT credits FROM users WHERE id = ?',
      args: [userId],
    });
    credits = result.rows[0]?.credits || 0;
  } catch (error) {
    console.error('Failed to fetch credits:', error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              クレジットを購入
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              1クレジット = 動画1分の処理
            </p>
            <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-6 py-3 mt-4">
              <p className="text-sm text-gray-600">
                現在の残高: <span className="font-bold text-blue-600 text-lg">{credits.toLocaleString()}</span> クレジット
              </p>
            </div>
          </div>
          
          <CreditPackages />
          
          <Card className="mt-12">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">クレジットについて</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 1クレジットで動画1分の処理が可能です</li>
                <li>• クレジットは有効期限なしで使用できます</li>
                <li>• 処理に失敗した場合、クレジットは返却されます</li>
                <li>• クレジットの購入はStripeを通じて安全に処理されます</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

