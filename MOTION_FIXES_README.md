# Product Gallery & Catalog Overlay Fixes

This archive is based on **B2B Wholesale Motion Studio**, with small corrective changes only. The Laravel backend, routes, controllers, pricing rules, cart, checkout, and payment logic are unchanged.

## Fixes

1. **Contained product image zoom** — on supported desktop pointers, hovering the primary photo magnifies it *inside its own image frame*. The old absolutely positioned 600px zoom pane was removed because it overlapped the product title, pricing, variant selector, and purchase controls, and could be clipped into a narrow strip by legacy CSS. Click/tap the main image to open the existing full-screen lightbox. The thumbnail selector, gallery arrows, Escape-to-close, arrow keys, and mobile swipe navigation remain available.
2. **Gallery stacking, control, and image-frame cleanup** — navigation buttons and the image expansion target are independent accessible buttons; the overlay image has no phantom border or background from old themes. Magnification is disabled for touch and under 1101px, with reduced-motion support.
3. **Catalog filter modal** — the filter sheet now renders into `document.body` as a dialog with an explicit z-index, scroll locking, Escape, close button focus, and backdrop dismissal. This prevents dimmed/blurred catalog pages with a hidden or clipped drawer inside a transformed page container.
4. **Rapid catalog queries** — stale search/filter requests are aborted, and previous responses cannot replace results for a newer query.
5. **Product details cache cleanup** — cached product refreshes now correctly clean up when changing pages, and the selected variant resets when the refreshed product has no variants.

## Local setup (Windows)

Keep your current tenant/database `.env` files and copy them to the updated source if you are replacing the folder. In `b2b_wholesale/frontend`:

```bash
npm ci
npm run build
npm run dev
```

Then check: catalog → **Sort & Filter** (both desktop and tablet), product → hover photo, click to expand, change photos, and open the mobile gallery. Full authenticated browser and API regression tests still require your configured environment.
