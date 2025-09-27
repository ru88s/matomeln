# Cloudflare Pagesの正しい設定手順

## 重要：Cloudflare Pagesダッシュボードでの設定

### 1. ビルド設定（Build configurations）

以下の設定を確実に行ってください：

- **Framework preset**: `Next.js (Static HTML Export)`を選択
- **Build command**: `npm run build`
- **Build output directory**: `.next/static` または `out`

### 2. 環境変数（Environment variables）

設定タブで以下を追加：
- `NODE_VERSION`: `18`

### 3. ビルド再実行

設定変更後、以下の手順で再ビルド：

1. Cloudflareダッシュボードで「Deployments」タブに移動
2. 最新のデプロイメントの横にある「...」メニューをクリック
3. 「Retry deployment」を選択

### 代替案1：Vercelアダプターを使用

もしまだ動作しない場合、package.jsonのbuildコマンドを変更：

```json
"build": "next build && next export"
```

### 代替案2：静的ホスティングとして使用

next.config.tsを以下に変更：

```javascript
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  }
};
```

この場合、APIルートは使用できなくなりますが、静的サイトとして確実に動作します。

### トラブルシューティング

1. **404エラーが出る場合**
   - ビルド出力ディレクトリを確認（`.next`または`out`）
   - Framework presetが正しいか確認

2. **ビルドが失敗する場合**
   - Node.jsバージョンを18に設定
   - npm installが成功しているか確認

3. **ページが真っ白な場合**
   - ブラウザのコンソールでエラーを確認
   - Cloudflareの「Functions」タブでログを確認

## 現在の推奨設定

プロジェクトの状態を考慮すると、以下の設定が推奨されます：

1. Cloudflareダッシュボードで：
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Framework preset: `None`（手動設定）

2. Edge RuntimeのAPIルートは、Cloudflare Workers/Functionsとして動作するはずです。

## 確認方法

デプロイ後、以下を確認：
1. `https://shikumato.pages.dev/` でトップページが表示される
2. `/api/proxy/getTalk`などのAPIエンドポイントが動作する
3. ブラウザコンソールにエラーが出ていない