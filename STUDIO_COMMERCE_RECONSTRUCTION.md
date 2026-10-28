# Studio Commerce — B2B wholesale redesign

This release reconstructs the React presentation layer on top of the existing Laravel application. Business rules, database schemas, tenant logic, payment handling, API endpoints, and API service calls have **not been rewritten**.

## What changed

- Buyer UI: persistent desktop trade workspace sidebar, new page hierarchy, utility header, contextual breadcrumbs, compact mobile tab navigation and lighter editorial canvas.
- Authentication: entirely new split-form layout and dimensional merchandising artwork; dealer OTP and admin email/password flows still call their original endpoints.
- Dashboard: data-driven merchandising hero and new React bento-style sourcing shortcuts, responsive KPI cards, product discovery sections.
- Marketplace: new product hero that displays images from the real product API, reorganized introduction, preserved category browsing, sorting, stock filters, search and server pagination.
- Product cards: rebuilt semantics and DOM, differentiated product photography mats, hover perspective tilt, photo carousel with touch swipe and accessible buttons, focusable links and quick-view action.
- Product detail: updated copy and layout presentation, existing contained zoom/lightbox, pricing, variants, stock and buy flow retained.
- Buyer account: redesigned visual structure of basket, checkout, order history and profile; fulfillment logic and API calls unchanged.
- Admin workspace: new visual system for admin layout, dashboard focus panel, order desk, inventory, data tables and edit forms while retaining original operations and permissions.
- Accessibility: prefers-reduced-motion + existing Calm motion setting, touch-friendly photo controls, keyboard focus, horizontal table scrolling, and constrained content at mobile widths.

## Visual language

| Token | Default |
| --- | --- |
| Ink | `#171B2D` |
| Electric violet | `#5546F2` |
| Papaya | `#F57550` |
| Butter | `#F8E289` |
| Off-white | `#FAF8F4` |
| Lavender | `#DFDCFF` |

The existing color switcher remains supported. It changes the accent hues without altering data or business behavior. Font fallback is included for offline usage.

## Windows installation

1. Extract the ZIP. Open the `b2b_wholesale` root folder.
2. Retain or reconfigure your existing Laravel `.env`, tenants, databases, credentials, and public storage symlinks. No secrets are bundled.
3. If provided, use `SETUP_WINDOWS.cmd` as the installer guide. Alternatively install the Laravel dependencies with `composer install` and the frontend dependencies in `frontend` with `npm ci`.
4. Run `php artisan key:generate` **only** when creating a fresh environment, not to replace a deployed key.
5. Start the Laravel application configured for your tenant URLs, then from the frontend folder run `npm run dev`.
6. Before deployment run `npm run build` and test admin login, dealer OTP, catalog/filtering, pricing/variants, cart, checkout, order history, admin fulfillment and mobile devices with a populated tenant database.

## Verification scope

This archive is source code, not a live deployment. Parsing, import resolution, and PHP syntax checks are performed during packaging. A browser layout smoke test used a **representative static page** at five viewport sizes. This is not the same as an authenticated end-to-end test. A production Vite build cannot be certified in the offline build environment because an npm dependency tarball is not cached. Install dependencies on your machine to run that final build.

The existing root and frontend package manifests, plus `frontend/package-lock.json`, are preserved. No extra animation library is required. The new primary UI stylesheet is `frontend/src/styles/studio-commerce.css`; the new buyer shell and interactive components live in `frontend/src/components`.
