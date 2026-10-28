# Wholesale UI Enhancement V12

## Scope

This release refines the existing React/Vite buyer storefront and Laravel wholesale platform without replacing the auth, pricing, inventory, cart, checkout, order, messaging, product catalog, or admin API workflows.

### UI changes

- **Fixed buyer sidebar** on desktop. The sidebar is anchored to the viewport below the 75px sticky header. Only its navigation content scrolls. Its profile block remains at the bottom.
- **Persisted collapsible sidebar**: 268px full-width mode and 80px icon-only mode; state is stored in browser localStorage. The content width adjusts accordingly.
- **Accessible mobile drawer** below 1200px: backdrop, Escape-to-close, keyboard focus loop and body scroll locking. Collapse preference only applies to desktop.
- **Refined trade palette**: carbon navy, cobalt blue, coral highlights, warmer neutral surfaces. Legacy CSS remains available for existing pages, with one final `styles/trade-v12.css` layer controlling the updated appearance.
- **Workspace subheader** with breadcrumbs, search and fast-order action.
- **Buyer dashboard pulse bar** connected to the existing quick-order route, plus upgraded hero, KPI and feature-tile treatments.
- **Catalog procurement shortcuts** linking to the saved-products and real fast-order screens.
- **Product card image and interaction polish**: tighter visual hierarchy, subtle elevation, optional pointer tilt and image zoom on supported devices.
- **Product suggestions**: the existing catalog-backed recommendations are retained, with stronger visual styling and clearer headings.
- **Compact footer**: avoids duplicated mobile navigation, improves responsive layout, uses only real routes.
- **Scroll-to-top** control shown after scrolling, with reduced-motion support and mobile purchase-page safeguards.
- **Admin navigation** collapse preference persists across sessions; admin tables and controls gain visual refinements.

### Important files

- `frontend/src/components/Layout.jsx`
- `frontend/src/components/StudioSidebar.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/components/ui/BackToTop.jsx` (new)
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/ProductList.jsx`
- `frontend/src/pages/ProductDetail.jsx`
- `frontend/src/components/AdminLayout.jsx`
- `frontend/src/styles/trade-v12.css` (new)
- `frontend/src/main.jsx`

### Validation completed

- 72 JS/JSX files passed TypeScript's syntax parser.
- 48 CSS files passed tinycss2 top-level parsing.
- 278 frontend relative imports resolved locally.
- 190 PHP files passed `php -l` syntax checks.
- ZIP archive integrity verified.

**Not yet validated:** a complete Vite production build, browser interaction tests across authenticated roles, and end-to-end API/database behavior. Offline `npm ci` was blocked because the local npm cache does not contain `yallist@3.1.1`. Do not deploy to production until `npm ci`, `npm run build`, and real role-based regression tests pass locally.

## Setup

1. Extract the archive to your local PHP/Node development directory.
2. Preserve your existing `.env`, database, tenant domain and storage configuration. Secrets are intentionally not bundled.
3. Open a terminal inside `b2b_wholesale/frontend`.
4. Run `npm ci` then `npm run dev`. Build with `npm run build` before deployment.
5. Run the existing Laravel backend using the project README's instructions.
6. Test dealer login, catalog visibility, tiered prices, cart, checkout, order history, admin operations and mobile navigation with your tenant database.

### Notes

- The project uses **React + custom CSS**, not a currently active Tailwind pipeline, so no Tailwind migration is introduced.
- No fictional tenant or warehouse APIs were added.
- Browser-native motion preferences are respected using `prefers-reduced-motion`.
