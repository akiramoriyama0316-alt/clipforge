'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import ClipList from '@/components/clip-list';
import { Home, RefreshCw } from 'lucide-react';

interface Clip {
  id: string;
  timestamp: number;
  score: number;
  killType: string | null;
  filename: string;
  r2_url: string;
}

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  
  const [status, setStatus] = useState<string>('loading');
  const [clips, setClips] = useState<Clip[]>([]);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${videoId}`);
        if (!response.ok) {
          console.error('Failed to fetch status');
          return;
        }
        
        const data = await response.json();
        setStatus(data.status);
        
        if (data.status === 'completed') {
          setClips(data.clips || []);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [videoId]);
  
  // 処理中はブラウザの戻るボタンやナビゲーションを防ぐ
  useEffect(() => {
    if (status === 'processing') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [status]);
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {status === 'processing' ? '処理中...' : 
               status === 'completed' ? '処理完了！' :
               status === 'failed' ? '処理失敗' :
               '読み込み中...'}
            </h1>
            <p className="text-gray-600">
              {status === 'processing' ? 'キルシーンを検出中...' :
               status === 'completed' ? '検出が完了しました' :
               status === 'failed' ? '処理中にエラーが発生しました' :
               '処理状況を確認中...'}
            </p>
          </div>
          
          {status === 'processing' && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-lg font-medium mb-2">動画を解析しています...</p>
                  <p className="text-sm text-gray-500 mb-4">この処理には数分かかる場合があります</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <p className="text-sm text-blue-800">
                      ⚠️ 処理中は設定を変更できません。処理が完了するまでお待ちください。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {status === 'completed' && clips.length > 0 && (
            <div className="space-y-6">
              <ClipList clips={clips} videoId={videoId} />
              <div className="text-center">
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="flex items-center space-x-2 mx-auto"
                >
                  <Home className="h-4 w-4" />
                  <span>ホームに戻る</span>
                </Button>
              </div>
            </div>
          )}
          
          {status === 'completed' && clips.length === 0 && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2 text-gray-900">クリップが見つかりませんでした</p>
                  <p className="text-sm text-gray-600 mb-6">
                    キルシーンが検出されませんでした。別の動画をお試しください。
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => router.push('/')}
                      className="flex items-center space-x-2"
                    >
                      <Home className="h-4 w-4" />
                      <span>ホームに戻る</span>
                    </Button>
                    <Button
                      onClick={() => router.refresh()}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>再読み込み</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {status === 'failed' && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="text-lg font-medium mb-2 text-red-600">処理に失敗しました</p>
                  <p className="text-sm text-gray-600 mb-6">
                    もう一度お試しください。問題が続く場合は、サポートにお問い合わせください。
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => router.push('/')}
                      className="flex items-center space-x-2"
                    >
                      <Home className="h-4 w-4" />
                      <span>ホームに戻る</span>
                    </Button>
                    <Button
                      onClick={() => router.refresh()}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>再試行</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

