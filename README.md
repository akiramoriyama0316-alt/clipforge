# ClipForge

APEX配信からキルシーンを自動で切り抜きするアプリケーション

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. FFmpegのインストール

FFmpegをシステムにインストールする必要があります：

**Windows:**
- [FFmpeg公式サイト](https://ffmpeg.org/download.html)からダウンロード
- または `choco install ffmpeg` (Chocolatey使用時)
- または `winget install ffmpeg` (Windows Package Manager使用時)

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg  # Ubuntu/Debian
sudo yum install ffmpeg      # CentOS/RHEL
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Clerk認証
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Stripe決済
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs (Stripe Dashboardで作成したPrice IDを設定)
STRIPE_PRICE_BASIC=price_xxxxx1
STRIPE_PRICE_LIGHT=price_xxxxx2
STRIPE_PRICE_STANDARD=price_xxxxx3
STRIPE_PRICE_PREMIUM=price_xxxxx4

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Turso Database
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token

# Cloudflare R2
R2_ENDPOINT=your_r2_endpoint
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name

# Groq API (字幕機能用)
GROQ_API_KEY=your_groq_api_key

# FFmpeg (オプション - システムにインストールされていない場合)
FFMPEG_PATH=C:\path\to\ffmpeg.exe  # Windowsの場合
```

**環境変数の取得方法:**

1. **Clerk認証:**
   - https://clerk.com でアカウント作成
   - Dashboard → API Keys から取得
   - Webhooks → Add endpoint → `user.created` イベントを選択 → Secretを取得

2. **Stripe決済:**
   - https://stripe.com/jp でアカウント作成
   - Dashboard → Developers → API keys から取得
   - Products → Add product で4つの商品を作成（価格設定）
   - Webhooks → Add endpoint → `checkout.session.completed` イベントを選択 → Secretを取得

### 4. データベースの初期化

```bash
# ブラウザでアクセス
curl http://localhost:3001/api/init-db
```

またはブラウザで `http://localhost:3001/api/init-db` にアクセス

### 5. テンプレート画像の追加（オプション）

キルシーン検出の精度を向上させるため、以下の画像を`public/templates/`に追加してください：

- `kill.png` - シングルキルのテンプレート
- `double_kill.png` - ダブルキルのテンプレート
- `triple_kill.png` - トリプルキルのテンプレート

テンプレート画像がない場合でも動作しますが、検出精度が低下する可能性があります。

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3001](http://localhost:3001) を開きます。

## 機能

- 動画アップロード（MP4、MOV、AVI形式、最大5GB）
- キルシーン自動検出
- フィルタリングモード（全部/中間/派手のみ）
- アスペクト比変換（16:9/9:16/1:1）
- 字幕追加（Groq Whisper API）

## トラブルシューティング

### FFmpegが見つからないエラー

システムにFFmpegがインストールされていることを確認してください：

```bash
ffmpeg -version
```

インストールされていない場合は、上記の「FFmpegのインストール」セクションを参照してください。

### テンプレート画像が見つからない警告

これは正常な動作です。テンプレート画像がない場合でも動作しますが、検出精度が低下する可能性があります。

### データベースエラー

`/api/init-db`にアクセスしてデータベースを初期化してください。
