export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          使い方
        </h1>
        <p className="text-gray-600">
          シクマトは、Shikutokuのトークから気になるコメントを選んで、
          ブログ記事用のHTMLを生成できる無料ツールです。
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            基本的な使い方
          </h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">トークを読み込む</p>
                <p className="text-sm text-gray-600 mt-1">
                  ShikutokuのトークURLをコピーして入力欄に貼り付けます。
                  URLの例: https://shikutoku.me/talks/123
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ※トークIDのみ（例: 123）を入力することも可能です
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">コメントを選択</p>
                <p className="text-sm text-gray-600 mt-1">
                  読み込んだトークのコメント一覧から、まとめに含めたいコメントをチェックボックスで選択します。
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ※ドラッグ＆ドロップで順番を自由に変更できます
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">オプションを設定</p>
                <p className="text-sm text-gray-600 mt-1">
                  生成するHTMLのスタイルや、画像・投稿時刻・名前の表示有無を選択します。
                </p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>・シンプル: 基本的なHTML</li>
                  <li>・リッチ: CSS付きの見栄えの良いHTML</li>
                </ul>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">HTMLを生成してコピー</p>
                <p className="text-sm text-gray-600 mt-1">
                  「HTMLを生成」ボタンをクリックして、生成されたHTMLをコピーします。
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ※プレビューボタンで実際の表示を確認できます
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">
                5
              </span>
              <div>
                <p className="font-medium text-gray-900">ブログに貼り付け</p>
                <p className="text-sm text-gray-600 mt-1">
                  コピーしたHTMLをライブドアブログなどのブログサービスのHTML編集画面に貼り付けて公開します。
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          よくある質問
        </h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Q: 利用料金はかかりますか？</p>
            <p className="text-sm text-gray-600 mt-1">
              A: 完全無料です。登録も不要で、すぐにご利用いただけます。
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900">Q: 生成したHTMLはどこで使えますか？</p>
            <p className="text-sm text-gray-600 mt-1">
              A: ライブドアブログ、FC2ブログ、Amebaブログなど、HTML編集に対応したブログサービスで利用できます。
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900">Q: 画像は含められますか？</p>
            <p className="text-sm text-gray-600 mt-1">
              A: はい、オプションで「画像を含める」にチェックを入れると、コメントに添付された画像も含めることができます。
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900">Q: 元のトークへのリンクは自動で付きますか？</p>
            <p className="text-sm text-gray-600 mt-1">
              A: はい、各コメントと記事の最後に元のShikutokuトークへのリンクが自動的に付与されます。
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900">Q: コメントは何件まで選択できますか？</p>
            <p className="text-sm text-gray-600 mt-1">
              A: 最大500件（10ページ分）まで読み込み、その中から自由に選択できます。
            </p>
          </div>
        </div>
      </div>

      <div className="bg-pink-50 rounded-2xl p-6 border border-pink-200">
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          💡 ヒント
        </h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• 長いトークの場合、検索機能を使って特定のコメントを素早く見つけられます</li>
          <li>• 「選択中のみ表示」にチェックを入れると、選んだコメントだけを確認できます</li>
          <li>• プレビュー機能で、実際のブログでの表示を確認してから公開することをおすすめします</li>
          <li>• リッチスタイルは見栄えが良いですが、ブログによってはCSSが反映されない場合があります</li>
        </ul>
      </div>
    </div>
  );
}