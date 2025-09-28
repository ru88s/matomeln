# シクマト開発ルール

## UI/UXデザイン原則

### 1. シンプルさを保つ
- コメント検索機能は不要
- すべてのコメントを一つのリストで表示する

### 2. キーボードショートカット
- Space: 最後にホバーしたコメントを選択/解除
- Ctrl+E: ホバー中のコメントを編集
- 1-9: カラーパレット選択（順番通り）
- 0: 黒色（パレット最後）を選択
- Q: 文字サイズを小に変更（14px）
- W: 文字サイズを中に変更（18px）
- E: 文字サイズを大に変更（22px）
- Ctrl+Enter: 編集を保存
- Ctrl+C: 編集をキャンセル

### 3. カラーパレット
```javascript
const colorPalette = [
  '#ef4444', // 1: 赤
  '#3b82f6', // 2: 青
  '#a855f7', // 3: 紫
  '#22c55e', // 4: 緑
  '#ec4899', // 5: ピンク
  '#f97316', // 6: オレンジ
  '#eab308', // 7: 黄色
  '#06b6d4', // 8: シアン
  '#64748b', // 9: グレー
  '#000000', // 0: 黒
];
```

### 4. 並べ替え機能
- 「レスの並び替え」チェックボックスでモード切り替え
- **並び替えモード有効時**:
  - 選択済みコメントのみ表示
  - ドラッグ&ドロップで自由に順番変更可能
  - 本文（最初のコメント）は固定で移動不可
  - 「固定」ラベルと鍵アイコンで視覚的に表現
  - グレー背景（bg-gray-50）とcursor-not-allowedで操作不可を明示
  - 選択解除（チェックボックス）を無効化
  - 「↓最後へ」ボタンで簡単に最後尾へ移動
- **並び替えモード無効時**:
  - アンカー（>>番号）に基づいた自動並び替え
  - 返信コメントはインデントして表示（ml-8 border-l-2 border-sky-200 pl-4）
  - 選択済みコメントは並べ替えた順番を保持して上部に表示
  - 未選択コメントはその後にアンカー順で表示
- **重要**: 並べ替えた順番は以下に反映される
  - コメント表示順
  - HTMLタグ生成時の順番
  - ブログ投稿時の順番
- **重要**: すべてのコメントを必ず表示する（アンカーの有無に関わらず）

### 5. 編集ボタンの配置
- テキストエリアの右側に配置（-right-8）
- ホバー時のみ表示
- Eキーのヒントを表示

### 6. モーダル表示
- React Portalを使用してbody直下にレンダリング
- z-index: 9999（オーバーレイ）、10000（コンテンツ）
- ビューポート中央に固定表示

### 7. ヘッダーデザイン
- Betaバッジは「シクマト」の直後に配置
- サブタイトル「シクトクのまとめ作成ツール」を追加
- 「対応希望の掲示板募集中！」メッセージを表示

### 8. 表示ルール
- ID表示はトークの設定に依存（show_id）
- 時刻表示は必須（秒まで表示）
- コメント番号は「1.」形式（#ではなくピリオド）
- コメント番号、名前、時刻、IDを一行で表示

### 9. 編集モード
- エディタ外クリックで編集解除
- 編集中はコメント選択状態を変更しない
- 白背景のテキストエリア

### 10. 絵文字の使用
- 絵文字は基本的に使用しない
- ユーザーが明示的に要求した場合のみ使用

### 11. リンクとアンカー
- URL（http://、https://）は自動的に青色リンク化（#3b82f6）
- アンカー（>>番号）は青色表示（#3b82f6）、下線なし
- リンクはtarget="_blank"で新規タブで開く

### 12. ドラッグ&ドロップ操作
- draggable属性で要素をドラッグ可能に設定
- onDragStart/onDragEnd/onDragOver/onDropイベントで処理
- 本文コメント（isFirstSelected）はドラッグ不可
- ドラッグ中は要素を半透明表示（opacity-50）
- ドロップ位置をborder-t-2で視覚化

## HTML生成ルール

### 並べ替え反映
- HTMLGenerator内でのソート処理を削除
- selectedCommentsの順番をそのまま使用
- arrangeCommentsByAnchor関数は削除済み

### ブログ投稿フォーマット
- 各コメントは`<div class="res_div">`で囲む
- コメント間に`<br /><br />`を追加して改行
- 本文と「続きを読む」は`<!--more-->`タグで分割
- 1つ目のコメントが本文、2つ目以降が「続きを読む」部分

### 画像処理
- 最大幅・高さ200pxに制限
- ShikutokuのCDN URLを使用

## ライブドアブログAPI仕様

### 認証方式
- **プロトコル**: AtomPub API（WSSE認証）
- **エンドポイント**: `https://livedoor.blogcms.jp/atom/blog/{blogId}/article`
- **認証ヘッダー**: WSSEトークン（UsernameToken形式）

### レスポンス処理
- 成功: HTTPステータス201とLocationヘッダー
- エラー: 401は認証エラー
- XML形式でペイロード送信

### XML構造
```xml
<entry xmlns="http://www.w3.org/2005/Atom">
  <title>{タイトル}</title>
  <content type="text/html">{全文}</content>
  <blogcms:source>
    <blogcms:body><![CDATA[{本文}]]></blogcms:body>
    <blogcms:more><![CDATA[{続き}]]></blogcms:more>
  </blogcms:source>
</entry>
```

## コーディング規約

### TypeScript/React
- 'use client'ディレクティブを使用
- createPortalでモーダルを実装
- useCallbackで関数をメモ化
- イベントのcaptureフェーズを適切に使用

### Tailwind CSS
- グラデーション: from-sky-50 to-cyan-50
- ボーダー: border-sky-100/200/300
- ホバー効果は明示的に定義
- z-indexは明確に定義（1000, 9999, 10000）

### パフォーマンス
- 不要な機能は削除
- フィルタリング機能は実装しない

## API設計

### エンドポイント
- `/api/proxy/getTalk` - トーク情報取得
- `/api/proxy/getComments` - コメント取得
- `/api/proxy/postBlog` - ブログ投稿

### 開発環境設定
- `app-api`ディレクトリを`app/api`にコピー（開発時のみ）
- `scripts/dev-setup.sh`で自動セットアップ
- Cloudflare Functionsは`functions`ディレクトリで管理

## テストコマンド
```bash
npm run dev  # 開発サーバー起動
npm run build  # ビルド
```

## コメント表示ロジック

### 通常モード（並び替えモードOFF）
```typescript
if (selectedComments.length > 0) {
  // 選択済みを並べ替えた順番で表示、その後未選択をアンカー順で表示
  const selectedInOrder = selectedComments.map(...);
  const unselected = arrangeCommentsByAnchor(comments.filter(...));
  return [...selectedInOrder, ...unselected];
} else {
  // 未選択時はアンカー順で表示
  return arrangeCommentsByAnchor(comments);
}
```

### 並び替えモード（並び替えモードON）
```typescript
// 選択したコメントのみをユーザーが並べ替えた順番で表示
selectedComments.map(sc => ({
  ...comments.find(c => c.id === sc.id)!,
  body: editedComments[sc.id] || sc.body
}))
// 注: res_idでのソートは行わない（ユーザーの並び順を保持）
```

## 今後の方針
- UIのシンプルさを最優先
- ユーザーの明示的な要求のみ実装
- 不要な機能は積極的に削除
- キーボード操作の改善を継続
- ユーザーが手動で並べ替えた順番の保持を徹底