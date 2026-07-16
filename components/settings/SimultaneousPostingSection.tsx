'use client';

import { HeroButton, HeroInput } from '@/components/ui/HeroControls';
import { LIFE_BLOG_ROUTING_BADGE, isLifestyleBlog } from '@/lib/blog-routing';
import type { BlogSettings } from '@/lib/types';

type TestResult = { ok: boolean; message: string };

interface SimultaneousPostingSectionProps {
  blogs: BlogSettings[];
  selectedBlogId: string | null;
  enabled: boolean;
  selectedBlogIds: string[];
  testingBlogId: string | null;
  testResults: Record<string, TestResult>;
  onChange: (enabled: boolean, selectedBlogIds: string[]) => void;
  onTest: (blog: BlogSettings) => void;
}

export default function SimultaneousPostingSection({
  blogs,
  selectedBlogId,
  enabled,
  selectedBlogIds,
  testingBlogId,
  testResults,
  onChange,
  onTest,
}: SimultaneousPostingSectionProps) {
  const candidates = blogs.filter((blog) => blog.id !== selectedBlogId && !blog.disabled);

  return (
    <section className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <h3 className="mb-3 font-bold text-gray-800">複数ブログ同時投稿</h3>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2">
          <HeroInput
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChange(event.target.checked, event.target.checked ? selectedBlogIds : [])}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-purple-500 focus:ring-purple-400"
          />
          <span className="text-sm font-bold text-purple-700">他のブログにも同時投稿する</span>
        </label>

        {enabled && candidates.length > 0 && (
          <div className="space-y-2 pl-6">
            {candidates.map((blog) => {
              const isSelected = selectedBlogIds.includes(blog.id);
              const result = testResults[blog.id];
              return (
                <div key={blog.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 p-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <HeroInput
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => onChange(
                        true,
                        event.target.checked
                          ? [...selectedBlogIds, blog.id]
                          : selectedBlogIds.filter((id) => id !== blog.id)
                      )}
                      className="h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                    />
                    <span className="truncate text-sm text-gray-700">{blog.name}</span>
                    {isLifestyleBlog(blog) && (
                      <span className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                        {LIFE_BLOG_ROUTING_BADGE}
                      </span>
                    )}
                  </label>
                  <HeroButton
                    type="button"
                    onClick={() => onTest(blog)}
                    disabled={testingBlogId === blog.id}
                    className="border border-purple-200 bg-white px-2 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50"
                  >
                    {testingBlogId === blog.id ? '確認中' : '接続テスト'}
                  </HeroButton>
                  {result && (
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      result.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result.message}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-purple-600">投稿時に選択したブログにも同じ内容が投稿されます</p>
      </div>
    </section>
  );
}
