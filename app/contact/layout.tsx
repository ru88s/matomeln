import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お問い合わせ | まとめるん',
  description: 'まとめるんへのお問い合わせ・バグ報告ページです。',
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
