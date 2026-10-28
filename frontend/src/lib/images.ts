export const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" fill="none">
       <rect width="300" height="400" fill="#f5f5f4"/>
       <path d="M110 130l30-20v-10a10 10 0 0110-10h10a10 10 0 0110 10v10l30 20 20 40-30 20v90h-80v-90l-30-20z"
             stroke="#d6d3d1" stroke-width="3" fill="none"/>
     </svg>`,
  );

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return PLACEHOLDER;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  // Absolute path from server, e.g. /uploads/foo.jpg
  if (url.startsWith("/")) return url;
  // Relative path without leading slash, e.g. uploads/foo.jpg
  if (url.startsWith("uploads/")) return `/${url}`;
  // Bare filename — assume it lives in /uploads
  return `/uploads/${url}`;
}
