# AGENTS.md - プロジェクトルール

## プロジェクト概要
- まとめるん: Next.js / TypeScript のまとめ記事HTML生成ツール
- Kotoriaなど外部ブログへ貼り付けるHTMLタグを発行する
- デプロイ: `npm run pages:deploy`

## Codex作業完了ルール - 重要

### 原則
- ユーザーが「完了後は本番反映」「コミットも忘れずに」「プッシュとデプロイはちゃんとやる」と指定済みなので、コード変更を完了したら原則としてコミット、GitHubへプッシュ、本番デプロイまで行う。
- デプロイ前に型チェックと本番ビルド検証を通す。検証が通らない状態で本番反映しない。
- ローカルで確認できるUI変更は、可能な限り `http://localhost:3000/` をブラウザまたはcurlで確認する。
- 投稿・削除・公開など外部に副作用がある動作確認は、必要最小限にする。公開投稿を増やすテストは避け、可能ならダミー認証やAPIの手前までで確認する。

### コミット・プッシュ・デプロイ手順
- 変更後は最低限 `tsc --noEmit` を通す。
- Cloudflare Pages向け本番ビルドは、Turbopackではなく通常の `next build` で検証する。
- 安定しているビルド手順:

```bash
export PATH="/Users/wataruyonamine/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
./scripts/dev-setup.sh
rm -rf .next out tsconfig.tsbuildinfo
./scripts/build-clean.sh
CF_PAGES=true ./node_modules/.bin/next build
./scripts/post-build.sh
./scripts/dev-setup.sh
./scripts/verify-build.sh
```

- `PageNotFoundError` がビルド中に一時的に出ることがある。その場合は `./scripts/dev-setup.sh` と `rm -rf .next out tsconfig.tsbuildinfo` からやり直す。
- `out/` にページHTMLが揃っていないビルドはデプロイしない。必ず `./scripts/verify-build.sh` を通す。
- デプロイ:

```bash
export PATH="/Users/wataruyonamine/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
./node_modules/.bin/wrangler pages deploy out --project-name matomeln --branch main
```

- デプロイ後は `curl -I https://matomeln.com/` で `302` が返り、`/login?returnTo=%2F` へ向くことを確認する。
- 作業後はローカルを使える状態に戻す:

```bash
lsof -ti tcp:3000 | xargs kill 2>/dev/null || true
export PATH="/Users/wataruyonamine/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
./scripts/dev-setup.sh && ./node_modules/.bin/next dev --turbopack -p 3000
```

### Git管理
- コミット前に `git status --short` と `git diff --stat` を確認する。
- `app-api/settings/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` はローカル運用由来で未追跡のまま残ることがある。ユーザーが明示しない限りコミットしない。
- 認証情報やローカル設定を含むファイルを不用意にコミットしない。
- 既存の未追跡・未コミット変更はユーザー作業の可能性があるため、勝手に削除・リセットしない。

## ライブドア複数ブログ投稿ルール - 重要

### 認証ユーザー名
- ライブドアAtomPub投稿では、ブログIDと認証ユーザー名が一致しないことがある。
- ガールズVIPまとめ、まとめブレイド、なんでも受信遅報、おにひめちゃんは、投稿先ブログIDが違っても認証ユーザー名は `garlsvip` を使う。
- `postBlog` と `uploadImage` には `blogId` だけでなく `apiUsername` も渡す。未指定時だけ `blogId` を認証ユーザー名として使う。
- 設定編集時に `apiUsername` を消さない。ライブドアブログ設定には「認証ユーザー名」欄を維持する。
- 既存ローカル設定で `apiUsername` が欠けている場合、既知ブログID `garlsvip`, `matome_blade`, `mnuhkhkbxmagwje`, `onihimechan` は `garlsvip` に補正する。
- おにひめちゃん、および今後追加する生活系サイトへの同時投稿は、5ch/Talk系では生活系・雑談系のみ許可する。ニュース板・芸能人系・スポーツ系・政治系・経済/事件事故などニュース系記事は同時投稿からスキップする。政治系はタイトル/タグだけでなくレス1本文の政治文脈も見る。生活系・雑談系として判定できない記事もスキップする。レス1にURLがある記事も生活系サイトには投稿しない。ただしガルちゃん系（girlschannel.net）は例外として、ニュース系・政治系以外は生活系サイトへ同時投稿してよい。ガルちゃん系では芸能/スポーツ/雑談/恋愛/美容などを生活系・雑談寄りとして許可する。

### エラー表示
- 同時投稿の失敗を一律に「制限中」と表示しない。
- 追加ブログ投稿で失敗したら、APIレスポンスの `details` または `error` を表示する。
- ブログ側で制限されていない可能性があるため、認証エラー・XMLエラー・403/401などを区別できるログとtoastにする。

### サムネイル生成
- AIサムネイルは既存サムネ再利用を優先し、合うサムネがない場合だけNano Banana 2 Lite（`gemini-3.1-flash-lite-image`）で新規生成する。
- 再利用順は、スレメモくんのタグキャッシュ → スレメモくん共有サムネライブラリ → ローカルサムネライブラリ → 新規生成を基本にする。
- 新規生成したサムネはローカルライブラリとスレメモくん共有サムネライブラリ、タグ一致時はタグキャッシュにも保存し、日々のAPIコストが下がる方向にする。
- ローカルOllama利用時のサムネ新規生成は、まずローカルLLMに短い演出設計JSON（ジャンル、背景、小物、表情、避けるもの、再利用タグ、信頼度）を作らせる。ただし画像生成プロンプト全文をLLMに自由生成させず、検証済みJSONを固定のサムネテンプレに差し込む。
- ローカルLLMの演出設計が落ちた、低信頼度、または `ドラム式洗濯機` と `ドラムセット` のような多義語を混同している場合は、その設計を破棄して従来テンプレへフォールバックする。
- タグ未一致でAIサムネを新規生成した場合、LLMでタグ候補を1件だけ抽出してよい。ただし候補をそのまま登録せず、タイトルまたはレス1本文に実在する固有名詞であること、汎用語でないこと、政治/事件事故/アダルト/差別ヘイト寄りでないこと、信頼度しきい値を超えることを検証してからスレメモくんへ登録する。
- サムネの基本テイストは、まとめブログ向けの独自アニメ寄り2.5Dチビキャラ調にする。硬い3Dフィギュア調、特定の商品・既存キャラクター・実在人物の顔に寄せない。
- AIサムネイルには記事タイトル、見出し、字幕、看板、UI文字、数字などの読めるテキストを入れない。文字化けリスクと再利用性低下を避けるため、内容はキャラ・背景・小物・色・表情で表現する。
- AIサムネ生成やアップロードに失敗した場合は、ライブドアブログにアップロード済みのがるびキャラクター画像URL（`https://livedoor.blogimg.jp/garlsvip/imgs/f/2/f20187f5.png`）をフォールバックとして使う。ローカルの `public/images/default-ai-thumbnail.png` は原本として残す。ただしデフォルト画像はタグキャッシュ・共有サムネライブラリ・ローカルライブラリには保存しない。

### 動作確認
- 追加ブログ投稿周りを触ったら、ローカル設定APIで各ブログの `apiUsername` を確認する。
- 公開投稿を増やす動作確認は避ける。必要な場合だけユーザーに明示してから行う。
- ダミーAPIキーで `/api/proxy/postBlog` を叩く場合は、公開投稿は作られず認証/権限エラーで止まることを確認目的に限定する。

## まとめ記事再まとめ戦略 - 重要

### 戦略の位置づけ
- ガールズVIPまとめ、まとめブレイドなど、運営協力できるlivedoor系まとめ記事を「まとめるん」に取り込み、Kotoria向けに再編集・再投稿できるようにする。
- これはWataru運営圏ならではの強い成長戦略として扱う。運営者の作業負担を下げ、元まとめサイト側にも送客・引用メリットを残し、Kotoria側の記事数と読者体験も増やす。
- この導線を壊さない。まとめ記事URLの読み込み、AIまとめ、タグ発行、Kotoria投稿は通常の対応対象に含める。

### 実装ルール
- livedoor系まとめ記事は `res_div` を1レス単位、`t_h` をレスヘッダー、`t_b` をレス本文として抽出する。
- `sourceInfo.source` は `matomeBlog` とし、引用元URLは元スレURLではなく、ユーザーが入力したまとめ記事URLを使う。
- 記事本文内に `p.source_link` があっても、Kotoria投稿時の引用元は取り込み元まとめ記事URLを優先する。
- 対応URLは最低限 `girlsvip-matome.com/acv/...` と `matomeblade.com/archives/...` を維持する。追加対応時も同じパーサーで扱えるか先に確認する。
- 外部HTML取得はクライアント直fetchではなく、Cloudflare Pages Functionsのプロキシ経由にする。
- プロキシはSSRF対策として許可ホスト・記事URLパターンを絞る。任意URLプロキシ化しない。

### 回帰確認
- `https://girlsvip-matome.com/acv/1086348233.html` がレスとして抽出できること。
- `https://matomeblade.com/archives/301144138.html` がレスとして抽出できること。
- 抽出後の `source_link` が取り込み元まとめ記事URLになること。
- `npx tsc --noEmit` と `npm run build` を通すこと。
- デプロイ後は `/api/proxy/getLivedoorMatome?url=...` が本番またはPreviewでHTMLを返し、`res_div` を含むことを確認する。

## Kotoria向けHTMLタグ発行ルール - 重要

### 原則
- **発行タグの表示プレビュー、コピーされるタグ、ブログ投稿される本文は同じHTMLを使う。**
- 画面上のレス表示、発行タグプレビュー、Kotoria貼り付け後の表示で、改行と空白行の意味を揃える。
- Kotoria側は発行タグをそのまま反映する前提なので、まとめるん側で意図した `<br>` を正しく出す。

### レス内改行・空白の扱い
- Kotoria向けHTMLでは、レス本文は必ず投稿番号ヘッダーの次の行から始める。投稿番号・名前・日時と本文を同じ行に置かない。
- レス本文の改行位置は一切変更しない。通常改行、連続空行、先頭空行、末尾空行はユーザー入力の本文として保持する。
- Kotoria向けHTMLでは、各レス本文の最後に必ず空白行2行分を追加する。実装上は `.res_div` を閉じた後に `<br /><br />` を独立行で発行する。
- レス本文内の通常改行は `<br />` または `<br>` として発行する。
- レス本文内の空行は `<br /><br />` または `<br><br>` として発行する。
- Kotoria向けでも空行を削除しない。ユーザーがレス本文に入れた先頭・途中・末尾の空行は本文の一部として保持する。
- レス外の余白調整用 `<br><br>` と、レス本文内の空行用 `<br><br>` を混同しない。
- Kotoria向けのレス区切り余白は、`.t_b` 内ではなく `.res_div` を閉じた後に `<br /><br />` として発行する。
- `.res_div` の末尾余白はCSS補正に頼らず、発行HTML内のレスブロック外 `<br /><br />` を正とする。
- `.t_b` 内の改行は本文として保持し、レス区切り用の余白と混ぜない。
- `remove5chIconUrls`, URLカード化、Kotoria向け整形などの補助処理で、レス本文全体に `.trim()` をかけない。不要な行を除去する場合も、除去対象の行だけを消し、前後の改行は残す。
- imgur URLの埋め込み化は、すたくらくん側の後処理ではなく `generateMatomeHTML` のURLカード化で行う。元レス本文はURLのまま保持し、投稿HTMLではURLリンクの下に公式imgur embedを出す。`girls-matome` にはscriptタグを入れず、プレーンリンクに留める。
- CRLF正規化は許可するが、`\n{3,}` を潰したり、末尾の `\n` を削ったりしない。複数空行も投稿者の意図として扱う。
- `.t_b` の開始タグ直後に整形用改行を置かない。`<div class="t_b">通常コメント...` のように、本文を開始タグ直後から出す。
- `<div class="t_b">\n通常コメント...` を発行すると、Kotoria側で通常コメント上部に空白が出る原因になる。

### 表示とタグ発行の統一
- レス一覧表示では、本文内の `\n` をReact上でも明示的に `<br>` として描画する。
- `whitespace-pre-wrap` だけに頼らない。URLカードやアンカーなどでReact要素に分解すると、改行表示が崩れることがある。
- タグ発行モーダルでは、発行タグの表示プレビューを必ず表示し、textareaの本文・コピー・投稿本文と同じHTMLを使う。
- `generatedHTML.body` と `generatedHTML.footer` を結合する処理は1箇所の関数にまとめる。

### 入力データの正規化
- シクトクAPIなどが `<br>` を含む本文を返す場合、まとめるん内部では `\n` に正規化して扱う。
- `<br>` 正規化では属性付きBRも想定し、必要なら `/<br\b[^>]*>/gi` を使う。
- CRLFは `\n` に統一する。

### 禁止事項
- Kotoria向けだからといって、レス本文内の空行を `\n` 1個まで潰さない。
- レス本文を加工する関数で `.trim()`, `.trimStart()`, `.trimEnd()` を使わない。先頭・末尾の空行が消える。
- `filter(...).join('\n').trim()` のような「行除去後の仕上げtrim」は禁止。5chアイコンURL除去などでも同じ。
- 発行タグプレビューだけに独自の改行補正を入れない。コピー・投稿されるタグと見た目がズレる。
- textareaに表示されるHTML、プレビューHTML、投稿HTMLを別々のロジックで組み立てない。
- `.t_b>` と本文の間にテンプレート整形用の改行を入れない。通常コメントだけ上部空白が出る回帰につながる。

### 回帰テスト
Kotoria向けタグ生成やレス本文表示を触ったら、最低限このケースを確認する：

```text
<先頭空行>
一行目
二行目

<空行>
三行目
<末尾空行>
```

期待されるKotoria向け発行HTML：

```html
<br />
一行目<br />
二行目<br />
<br />
<br />
三行目<br />
```

レスブロックの区切りは、本文内ではなく `.res_div` の外に出す：

```html
<div class="res_div"><div class="t_h">1: 名無しさん</div><div class="t_b">本文</div></div><br />
<br />
<div class="res_div"><div class="t_h">2: 名無しさん</div><div class="t_b">次レス</div></div><br />
<br />
```

HTMLソース上でもKotoria向けのレス末尾2空行は独立行で発行する：

```html
<div class="res_div"><div class="t_h">
1: 名無しさん</div>
<div class="t_b">本文</div></div>
<br />
<br />
```

通常コメント・アンカーコメントのどちらも、`.t_b` 開始直後に余計な改行が入らないこと：

```html
<!-- OK -->
<div class="t_b">通常コメント一行目<br />
通常コメント二行目</div>

<!-- NG -->
<div class="t_b">
通常コメント一行目<br />
通常コメント二行目</div>
```

確認コマンド例：

```bash
npx tsx --eval "import { generateMatomeHTML } from './lib/html-templates'; (async () => { const talk:any={id:'t1',title:'テスト',tag_names:[]}; const base:any={id:'c1',res_id:1,name:'nita',name_id:'BDKSPflJ9',created_at:'2026-06-03T10:58:59+09:00',body:'一行目\\n二行目\\n\\n三行目',images:[],color:'#000000',fontSize:'large'}; const html = await generateMatomeHTML(talk,[base],{includeImages:true,style:'simple',includeTimestamp:true,includeName:false,commentStyle:{bold:true,fontSize:'large',color:'#000000'}}, {source:'shikutoku',originalUrl:'https://shikutoku.me/talks/t1'}, '', true, '#ff69b4', '', true, false, true, '', 'kotoria'); console.log(html.body); })();"
npx tsx --eval "import { generateMatomeHTML } from './lib/html-templates'; (async () => { const talk:any={id:'t1',title:'テスト',tag_names:[]}; const comments:any[]=[{id:'c1',res_id:1,name:'nita',name_id:'A',created_at:'2026-06-03T10:58:59+09:00',body:'通常コメント一行目\\n通常コメント二行目',images:[],color:'#000000',fontSize:'large'},{id:'c2',res_id:2,name:'nita',name_id:'B',created_at:'2026-06-03T10:59:59+09:00',body:'>>1\\nアンカーコメント',images:[],color:'#000000',fontSize:'large'}]; const html = await generateMatomeHTML(talk,comments,{includeImages:true,style:'simple',includeTimestamp:true,includeName:false,commentStyle:{bold:true,fontSize:'large',color:'#000000'}}, {source:'shikutoku',originalUrl:'https://shikutoku.me/talks/t1'}, '', true, '#ff69b4', '', true, false, true, '', 'kotoria'); const all = html.body + html.footer; console.log(all); console.log(JSON.stringify({ noBodyLeadingNewline:!/<div[^>]*class=\"t_b[^\"]*\">\\n/.test(all), normalHasBreak:/通常コメント一行目<br \\/>\\n通常コメント二行目/.test(all), bodyAfterHeader:/<\\/div>\\n<div[^>]*class=\"t_b/.test(all), blockTail:/<\\/div>\\n<br \\/>\\n<br \\/>/.test(all) })); })();"
npx tsx --eval "import { generateMatomeHTML } from './lib/html-templates'; (async () => { const talk:any={id:'t1',title:'テスト',tag_names:[]}; const comments:any[]=[{id:'c1',res_id:1,name:'nita',name_id:'A',created_at:'2026-06-03T10:58:59+09:00',body:'\\n一行目\\n\\n\\n二行目\\n',images:[],color:'#000000',fontSize:'large'}]; const html = await generateMatomeHTML(talk,comments,{includeImages:true,style:'simple',includeTimestamp:true,includeName:false,commentStyle:{bold:true,fontSize:'large',color:'#000000'}}, {source:'shikutoku',originalUrl:'https://shikutoku.me/talks/t1'}, '', true, '#ff69b4', '', true, false, true, '', 'kotoria'); console.log(html.body); console.log(JSON.stringify({ keepsLeading:/class=\"t_b[^\"]*\">\\s*<br \\/>\\s*一行目/.test(html.body), keepsMultiple:/一行目<br \\/>\\s*<br \\/>\\s*<br \\/>\\s*二行目/.test(html.body), keepsTrailing:/二行目<br \\/>\\s*<\\/div>/.test(html.body) })); })();"
npx tsc --noEmit
```

## レス移動・並び替えルール - 重要

### 原則
- **全件表示、選択済みのみ表示、タグ生成順は同じ並び基準にする。**
- 読み込み時のレスID（`res_id`）がバラバラな記事でも、ユーザーが画面上から選んだ順番・現在の画面表示順を優先する。
- 選択済みのみ表示へ切り替えた時に、レスIDの小さい順・大きい順へ並べ替わってはいけない。
- 手動移動後は、画面上の最終表示順を唯一の基準として `selectedComments` も再生成する。
- `N番の下へ` の `N` はレス番号（`res_id`）として扱い、数値比較で対象レスを探す。
- 全件表示用の位置情報（例: `commentPositions`）と選択済み配列を別々のロジックで並べ替えない。

### 禁止事項
- 移動した1レスだけに中間値（例: `targetIndex + 0.5`）を付けて済ませない。周辺レスやアンカー返信が絡むと表示順がズレる。
- 全件表示では動いていないのに、選択済みのみ表示では動いている状態を許容しない。
- 選択済み配列の挿入位置を、全件表示順とは別の推測ロジックで計算しない。
- 選択追加時に `res_id` 昇順で `selectedComments` を再ソートしない。
- `res_id` を文字列一致だけで比較しない。`"04"` と `"4"` のような表記差を避けるため、移動先解決は `Number(res_id)` で比較する。

### 実装方針
- 全件表示で使う現在の画面表示順を共通配列（例: `fullDisplayComments`）として作り、選択追加・選択済みのみ表示・手動移動の基準にする。
- 選択追加時は、内部の元配列順や `res_id` 順ではなく、`fullDisplayComments` 上の順番で `selectedComments` を整列する。
- 移動処理では、まず現在の表示順から移動対象を除外し、移動先レスの直後に挿入した `nextDisplayOrder` を作る。
- `commentPositions` は `nextDisplayOrder` 全体から再計算する。
- `selectedComments` は `nextDisplayOrder` のうち選択済みIDだけを抽出して再生成する。
- 色、文字サイズ、本文編集などの選択済みメタ情報は、既存 `selectedComments` のIDマップから引き継ぐ。

### 回帰確認
レス移動を触ったら最低限このケースを確認する：

- 選択済みレスを未選択レスの「4番の下へ」「5番の下へ」へ移動する。
- レスIDが `12, 3, 45, 8` のようにバラバラに表示されている記事で、上から順に選択し、選択済みのみ表示にしても `12, 3, 45, 8` の順を保つ。
- 全件表示で指定したレス直下に見える。
- 選択済みのみ表示でも同じ順序に見える。
- タグ生成プレビューでも同じ順序になる。
- アンカー返信（`>>1` など）が混ざっていても、手動移動後の明示順が優先される。
