import UploadForm from '@/components/upload-form';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Video, Zap, Download } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* ヒーローセクション */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ClipForge
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            APEX配信から、キルシーンを自動で切り抜き
          </p>
          <p className="text-sm text-gray-500">
            動画をアップロードするだけで、キルシーンを自動検出してクリップを生成します
          </p>
        </div>

        {/* 機能紹介 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">自動検出</h3>
              <p className="text-sm text-gray-600">
                キルシーンを自動で検出し、シングル・ダブル・トリプルキルを識別
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">簡単操作</h3>
              <p className="text-sm text-gray-600">
                動画をアップロードするだけで、数分でクリップが完成
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">高品質出力</h3>
              <p className="text-sm text-gray-600">
                字幕追加、アスペクト比変換に対応した高品質なクリップ
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* アップロードフォーム */}
        <div className="max-w-2xl mx-auto">
          <UploadForm />
        </div>
      </div>
    </main>
  );
}
