# Cloudflare Pages へのデプロイ手順

## 前提条件
- Cloudflareアカウントが必要
- Node.js 18以上がインストールされている
- npm または yarn がインストールされている

## セットアップ

### 1. Cloudflare CLIのインストール
```bash
npm install -g wrangler
```

### 2. Cloudflareにログイン
```bash
npx wrangler login
```

### 3. 依存関係のインストール
```bash
npm install
```

## デプロイ方法

### 方法1: Cloudflare ダッシュボードから（推奨）

1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. 「Workers & Pages」セクションに移動
3. 「Create Application」をクリック
4. 「Pages」タブを選択し、「Connect to Git」を選択
5. GitHubリポジトリを接続
6. ビルド設定:
   - Framework preset: `Next.js`
   - Build command: `npm run build`
   - Build output directory: `.vercel/output/static`
7. 「Save and Deploy」をクリック

### 方法2: CLIから直接デプロイ

```bash
# ビルド
npm run build

# Cloudflare Pages用にビルド
npm run pages:build

# デプロイ
npm run pages:deploy
```

初回デプロイ時はプロジェクト名を入力する必要があります（例: `shikumato`）

## 環境変数の設定

Cloudflareダッシュボードで以下の環境変数を設定:

1. Workers & Pages > あなたのプロジェクト > Settings > Environment variables
2. 以下の変数を追加:
   - `NODE_ENV`: `production`

## 動作確認

デプロイ完了後、以下のURLでアクセス可能:
- `https://shikumato.pages.dev`
- または設定したカスタムドメイン

## トラブルシューティング

### ビルドエラーが発生する場合
```bash
# キャッシュをクリア
rm -rf .next node_modules
npm install
npm run build
```

### Edge Runtimeエラー
すべてのAPIルートに `export const runtime = 'edge'` が設定されていることを確認

### 互換性の問題
Next.js 15.5.4を使用しているため、一部の機能が制限される場合があります。
問題が発生した場合は、以下を試してください:

```bash
npm install --legacy-peer-deps
```

## 注意事項

- Cloudflare Workersには実行時間制限があります（Free: 10ms, Paid: 30s）
- ファイルサイズ制限: 25MB（圧縮後）
- Edge Runtimeでは一部のNode.js APIが使用できません
- 静的ファイルはCloudflare CDNから配信されます

## 更新とメンテナンス

### 自動デプロイ
GitHubと連携している場合、mainブランチへのpushで自動的にデプロイされます。

### 手動更新
```bash
npm run build
npm run pages:build
npm run pages:deploy
```

## サポート

問題が発生した場合:
1. [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
2. [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
3. プロジェクトのIssuesセクション