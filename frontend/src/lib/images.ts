// src/lib/images.ts
//
// Single source of truth for turning a backend image path into a URL the
// browser can load. No imports from ./api to avoid a circular dependency,
// and PLACEHOLDER is declared *before* resolveImageUrl uses it.

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL ?? 'http://127.0.0.1:8000';

/**
 * Inline SVG garment silhouette used when there's no image or the image fails
 * to load. Kept as a data URI so it never triggers a network request.
 */
export const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" fill="none">
       <rect width="300" height="400" fill="#f5f5f4"/>
       <path d="M110 130l30-20v-10a10 10 0 0110-10h10a10 10 0 0110 10v10l30 20 20 40-30 20v90h-80v-90l-30-20z"
             stroke="#d6d3d1" stroke-width="3" fill="none"/>
     </svg>`
  );

/**
 * Accepts any of:
 *   - null / undefined / ''              -> PLACEHOLDER
 *   - 'data:...' / 'blob:...' / http(s)  -> returned as-is
 *   - 'uploads/xxx.jpg'                  -> `${API_BASE}/storage/uploads/xxx.jpg`
 *   - 'storage/uploads/xxx.jpg'          -> `${API_BASE}/storage/uploads/xxx.jpg`
 *   - '/storage/uploads/xxx.jpg'         -> `${API_BASE}/storage/uploads/xxx.jpg`
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return PLACEHOLDER;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  let path = url;
  if (path.startsWith('/')) path = path.slice(1);
  path = path.replace(/^storage\//, '');

  return `${API_BASE}/storage/${path}`;
}