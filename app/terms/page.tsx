import { Metadata } from 'next';
import { componentStyles } from '@/lib/design-system';

export const metadata: Metadata = {
  title: '利用規約 | シクマト',
  description: 'シクマトの利用規約について説明しています。',
};

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>

      <div className="prose prose-sky max-w-none">
        <p className="text-gray-600 mb-6">
          本利用規約（以下、「本規約」といいます）は、シクマト（以下、「当サービス」といいます）の利用条件を定めるものです。
          ユーザーの皆様には、本規約に従って当サービスをご利用いただきます。
        </p>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第1条（適用）</h2>
          <p className="text-gray-700">
            本規約は、ユーザーと当サービス運営者との間の当サービスの利用に関わる一切の関係に適用されるものとします。
            当サービスを利用することにより、ユーザーは本規約に同意したものとみなされます。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第2条（サービスの内容）</h2>
          <p className="text-gray-700 mb-3">当サービスは以下の機能を提供します：</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Shikutokuのトークからコメントを取得する機能</li>
            <li>取得したコメントを選択・編集・並べ替えする機能</li>
            <li>まとめ記事のHTMLタグを生成する機能</li>
            <li>ライブドアブログへの記事投稿支援機能</li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第3条（利用料金）</h2>
          <p className="text-gray-700">
            当サービスは無料でご利用いただけます。
            ただし、インターネット接続に必要な通信料金等は、ユーザーの負担となります。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第4条（禁止事項）</h2>
          <p className="text-gray-700 mb-3">ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません：</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>当サービスのサーバーまたはネットワークに過度な負荷をかける行為</li>
            <li>当サービスの運営を妨害するおそれのある行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>他のユーザーになりすます行為</li>
            <li>当サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
            <li>第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
            <li>誹謗中傷、差別、脅迫等、他者に不快感を与える行為</li>
            <li>スパム行為、営利目的の宣伝・広告行為</li>
            <li>自動化ツール（ボット、スクレイパー等）を使用した過度なアクセス</li>
            <li>その他、当サービス運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第5条（著作権）</h2>
          <div className="text-gray-700 space-y-3">
            <p>
              1. 当サービスで生成されるまとめ記事に含まれるコンテンツの著作権は、元の投稿者およびShikutokuに帰属します。
            </p>
            <p>
              2. ユーザーは、まとめ記事を作成・公開する際、著作権法その他の法令を遵守し、
              権利者の権利を侵害しないよう注意する必要があります。
            </p>
            <p>
              3. 当サービス自体のプログラム、デザイン、ロゴ等の著作権は当サービス運営者に帰属します。
            </p>
          </div>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第6条（免責事項）</h2>
          <div className="text-gray-700 space-y-3">
            <p>
              1. 当サービス運営者は、当サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、
              特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）
              がないことを明示的にも黙示的にも保証しません。
            </p>
            <p>
              2. 当サービス運営者は、当サービスに起因してユーザーに生じたあらゆる損害について、
              当サービス運営者の故意または重過失による場合を除き、一切の責任を負いません。
            </p>
            <p>
              3. 当サービス運営者は、ユーザーが作成・公開したまとめ記事の内容について一切の責任を負いません。
            </p>
            <p>
              4. 外部サービス（Shikutoku、ライブドアブログ等）の障害、仕様変更等により
              当サービスが利用できなくなった場合も、当サービス運営者は責任を負いません。
            </p>
          </div>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第7条（サービスの変更・中断・終了）</h2>
          <div className="text-gray-700 space-y-3">
            <p>
              1. 当サービス運営者は、ユーザーへの事前通知なく、当サービスの内容を変更、
              追加または削除することがあります。
            </p>
            <p>
              2. 当サービス運営者は、以下の場合には、ユーザーへの事前通知なく、
              当サービスの全部または一部の提供を停止または中断することができるものとします：
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>サービスのメンテナンスや更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、サービスの提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他、当サービス運営者がサービスの提供が困難と判断した場合</li>
            </ul>
            <p>
              3. 当サービス運営者は、当サービスの提供の停止、中断または終了により、
              ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負いません。
            </p>
          </div>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第8条（利用制限）</h2>
          <p className="text-gray-700">
            当サービス運営者は、ユーザーが本規約に違反した場合、事前の通知なく、
            当該ユーザーに対して当サービスの全部または一部の利用を制限することができるものとします。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第9条（個人情報の取り扱い）</h2>
          <p className="text-gray-700">
            当サービスの利用によって取得する個人情報については、
            当サービスの
            <a href="/privacy" className="text-sky-600 hover:text-sky-700 mx-1">プライバシーポリシー</a>
            に従い適切に取り扱うものとします。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第10条（通知）</h2>
          <p className="text-gray-700">
            ユーザーへの通知は、当サービス上での掲示により行うものとします。
            当サービス運営者は、個別の通知を行う義務を負いません。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第11条（権利義務の譲渡禁止）</h2>
          <p className="text-gray-700">
            ユーザーは、当サービス運営者の書面による事前の承諾なく、
            利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、
            または担保に供することはできません。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第12条（準拠法・管轄裁判所）</h2>
          <div className="text-gray-700 space-y-3">
            <p>
              1. 本規約の解釈にあたっては、日本法を準拠法とします。
            </p>
            <p>
              2. 当サービスに関して紛争が生じた場合には、
              当サービス運営者の所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </div>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第13条（規約の変更）</h2>
          <p className="text-gray-700">
            当サービス運営者は、必要と判断した場合には、ユーザーに通知することなく、
            いつでも本規約を変更することができるものとします。
            変更後の規約は、当サービス上に掲示された時点から効力を生じるものとします。
          </p>
        </section>

        <section className={`${componentStyles.card.base} mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">第14条（お問い合わせ）</h2>
          <p className="text-gray-700">
            本規約に関するお問い合わせは、
            <a href="https://shikutoku.me/talks/6501" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 mx-1">
              ご意見ご要望ページ
            </a>
            または
            <a href="https://shikutoku.me/contact" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 mx-1">
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