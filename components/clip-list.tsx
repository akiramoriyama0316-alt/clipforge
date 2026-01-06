'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Home } from 'lucide-react';

interface Clip {
  id: string;
  filename: string;
  timestamp: number;
  score: number;
  killType: string | null;
  r2_url: string;
}

interface ClipListProps {
  clips: Clip[];
  videoId: string;
}

export default function ClipList({ clips, videoId }: ClipListProps) {
  const router = useRouter();
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  
  const toggleClip = (clipId: string) => {
    const newSelection = new Set(selectedClips);
    if (newSelection.has(clipId)) {
      newSelection.delete(clipId);
    } else {
      newSelection.add(clipId);
    }
    setSelectedClips(newSelection);
  };
  
  const selectAll = () => {
    if (selectedClips.size === clips.length) {
      setSelectedClips(new Set());
    } else {
      setSelectedClips(new Set(clips.map(c => c.id)));
    }
  };
  
  const downloadClip = async (clipId: string) => {
    try {
      const response = await fetch(`/api/download/${clipId}`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // リダイレクトURLを取得
      const url = response.url;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      alert('ダウンロードに失敗しました');
    }
  };
  
  const downloadSelected = async () => {
    setDownloading(true);
    
    for (const clipId of selectedClips) {
      await downloadClip(clipId);
      // ブラウザの連続ダウンロード制限を回避
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setDownloading(false);
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  
  const getKillTypeLabel = (type: string | null) => {
    switch (type) {
      case 'triple': return 'トリプルキル';
      case 'double': return 'ダブルキル';
      case 'clutch': return 'クラッチ';
      default: return 'キル';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">
          生成されたクリップ ({clips.length}個)
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={selectAll} size="sm">
            {selectedClips.size === clips.length ? '全て解除' : '全て選択'}
          </Button>
          <Button 
            onClick={downloadSelected}
            disabled={selectedClips.size === 0 || downloading}
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            選択をダウンロード ({selectedClips.size})
          </Button>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ クリップは10分後に自動削除されます。お早めにダウンロードしてください。
        </p>
      </div>
      
      <div className="grid gap-4">
        {clips.map((clip) => (
          <div 
            key={clip.id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedClips.has(clip.id)}
                  onChange={() => toggleClip(clip.id)}
                  className="h-5 w-5"
                />
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">
                      {formatTime(clip.timestamp)}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {getKillTypeLabel(clip.killType)}
                    </span>
                    <span className="text-sm text-gray-600">
                      スコア: {clip.score}点
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {clip.filename}
                  </p>
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={() => downloadClip(clip.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

