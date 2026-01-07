import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

// 動的レンダリングを強制（ビルド時にデータベースにアクセスしないようにする）
export const dynamic = 'force-dynamic';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
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
    credits = Number(result.rows[0]?.credits) || 0;
  } catch (error) {
    console.error('Failed to fetch credits:', error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                
                <h1 className="text-3xl font-bold mb-2">購入完了！</h1>
                <p className="text-gray-600">
                  クレジットが正常に追加されました
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <p className="text-sm text-gray-600 mb-1">現在の残高</p>
                <p className="text-4xl font-bold text-blue-600">
                  {credits.toLocaleString()} <span className="text-lg">クレジット</span>
                </p>
              </div>
              
              <div className="space-y-3">
                <Link href="/" className="block">
                  <Button className="w-full" size="lg">
                    動画をアップロードする
                  </Button>
                </Link>
                <Link href="/credits" className="block">
                  <Button variant="outline" className="w-full">
                    さらに購入する
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}


