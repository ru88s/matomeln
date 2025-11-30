# まとめるん開発ルール

## UI/UXデザイン原則

### 1. シンプルさを保つ
- コメント検索機能は不要
- すべてのコメントを一つのリストで表示する
- 選択中のみ表示機能は不要

### 2. キーボードショートカット
- Space: 最後にホバーしたコメントを選択/解除
- Ctrl+E: ホバー中のコメントを編集（Eキー単独とは別処理）
- 1-9: カラーパレット選択（順番通り）
- 0: 黒色（パレット最後）を選択
- Q: 文字サイズを大に変更（22px）
- W: 文字サイズを中に変更（18px）
- E: 文字サイズを小に変更（14px）※Ctrl+Eとは別
- Cmd+Z / Ctrl+Z: 元に戻す（Undo）- 最大30回まで
- Cmd+Shift+Z / Ctrl+Shift+Z: やり直す（Redo）
- Ctrl+Y (Windows/Linux): やり直す（Redo）
- Ctrl+Enter: 編集を保存
- Ctrl+C: 編集をキャンセル
- **注意**: キーボードショートカットはスティッキーヘッダーに常時表示

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
- **「選択済みのレスのみ表示」チェックボックス**:
  - デフォルト: OFF（全コメント表示）
  - ONの時: 選択済みコメントのみを並び替え順序で表示
  - ONの時: コメントのチェックボックスを無効化（選択解除不可）
  - OFFの時: 全コメントを表示（選択済みは並び替え位置、未選択は元の位置または移動済み位置）
- **並び替え操作**（未選択コメントも操作可能）:
  - **ドラッグ&ドロップ**: ヘッダー部分（番号・名前・日時）でドラッグ可能
    - ドラッグハンドル: コメント番号、名前、日時の行のみ
    - その範囲でのみ`cursor-grab`カーソル表示
    - コメント本文はテキスト選択可能（ドラッグ不可）
    - 未選択コメントをドラッグすると自動的に選択状態になる
    - 本文（最初の選択コメント）はドラッグ不可だが選択解除は可能
    - ドラッグ中は要素を半透明表示（opacity-50）
    - マウス移動距離5px未満はテキスト選択と判断してドラッグキャンセル
  - **「↑最初へ」ボタン**: 全コメント中の絶対最初の位置に移動
    - 本文（最初の選択コメント）には表示しない
    - 未選択コメントでも表示され、クリックで移動可能
  - **「↓最後へ」ボタン**: 全コメント中の絶対最後の位置に移動
    - 現在の最大位置を動的に計算: `Math.max(comments.length - 1, ...Object.values(commentPositions)) + 1`
    - 複数コメントを連続して最後に移動しても正しく順番に配置
    - 未選択コメントでも表示され、クリックで自動選択&移動
  - **番号指定移動**: 特定コメントの下に移動
    - 入力欄に番号を入力してEnterまたは「移動」ボタン
    - 位置管理: `commentPositions[id] = targetIndex + 0.5`
  - **toast通知**: 移動操作時に成功/エラーメッセージを表示
- **本文コメントの扱い**:
  - 選択済みコメントの最初（インデックス0）が本文
  - 「固定」ラベルと鍵アイコンで視覚的に表現
  - グレー背景（bg-gray-50）で視覚的に区別
  - 選択状態でも`cursor-pointer`でクリック可能（選択解除できる）
  - ドラッグ、移動ボタンは無効
- **位置管理システム（重要）**:
  - `commentPositions: Record<string, number>` でコメントID→位置のマッピング
  - **選択済みコメント**: 移動操作後の位置を`commentPositions`に記録
  - **未選択コメント**: `commentPositions`に位置情報があればそれを使用、なければ元のインデックス
  - **位置情報の永続性**: 選択を解除しても`commentPositions`は保持されるため、移動した位置がそのまま維持される
  - 小数値（-0.5, 0.5, index + 0.5）で元コメントの間に挿入
  - 表示時は `sortKey` でソートして選択済み・未選択をマージ
  - 新しいトークを読み込むと位置情報をリセット
- **並び替えた順番の反映**:
  - HTMLタグ生成時の順番に反映
  - ブログ投稿時の順番に反映
  - **最初のコメントが本文**、2番目以降が「続きを読む」部分
- **アンカー表示**（選択済みのレスのみ表示がOFFの時）:
  - 返信コメント（>>番号）はインデント表示（ml-8 border-l-2 border-sky-200 pl-4）
  - 選択状態に関係なく全コメントを表示
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
- サブタイトル「Shikutokuのまとめ作成ツール」を追加
- ナビゲーションバーに「使い方」リンク配置

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
- URL（http://、https://）は自動的にリンクカード化
- **リンクカード表示**:
  - まとめるん画面: Reactコンポーネント（LinkCard）でOGP情報付きカード表示
  - 生成HTMLタグ: OGP API（/api/ogp）から取得した情報で静的HTMLカード生成
  - OGP情報: タイトル、説明文、画像、サイト名を表示
  - OGP取得失敗時: URLとホスト名のみのシンプルなカード表示
- **文字エンコーディング対応**:
  - `encoding-japanese`ライブラリで多様な文字コードをサポート
  - 対応文字コード: UTF-8, EUC-JP, Shift_JIS, ISO-2022-JP など
  - 自動検出機能で適切なデコードを実行
  - 開発環境（app-api）とCloudflare Functions（functions/api/ogp）で同じ実装
  - HTMLエンティティ（数値文字参照 `&#1234;` `&#x1a2b;`）も正しくデコード
- アンカー（>>番号）は青色表示（#3b82f6）、下線なし
- リンクはtarget="_blank"で新規タブで開く
- **重要**: imgタグは必ず自己閉じタグ（`<img ... />`）で生成（XMLパース対応）

### 12. ドラッグ&ドロップ操作
- **ドラッグハンドル**:
  - **範囲限定**: コメント番号、名前、日時の行（ヘッダー部分）のみがドラッグハンドル
  - ヘッダー部分にのみ`cursor-grab active:cursor-grabbing`を適用
  - コメント本文は通常の`cursor-pointer`でテキスト選択可能
  - 本文コメント（isFirstSelected）はドラッグ不可
  - 未選択コメントもドラッグ可能（ドラッグ開始時に自動選択）
- **テキスト選択との区別**:
  - `onMouseDown`でマウスダウン位置を記録（`dragStartPos`）
  - `onDragStart`でマウス移動距離を計算
  - 移動距離5px未満の場合は`e.preventDefault()`でドラッグキャンセル
  - これによりテキスト選択時にドラッグが発生しない
- **イベント処理**:
  - onDragStart: `setDraggedCommentId(comment.id)` でドラッグ中のコメントを記録
  - onDragEnd: 状態をクリア
  - onDragOver: ドロップ可能な位置で `e.preventDefault()`
  - onDrop: 配列順序を変更 + 位置情報を完全再計算
  - ヘッダー部分のイベントには`e.stopPropagation()`で親要素への伝播を防ぐ
- **視覚フィードバック**:
  - ドラッグ中は要素を半透明表示（opacity-50）
  - ドロップ位置をborder-t-2で視覚化（`dragOverCommentId`）
- **位置管理システム（重要）**:
  - **絶対的なインデックス位置**を使用（相対位置は使用しない）
  - `selectedComments`の配列順序が唯一の真実（source of truth）
  - ドロップ/移動操作後に`commentPositions`を完全に再計算:
    ```typescript
    const newPositions: Record<number, number> = {};
    newSelectedComments.forEach((sc, index) => {
      if (index > 0) { // 本文以外
        newPositions[sc.id] = index;
      }
    });
    setCommentPositions(newPositions);
    ```
  - この方式により何度でも自由に並べ替え可能
  - テキスト選択時は `onMouseDown={(e) => e.stopPropagation()}` でドラッグ防止

### 13. ボタンのUXデザイン
- **基本スタイル**:
  - すべてのボタンにcursor-pointerを追加
  - クリック可能であることを視覚的に明確化
  - ホバー時の色変化で操作フィードバック提供
  - 対象ボタン: トークを読み込む、大中小サイズ、全て選択、選択解除、↑最初へ、↓最後へ、元に戻す、やり直す
- **移動ボタンの仕様**:
  - 「↑最初へ」: selectedCommentsの配列先頭に移動（unshift）
  - 「↓最後へ」: selectedCommentsの配列末尾に移動（push）
  - 移動後は必ず`commentPositions`を完全再計算（ドラッグ&ドロップと同じロジック）
  - 本文（インデックス0）には移動ボタンを表示しない
  - 選択済みコメントのみ表示
  - `e.stopPropagation()` でクリック時のコメント選択を防止
  - toast通知で移動成功をフィードバック

### 14. Undo/Redo機能
- **履歴管理**: useUndoRedoカスタムフックで実装
- **最大履歴数**: 30回まで保存（メモリ効率のため）
- **対象操作**:
  - コメントの選択/解除
  - コメントの並べ替え
  - コメントの編集
  - 色やサイズの変更
- **リセットタイミング**: 新しいトークを読み込んだ時
- **UIフィードバック**:
  - ボタンの有効/無効状態を動的に表示
  - ボタン内にキーボードショートカット表示
  - 「元に戻す ⌘Z」「やり直す ⌘⇧Z」
  - `inline-flex items-center` でアイコン・テキスト・キー表示を横並び
  - `<kbd>` タグでキー表示（bg-gray-50、小さめフォント）
- **ショートカット表示の統一**:
  - ヘッダー部分のショートカット説明からUndo/Redo表示を削除
  - ボタン内のキー表示に統一してUIをすっきりさせる

## HTML生成ルール

### 並べ替え反映
- HTMLGenerator内でのソート処理を削除
- selectedCommentsの順番をそのまま使用
- arrangeCommentsByAnchor関数は削除済み

### 文字サイズの個別適用
- **重要**: 個別のコメントのサイズ（comment.fontSize）を適用
- オプション全体のサイズ（options.commentStyle.fontSize）は使用しない
- サイズ値: 小=14px、中=18px、大=22px

### ブログ投稿フォーマット
- 各コメントは`<div class="res_div">`で囲む
- コメント間に`<br /><br />`を追加して改行
- 本文と「続きを読む」は`<!--more-->`タグで分割
- 1つ目のコメントが本文、2つ目以降が「続きを読む」部分

### 画像処理
- 最大幅・高さ200pxに制限
- ShikutokuのCDN URLを使用

### リンクカード生成（非同期処理）
- `generateMatomeHTML`は非同期関数（async/await）
- コメント本文のURL検出 → OGP API呼び出し → カードHTML生成
- **OGP情報取得フロー**:
  1. URLパターン正規表現でURL抽出（`/(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+)/g`）
  2. `/api/ogp?url=...` にfetchでOGP情報取得
  3. タイトル・説明・画像・サイト名を含むカードHTML生成
- **カードHTMLスタイル**:
  - flexレイアウトで画像（128x128px）+テキスト情報
  - インラインスタイルで完結（外部CSS不要）
  - ボーダー、角丸、パディングで視覚的に区別
- **エラーハンドリング**: OGP取得失敗時はURLとホスト名のみ表示

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
- `/api/ogp` - OGP情報取得（リンクカード生成用）
  - パラメータ: `url`（エンコード済みURL）
  - レスポンス: `{title, description, image, siteName, url}`
  - **文字エンコーディング処理**:
    - `encoding-japanese`ライブラリで自動検出・変換
    - バイナリデータとして取得 → 文字コード検出 → Unicode変換
    - 対応: UTF-8, EUC-JP, Shift_JIS, ISO-2022-JP など
  - **HTMLエンティティデコード**:
    - 名前付きエンティティ: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`
    - 数値文字参照（10進数）: `&#1234;`
    - 数値文字参照（16進数）: `&#x1a2b;`
  - HTMLパース: 正規表現でOGPタグ抽出
  - フォールバック: titleタグ、descriptionメタタグ
  - **デュアル実装**:
    - 開発環境: `app-api/ogp/route.ts`（Next.js API Routes）
    - 本番環境: `functions/api/ogp/index.ts`（Cloudflare Functions）
    - 両方で同じロジックを使用

### 開発環境設定
- `app-api`ディレクトリを`app/api`にコピー（開発時のみ）
- `scripts/dev-setup.sh`で自動セットアップ
- Cloudflare Functionsは`functions`ディレクトリで管理
- AIコメント生成ボタンは開発環境のみ表示: `process.env.NODE_ENV === 'development'`

## テストコマンド
```bash
npm run dev  # 開発サーバー起動
npm run build  # ビルド
```

## コメント表示ロジック

### 選択済みのみ表示モード（showOnlySelected = true）
```typescript
// 選択したコメントのみをユーザーが並べ替えた順番で表示
selectedComments.map(sc => ({
  ...comments.find(c => c.id === sc.id)!,
  body: editedComments[sc.id] || sc.body
}))
```

### 全コメント表示モード（showOnlySelected = false）
```typescript
// 選択済みコメントを位置情報に基づいて全コメント中に挿入
const selectedIds = new Set(selectedComments.map(sc => sc.id));
const result: Array<Comment & { body: string; sortKey: number }> = [];

// 未選択コメントに元のインデックスを割り当て
comments.forEach((c, index) => {
  if (!selectedIds.has(c.id)) {
    result.push({ ...c, body: editedComments[c.id] || c.body, sortKey: index });
  }
});

// 選択済みコメントを位置情報に基づいて挿入
selectedComments.forEach(sc => {
  const comment = comments.find(c => c.id === sc.id);
  if (comment) {
    const originalIndex = comments.findIndex(c => c.id === sc.id);
    const targetPosition = commentPositions[sc.id] !== undefined
      ? commentPositions[sc.id]
      : originalIndex;
    result.push({ ...comment, body: editedComments[comment.id] || comment.body, sortKey: targetPosition });
  }
});

// sortKeyでソートして返す
return result.sort((a, b) => a.sortKey - b.sortKey);
```

### 位置管理システム
- **commentPositions**: 各選択コメントの全コメント中の位置を記録
- **小数値での挿入**: 元のコメントの間に挿入するため小数値を使用
  - 最初に移動: `-0.5`
  - 最後に移動: `comments.length - 1 + 0.5`
  - 特定位置の後: `targetIndex + 0.5`
  - ドラッグ&ドロップ: `dropIndex - 0.1`
- **リセット**: トークが変更されたら `commentPositions = {}` でリセット

## SEO対策
- サイトマップ: /sitemap.xml（動的生成）
- robots.txt: APIへのアクセスを制限
- 構造化データ: WebApplicationスキーマ実装
- OGP・Twitterカード設定済み
- 本番ドメイン: https://matomeln.pages.dev

## 今後の方針
- UIのシンプルさを最優先
- ユーザーの明示的な要求のみ実装
- 不要な機能は積極的に削除
- キーボード操作の改善を継続
- ユーザーが手動で並べ替えた順番の保持を徹底