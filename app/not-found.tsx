import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-sm font-medium text-gray-500">404</p>
      <h1 className="text-2xl font-bold text-gray-900">ページが見つかりません</h1>
      <Link href="/" className="text-sm font-semibold text-orange-600 hover:underline">
        まとめるんに戻る
      </Link>
    </main>
  );
}
