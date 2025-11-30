import { Metadata } from 'next';
import { componentStyles } from '@/lib/design-system';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | まとめるん',
  description: 'まとめるんのプライバシーポリシーについて説明しています。',
};

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>

      <div className="prose prose-orange max-w-none">
        <p className="text-gray-600 mb-6">
          まとめるん（以下、「当サービス」といいます）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。
          本プライバシーポリシーは、当サービスにおける情報の取り扱いについて説明します。
        </p>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. 収集する情報</h2>
          <p className="text-gray-700 mb-3">当サービスは以下の情報を取り扱います：</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>ShikutokuのトークURL・ID（一時的な処理のみ、保存しません）</li>
            <li>選択・編集されたコメントデータ（一時的な処理のみ、保存しません）</li>
            <li>ライブドアブログAPIキー（ブラウザのローカルストレージに保存）</li>
            <li>ライブドアブログID（ブラウザのローカルストレージに保存）</li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. 情報の利用目的</h2>
          <p className="text-gray-700 mb-3">収集した情報は以下の目的で利用します：</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Shikutokuからコメントデータを取得するため</li>
            <li>まとめ記事のHTMLタグを生成するため</li>
            <li>ライブドアブログへの記事投稿を可能にするため</li>
            <li>サービスの利便性向上のため</li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. 情報の保存と管理</h2>
          <div className="text-gray-700 space-y-3">
            <p>
              <strong>ブラウザローカルストレージ：</strong>
              ライブドアブログのAPIキーとブログIDは、ユーザーの利便性のためブラウザのローカルストレージに保存されます。
              この情報はユーザーのブラウザ内にのみ保存され、当サービスのサーバーには送信・保存されません。
            </p>
            <p>
              <strong>一時的なデータ処理：</strong>
              トークURLやコメントデータは、まとめ記事の作成処理中にのみ使用され、処理完了後は保持されません。
            </p>
            <p>
              <strong>サーバーへのデータ送信：</strong>
              当サービスは独自のサーバーを持たず、すべての処理はブラウザ上で行われます。
              ただし、Shikutokuからのデータ取得とライブドアブログへの投稿時には、それぞれのAPIを通じて通信が発生します。
            </p>
          </div>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. 第三者への情報提供</h2>
          <p className="text-gray-700">
            当サービスは、以下の場合を除き、ユーザーの情報を第三者に提供することはありません：
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-3">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>ライブドアブログAPIへの投稿（ユーザーの明示的な操作による）</li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Cookie（クッキー）の使用</h2>
          <p className="text-gray-700">
            当サービスは現在Cookieを使用していませんが、将来的にサービス向上のために使用する可能性があります。
            その際は本ポリシーを更新してお知らせします。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. セキュリティ</h2>
          <p className="text-gray-700">
            当サービスは、情報の安全性を確保するため、適切な技術的措置を講じています。
            ただし、インターネット上の通信は完全に安全であることを保証することはできません。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. 外部サービスとの連携</h2>
          <p className="text-gray-700 mb-3">当サービスは以下の外部サービスと連携しています：</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li><strong>Shikutoku：</strong> コメントデータの取得元</li>
            <li><strong>ライブドアブログ：</strong> まとめ記事の投稿先</li>
          </ul>
          <p className="text-gray-700 mt-3">
            これらのサービスの利用に関しては、各サービスのプライバシーポリシーも併せてご確認ください。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. 子どものプライバシー</h2>
          <p className="text-gray-700">
            当サービスは13歳未満の子どもから意図的に個人情報を収集することはありません。
            13歳未満の方は保護者の同意を得てからサービスをご利用ください。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. プライバシーポリシーの変更</h2>
          <p className="text-gray-700">
            当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
            変更がある場合は、このページに掲載してお知らせします。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. お問い合わせ</h2>
          <p className="text-gray-700">
            本プライバシーポリシーに関するお問い合わせは、
            <a href="https://shikutoku.me/talks/6501" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 mx-1">
              ご意見ご要望ページ
            </a>
            または
            <a href="https://shikutoku.me/contact" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 mx-1">
              お問い合わせフォーム
            </a>
            からお願いします。
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            制定日：2025年9月29日<br />
            最終更新日：2025年9月29日
          </p>
        </div>
      </div>
    </div>
  );
}