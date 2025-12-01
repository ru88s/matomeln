import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "使い方 - まとめるん",
  description: "まとめるんの使い方を詳しく解説。5ch、open2ch、Shikutokuのスレッドから簡単にまとめ記事を作成できます。キーボードショートカットやカスタマイズ機能も紹介。",
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '利用料金はかかりますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '完全無料です。登録も不要で、すぐにご利用いただけます。',
        },
      },
      {
        '@type': 'Question',
        name: 'どのブログサービスで使えますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'HTML編集に対応したブログサービス（ライブドアブログ、FC2ブログ、はてなブログ、Amebaブログなど）でご利用いただけます。特にライブドアブログは自動投稿にも対応しています。',
        },
      },
      {
        '@type': 'Question',
        name: 'コメントの順番は変更できますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、「レスの並び替え」モードを有効にすると、選択したコメントのみが表示され、ドラッグ&ドロップで順番を変更できます。また、番号を指定して特定のコメントの下にピンポイントで移動することも可能です。',
        },
      },
      {
        '@type': 'Question',
        name: '画像も含められますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、コメントに添付された画像は自動的に含まれます（最大200pxにリサイズ）。',
        },
      },
      {
        '@type': 'Question',
        name: '生成後に編集はできますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、生成されたタイトル・本文・続きを読むのテキストエリアは全て編集可能です。自由にカスタマイズしてからコピー・投稿してください。',
        },
      },
      {
        '@type': 'Question',
        name: '対応している掲示板は？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '現在、5ch（5ちゃんねる）、open2ch（おーぷん2ちゃんねる）、Shikutokuに対応しています。',
        },
      },
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'ホーム',
        item: 'https://matomeln.pages.dev',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '使い方',
        item: 'https://matomeln.pages.dev/about',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
