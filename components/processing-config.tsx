'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Home } from 'lucide-react';

type FilterMode = 'all' | 'medium' | 'highlight';
type AspectRatio = '16:9' | '9:16' | '1:1';

interface ProcessingConfigProps {
  videoId: string;
  onBack: () => void;
}

export default function ProcessingConfig({ videoId, onBack }: ProcessingConfigProps) {
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreditInsufficient, setIsCreditInsufficient] = useState(false);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processing-config.tsx:useEffect',message:'ProcessingConfig mounted',data:{videoId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  }, [videoId]);
  // #endregion

  const handleStartProcessing = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processing-config.tsx:handleStartProcessing',message:'Processing start clicked',data:{videoId,filterMode,subtitleEnabled,aspectRatio},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    setIsProcessing(true);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processing-config.tsx:handleStartProcessing',message:'Calling process API',data:{videoId,filterMode,subtitleEnabled,aspectRatio},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          filterMode,
          subtitleEnabled,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // クレジット不足の場合は特別なエラーとして扱う
        if (response.status === 402) {
          throw new Error(`CREDIT_INSUFFICIENT:${errorData.error || 'クレジットが不足しています'}`);
        }
        
        throw new Error(errorData.error || '処理の開始に失敗しました');
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processing-config.tsx:handleStartProcessing',message:'Process API success, navigating to processing page',data:{videoId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      router.push(`/processing/${videoId}`);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processing-config.tsx:handleStartProcessing',message:'Processing start error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Processing start error:', error);
      
      const errorMessage = error instanceof Error ? error.message : '処理の開始に失敗しました';
      
      // クレジット不足の場合は特別な処理
      if (errorMessage.startsWith('CREDIT_INSUFFICIENT:')) {
        setIsCreditInsufficient(true);
        setError(errorMessage.replace('CREDIT_INSUFFICIENT:', ''));
      } else {
        setError(errorMessage);
      }
      
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          disabled={isProcessing}
        >
          <Home className="w-4 h-4 mr-2" />
          ホーム
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>処理設定</CardTitle>
          <CardDescription>
            {isProcessing 
              ? '処理中です。設定を変更することはできません。'
              : '動画の処理方法を選択してください'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* フィルタリングモード */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">フィルタリングモード</Label>
            <RadioGroup
              value={filterMode}
              onValueChange={(value) => setFilterMode(value as FilterMode)}
              disabled={isProcessing}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">全部</div>
                    <div className="text-sm text-gray-500">
                      スコア10点以上の全キルシーンを検出
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">中間</div>
                    <div className="text-sm text-gray-500">
                      スコア50点以上の派手なシーン
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="highlight" id="highlight" />
                <Label htmlFor="highlight" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">派手のみ</div>
                    <div className="text-sm text-gray-500">
                      スコア80点以上の超ハイライトのみ
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 字幕設定 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">字幕設定</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="subtitle"
                checked={subtitleEnabled}
                onCheckedChange={(checked) => setSubtitleEnabled(checked === true)}
                disabled={isProcessing}
              />
              <Label htmlFor="subtitle" className="font-normal cursor-pointer">
                字幕を追加する（Groq Whisper APIで文字起こし）
              </Label>
            </div>
          </div>

          {/* アスペクト比 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">アスペクト比</Label>
            <RadioGroup
              value={aspectRatio}
              onValueChange={(value) => setAspectRatio(value as AspectRatio)}
              disabled={isProcessing}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16:9" id="16:9" />
                <Label htmlFor="16:9" className="font-normal cursor-pointer">
                  16:9（オリジナル）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="9:16" id="9:16" />
                <Label htmlFor="9:16" className="font-normal cursor-pointer">
                  9:16（ショート）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1:1" id="1:1" />
                <Label htmlFor="1:1" className="font-normal cursor-pointer">
                  1:1（正方形）
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 処理開始ボタン */}
          <Button
            onClick={handleStartProcessing}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? '処理を開始しています...' : '処理開始'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

