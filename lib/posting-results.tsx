export type BlogPostResult = {
  name: string;
  status: 'posted' | 'skipped' | 'failed';
  reason?: string;
};

const STATUS_LABELS: Record<BlogPostResult['status'], string> = {
  posted: '投稿済み',
  skipped: 'スキップ',
  failed: '失敗',
};

const STATUS_CLASSES: Record<BlogPostResult['status'], string> = {
  posted: 'bg-green-50 text-green-700 border-green-200',
  skipped: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export function buildBlogPostResultToast(results: BlogPostResult[]) {
  const postedCount = results.filter((result) => result.status === 'posted').length;
  const skippedCount = results.filter((result) => result.status === 'skipped').length;
  const failedCount = results.filter((result) => result.status === 'failed').length;

  return (
    <div className="min-w-[280px] max-w-[420px] text-sm">
      <div className="font-bold text-gray-900">投稿処理が完了しました</div>
      <div className="mt-1 text-xs text-gray-500">
        投稿 {postedCount}件 / スキップ {skippedCount}件 / 失敗 {failedCount}件
      </div>
      <div className="mt-3 space-y-1.5">
        {results.map((result) => (
          <div key={`${result.name}-${result.status}-${result.reason || ''}`} className="flex items-start gap-2">
            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-bold ${STATUS_CLASSES[result.status]}`}>
              {STATUS_LABELS[result.status]}
            </span>
            <span className="min-w-0 flex-1 text-gray-800">
              <span className="font-semibold">{result.name}</span>
              {result.reason ? <span className="text-gray-500">: {result.reason}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
