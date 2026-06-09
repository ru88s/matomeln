# AGENTS.md - プロジェクトルール

## プロジェクト概要
- まとめるん: Next.js / TypeScript のまとめ記事HTML生成ツール
- Kotoriaなど外部ブログへ貼り付けるHTMLタグを発行する
- デプロイ: `npm run pages:deploy`

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
- レス本文内の通常改行は `<br />` または `<br>` として発行する。
- レス本文内の空行は `<br /><br />` または `<br><br>` として発行する。
- Kotoria向けでも空行を完全に削除しない。連続空行は最大1つの空行に圧縮する。
- レス外の余白調整用 `<br><br>` と、レス本文内の空行用 `<br><br>` を混同しない。
- `.res_div` の末尾余白はKotoria向けに最小限にするが、`.t_b` 内の改行は本文として保持する。
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
- 発行タグプレビューだけに独自の改行補正を入れない。コピー・投稿されるタグと見た目がズレる。
- textareaに表示されるHTML、プレビューHTML、投稿HTMLを別々のロジックで組み立てない。
- `.t_b>` と本文の間にテンプレート整形用の改行を入れない。通常コメントだけ上部空白が出る回帰につながる。

### 回帰テスト
Kotoria向けタグ生成やレス本文表示を触ったら、最低限このケースを確認する：

```text
一行目
二行目

三行目
```

期待されるKotoria向け発行HTML：

```html
一行目<br />
二行目<br />
<br />
三行目
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
npx tsx --eval "import { generateMatomeHTML } from './lib/html-templates'; (async () => { const talk:any={id:'t1',title:'テスト',tag_names:[]}; const comments:any[]=[{id:'c1',res_id:1,name:'nita',name_id:'A',created_at:'2026-06-03T10:58:59+09:00',body:'通常コメント一行目\\n通常コメント二行目',images:[],color:'#000000',fontSize:'large'},{id:'c2',res_id:2,name:'nita',name_id:'B',created_at:'2026-06-03T10:59:59+09:00',body:'>>1\\nアンカーコメント',images:[],color:'#000000',fontSize:'large'}]; const html = await generateMatomeHTML(talk,comments,{includeImages:true,style:'simple',includeTimestamp:true,includeName:false,commentStyle:{bold:true,fontSize:'large',color:'#000000'}}, {source:'shikutoku',originalUrl:'https://shikutoku.me/talks/t1'}, '', true, '#ff69b4', '', true, false, true, '', 'kotoria'); const all = html.body + html.footer; console.log(all); console.log(JSON.stringify({ noBodyLeadingNewline:!/<div[^>]*class=\"t_b[^\"]*\">\\n/.test(all), normalHasBreak:/通常コメント一行目<br \\/>\\n通常コメント二行目/.test(all) })); })();"
npx tsc --noEmit
```

## レス移動・並び替えルール - 重要

### 原則
- **全件表示、選択済みのみ表示、タグ生成順は同じ並び基準にする。**
- 手動移動後は、画面上の最終表示順を唯一の基準として `selectedComments` も再生成する。
- `N番の下へ` の `N` はレス番号（`res_id`）として扱い、数値比較で対象レスを探す。
- 全件表示用の位置情報（例: `commentPositions`）と選択済み配列を別々のロジックで並べ替えない。

### 禁止事項
- 移動した1レスだけに中間値（例: `targetIndex + 0.5`）を付けて済ませない。周辺レスやアンカー返信が絡むと表示順がズレる。
- 全件表示では動いていないのに、選択済みのみ表示では動いている状態を許容しない。
- 選択済み配列の挿入位置を、全件表示順とは別の推測ロジックで計算しない。
- `res_id` を文字列一致だけで比較しない。`"04"` と `"4"` のような表記差を避けるため、移動先解決は `Number(res_id)` で比較する。

### 実装方針
- 移動処理では、まず現在の表示順から移動対象を除外し、移動先レスの直後に挿入した `nextDisplayOrder` を作る。
- `commentPositions` は `nextDisplayOrder` 全体から再計算する。
- `selectedComments` は `nextDisplayOrder` のうち選択済みIDだけを抽出して再生成する。
- 色、文字サイズ、本文編集などの選択済みメタ情報は、既存 `selectedComments` のIDマップから引き継ぐ。

### 回帰確認
レス移動を触ったら最低限このケースを確認する：

- 選択済みレスを未選択レスの「4番の下へ」「5番の下へ」へ移動する。
- 全件表示で指定したレス直下に見える。
- 選択済みのみ表示でも同じ順序に見える。
- タグ生成プレビューでも同じ順序になる。
- アンカー返信（`>>1` など）が混ざっていても、手動移動後の明示順が優先される。
