# Wholesale Motion Studio — Design and Interaction Guide

This is the complete Laravel + React project with new interaction-focused visual upgrades.
The Laravel API, tenant handling, pricing, cart, checkout, orders and admin logic have **not** been changed.

## Switchable color palettes (no green-dominant themes)

The **Theme** chooser appears in the storefront/admin header and on the login screen.
The choice is persisted in `localStorage` under `b2b-wholesale-ui-theme` and is applied before React mounts to prevent palette flashing.

| Theme | Structure | Main action | Highlight |
| --- | --- | --- | --- |
| Cobalt & Coral (default) | `#17245D` | `#425BFF` | `#FF775C` |
| Orchid & Pink | `#28174E` | `#9152E8` | `#F45C9A` |
| Graphite & Amber | `#20283B` | `#AB612D` | `#F7B34B` |

The fallback green for **stock in stock/success** can still appear as a semantic status cue, not as the brand color.

## New React image transitions

- **Product gallery** (`frontend/src/components/ProductGallery.jsx`): desktop cursor-driven image-inspection lens and separate 2.5× preview. Works with even one image. Moves with the pointer via CSS custom properties and one scheduled animation frame, avoiding React state churn on every pointer movement.
- **Detail lightbox**: click/tap a main image to expand, click enlarged image for an extra zoom, use arrows, thumbnail selection, keyboard Left/Right/Escape, and swipe on touch.
- **Product cards** (`frontend/src/components/ProductCard.jsx`): subtle cursor-following 3D tilt, moving specular sheen, image zoom and crossfade to a second product image if one exists. The link still navigates to the product detail page.
- **General interactions**: button sheen and press, page/card entrances, themed side navigation and table hover, staggered grid items, clickable category transitions, zoomable detail thumbnails.

Motion is suppressed for `prefers-reduced-motion: reduce`; the magnifier is automatically hidden on touch/small displays and the fullscreen viewer is available instead.

## Files changed

- `frontend/src/components/ProductGallery.jsx`
- `frontend/src/components/ProductCard.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/ui/ThemeSwitcher.jsx` (new)
- `frontend/src/pages/Login.jsx`
- `frontend/src/styles/motion-themes.css` (new)
- `frontend/src/main.jsx`

## Start on Windows

From the project root, use the included `SETUP_WINDOWS.cmd`, then `START_WINDOWS.cmd`, after setting your Laravel `.env` and tenant database configuration. Or run:

```bat
cd frontend
npm ci
npm run build
npm run dev
```

The source ZIP intentionally excludes `.env`, credentials, runtime caches, composer `vendor/`, and npm `node_modules/`.

## Production checks

Static JS/JSX, CSS and PHP syntax checks can be run offline. A successful connected end-to-end test of login, tenant-specific pricing, image loading, cart, checkout and payments must still be performed against your actual backend before deploying.
