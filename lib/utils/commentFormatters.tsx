import React from 'react';
import { LinkCard } from '@/components/LinkCard';

/**
 * 日付を「YY/MM/DD(曜日) HH:MM:SS」形式にフォーマット
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day}(${dayOfWeek}) ${hour}:${minute}:${second}`;
}

/**
 * コメントからアンカー（>>番号）を抽出
 */
export function extractAnchor(body: string): number | null {
  const match = body.match(/>>(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

/**
 * アンカー（>>番号）とURLを含むテキストを処理
 * - >>番号: 青色のアンカーリンク
 * - URL: LinkCardコンポーネントで表示
 * - 通常テキスト: 指定色で表示
 */
export function renderBodyWithAnchorsAndLinks(
  body: string,
  color: string | undefined,
  fontSize: number | undefined
): React.ReactElement[] {
  // URLとアンカーのパターンを結合（URLは括弧、句読点、改行で終了）
  const pattern = /(https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+|>>\d+)/g;
  const parts = body.split(pattern);
  const elements: React.ReactElement[] = [];
  const urls: string[] = [];

  // テキストとアンカーを処理（URLはカードのみ表示）
  parts.forEach((part, index) => {
    // URLの場合
    if (/^https?:\/\//.test(part)) {
      urls.push(part);
      // URLカードのみ表示するため、テキストリンクは表示しない
    }
    // アンカーの場合
    else if (/^>>\d+$/.test(part)) {
      elements.push(
        <span key={`anchor-${index}`} style={{ color: '#3b82f6', cursor: 'pointer' }}>
          {part}
        </span>
      );
    }
    // 通常のテキスト
    else {
      elements.push(<span key={`text-${index}`} style={{ color: color || '#000000' }}>{part}</span>);
    }
  });

  // URLカードを最後に追加
  urls.forEach((url, index) => {
    elements.push(<LinkCard key={`card-${url}-${index}`} url={url} />);
  });

  return elements;
}