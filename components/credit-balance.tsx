'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';

export default function CreditBalance() {
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/credits');
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
    
    // 定期的に更新（30秒ごと）
    const interval = setInterval(fetchCredits, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  if (loading || credits === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Coins className="h-4 w-4" />
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Coins className="h-4 w-4 text-yellow-500" />
        <span className="text-gray-600">残高:</span>
        <span className="font-bold text-gray-900">{credits.toLocaleString()}</span>
        <span className="text-gray-600">クレジット</span>
      </div>
      
      <Link href="/credits">
        <Button size="sm" variant="outline">
          購入
        </Button>
      </Link>
    </div>
  );
}

