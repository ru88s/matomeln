// Read-only thread downloads may retry; blog POST requests must not use this helper.
export async function fetchThreadBytes(url: string, headers: HeadersInit): Promise<{ status: number; buffer: ArrayBuffer }> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) });
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
        await response.body?.cancel();
        continue;
      }
      // Keep the deadline active until the response body has arrived too.
      return { status: response.status, buffer: await response.arrayBuffer() };
    } catch (error) {
      if (attempt > 0) throw error;
    }
  }
}
