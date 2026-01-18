# 認証機能セットアップガイド

まとめるんのGoogle OAuth認証機能をセットアップする手順です。

## 1. Cloudflare D1 データベースの作成

```bash
# Cloudflare CLIでD1データベースを作成
npx wrangler d1 create matomeln-auth
```

出力されたデータベースIDを `wrangler.toml` に設定:

```toml
[[d1_databases]]
binding = "DB"
database_name = "matomeln-auth"
database_id = "実際のデータベースID"
```

スキーマを適用:

```bash
npx wrangler d1 execute matomeln-auth --file=./schema.sql --remote
```

## 2. Google OAuth 認証情報の取得

### Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuthクライアントID」を選択
5. アプリケーションの種類: 「ウェブアプリケーション」
6. 名前: `まとめるん` など
7. 承認済みのリダイレクトURI:
   - 本番: `https://matomeln.pages.dev/api/auth/callback`
   - 開発: `http://localhost:3000/api/auth/callback`
8. 作成後、クライアントIDとクライアントシークレットをコピー

## 3. 環境変数の設定

### Cloudflare Pages の環境変数

Cloudflare Dashboard → Pages → matomeln → Settings → Environment variables で以下を設定:

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | `GOCSPX-xxxx` |
| `AUTH_REDIRECT_URI` | OAuth コールバックURL | `https://matomeln.pages.dev/api/auth/callback` |

### ローカル開発用 (.env.local)

```bash
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
AUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## 4. D1データベースのバインディング

Cloudflare Dashboard → Pages → matomeln → Settings → Functions で:

1. 「D1 database bindings」セクションを開く
2. 「Add binding」をクリック
3. Variable name: `DB`
4. D1 database: `matomeln-auth` を選択
5. 保存

## 5. デプロイ

```bash
# ビルド
npm run build

# デプロイ
npx wrangler pages deploy out
```

## 認証フロー

1. ユーザーが `/login` にアクセス
2. 「Googleでログイン」ボタンをクリック
3. `/api/auth/login` がGoogle OAuth認証を開始
4. Googleでログイン後、`/api/auth/callback` にリダイレクト
5. コールバックでユーザー情報をD1に保存、セッション作成
6. セッションCookieを設定してトップページにリダイレクト

## アクセス制御

### Phase 1 (現在): 完全クローズド
- 管理者 (`lulu.y0812@gmail.com`) のみログイン可能
- `lib/auth.ts` の `ALLOWLIST_EMAILS` で管理

### Phase 2 (将来): 許可制
- `ALLOWLIST_EMAILS` にメールアドレスを追加することで利用者を増やせる

### Phase 3 (将来): オープン
- `functions/api/auth/callback.ts` の `isAllowed()` チェックを削除

## トラブルシューティング

### 「アクセスが拒否されました」エラー
- ログインしようとしているメールアドレスが `ALLOWLIST_EMAILS` に含まれているか確認
- 現在は管理者メールのみ許可

### セッションが維持されない
- CookieのSameSite設定を確認
- HTTPS環境では `Secure` フラグが必要

### OAuth エラー
- `AUTH_REDIRECT_URI` がGoogle Cloud Consoleの設定と一致しているか確認
- クライアントIDとシークレットが正しく設定されているか確認
