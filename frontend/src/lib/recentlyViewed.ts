const KEY = "atelier_recently_viewed";
const MAX = 8;

export function recordView(productId: number) {
  try {
    const raw = localStorage.getItem(KEY);
    const ids: number[] = raw ? JSON.parse(raw) : [];
    const filtered = ids.filter((x) => x !== productId);
    filtered.unshift(productId);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {
    // ignore
  }
}

export function getRecentlyViewedIds(excludeId?: number): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const ids: number[] = raw ? JSON.parse(raw) : [];
    return excludeId ? ids.filter((x) => x !== excludeId) : ids;
  } catch {
    return [];
  }
}
