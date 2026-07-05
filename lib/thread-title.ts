function isMojibakeLikeCodePoint(codePoint: number): boolean {
  return (
    codePoint === 0xfffd ||
    codePoint === 0x00 ||
    (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d) ||
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
    (codePoint >= 0x100000 && codePoint <= 0x10fffd) ||
    (codePoint >= 0xe0000 && codePoint <= 0xe007f)
  );
}

export function sanitizeThreadTitle(title: string): string {
  let cleaned = '';

  for (const char of title) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined || isMojibakeLikeCodePoint(codePoint)) {
      continue;
    }
    cleaned += char;
  }

  return cleaned
    .replace(/[（(]\s*[）)]/g, '')
    .replace(/[【\[]\s*[】\]]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([!！?？、。，．:：;；）\]】〉》])/g, '$1')
    .trim();
}
