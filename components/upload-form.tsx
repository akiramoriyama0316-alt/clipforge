'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/utils';
import ProcessingConfig from './processing-config';
import { Upload, X, FileVideo } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error' | 'credit_insufficient';

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:useEffect',message:'Component mounted',data:{uploadState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, []);
  // #endregion

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  const maxSize = 5 * 1024 * 1024 * 1024; // 5GB（10GB対応準備中）

  const validateFile = (file: File): string | null => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:validateFile',message:'File validation started',data:{fileName:file.name,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!allowedTypes.includes(file.type)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:validateFile',message:'Validation failed: invalid type',data:{fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return 'サポートされていないファイル形式です。MP4、MOV、AVIのみ対応しています。';
    }
    if (file.size > maxSize) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:validateFile',message:'Validation failed: file too large',data:{fileSize:file.size,maxSize},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return 'ファイルサイズは5GB以下にしてください（現在10GB対応準備中）';
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:validateFile',message:'Validation passed',data:{fileName:file.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setUploadState('idle');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:handleUpload',message:'Upload started',data:{fileName:selectedFile.name,fileSize:selectedFile.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    setUploadState('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<{ videoId: string }>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:xhr:load',message:'XHR load event',data:{status:xhr.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:xhr:load',message:'Upload success',data:{videoId:response.videoId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            resolve(response);
          } else {
            let errorResponse;
            try {
              errorResponse = JSON.parse(xhr.responseText);
            } catch {
              errorResponse = { error: 'アップロードに失敗しました' };
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:xhr:load',message:'Upload failed',data:{status:xhr.status,error:errorResponse.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            // クレジット不足の場合は特別なエラーとして扱う
            if (xhr.status === 402) {
              reject(new Error(`CREDIT_INSUFFICIENT:${errorResponse.error || 'クレジットが不足しています'}`));
              return;
            }
            
            reject(new Error(errorResponse.error || 'アップロードに失敗しました'));
          }
        });

        xhr.addEventListener('error', () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:xhr:error',message:'Network error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          reject(new Error('ネットワークエラーが発生しました'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      const result = await uploadPromise;
      setVideoId(result.videoId);
      setUploadState('uploaded');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:handleUpload',message:'Upload completed, transitioning to config',data:{videoId:result.videoId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d97c881-2979-476e-b15b-ef88cb7747c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-form.tsx:handleUpload',message:'Upload error caught',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      const errorMessage = err instanceof Error ? err.message : 'アップロードに失敗しました';
      
      // クレジット不足の場合は特別な処理
      if (errorMessage.startsWith('CREDIT_INSUFFICIENT:')) {
        const creditError = errorMessage.replace('CREDIT_INSUFFICIENT:', '');
        setError(creditError);
        setUploadState('credit_insufficient');
      } else {
        setError(errorMessage);
        setUploadState('error');
      }
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setError(null);
    setVideoId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  if (uploadState === 'uploaded' && videoId) {
    return (
      <ProcessingConfig
        videoId={videoId}
        onBack={handleReset}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardContent>
        <div className="space-y-6">
          {/* ファイル選択エリア */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {isDragging
                    ? 'ここにファイルをドロップ'
                    : selectedFile
                      ? selectedFile.name
                      : 'クリックまたはドラッグ&ドロップでファイルを選択'
                  }
                </p>
                {selectedFile && (
                  <p className="text-sm text-gray-500 mt-2">
                    {formatFileSize(selectedFile.size)}
                  </p>
                )}
                {!selectedFile && (
                  <p className="text-sm text-gray-500 mt-2">
                    MP4、MOV、AVI形式（最大5GB、最大4時間）
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 選択されたファイル情報 */}
          {selectedFile && uploadState === 'idle' && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileVideo className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* クレジット不足エラー */}
          {uploadState === 'credit_insufficient' && error && (
            <div className="mt-4 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <p className="text-yellow-900 font-bold text-lg mb-2">クレジットが不足しています</p>
                  <p className="text-yellow-800 text-sm mb-4">{error}</p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => router.push('/credits')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      クレジットを購入する
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* その他のエラーメッセージ */}
          {uploadState === 'error' && error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* アップロード進捗 */}
          {uploadState === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">アップロード中...</span>
                <span className="text-gray-900 font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* アップロードボタン */}
          {selectedFile && uploadState === 'idle' && (
            <Button
              onClick={handleUpload}
              className="w-full"
              size="lg"
            >
              アップロード開始
            </Button>
          )}

          {uploadState === 'error' && (
            <div className="space-y-2">
              <Button
                onClick={handleUpload}
                className="w-full"
              >
                再試行
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
              >
                ホームに戻る
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

