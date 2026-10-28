# WHOLESALE — Arcwell Trade OS (UI Reconstruction)

This is a **complete source tree** for the existing B2B wholesale platform with a redesigned React interface and the existing Laravel backend. Existing authentication, multi-tenant pricing, cart, inventory, checkout, orders, notifications, reporting, chat, and administration handlers are **not rewritten**; they remain tied to the same APIs.

## What's actually different

This is not a mockup or only a button recolor. The following React interface components were added or substantially refactored:

| Area | Change |
|------|--------|
| Commerce shell | Trading information ribbon, redesigned two-tone e-commerce navigation, accessible skip link |
| Buyer dashboard | New layered merchandising hero, sourcing workflow visualization, fast task shortcuts, dynamic metrics, product shelves |
| Product catalog | Data-driven hero, new desktop category/availability rail, existing advanced filter drawer, category tiles, entirely restructured product cards |
| Product card | New image composition, stock indicator, MOQ/price hierarchy, real price + discount handling, subtle image zoom |
| Product details | Updated gallery/purchase information visual hierarchy and trade pricing surface |
| Admin dashboard | Real-data operational brief showing pending orders, low-stock items and active partners, with deep links to existing tools |
| Admin pages | Consistent polished sidebar, stat cards, tables and action hierarchy across existing screens |
| Cart + checkout | New navigation step indicator while preserving original cart/payment logic |
| Orders, wishlist, profile | Connected account navigation and updated shared visual language |
| Login | New editorial/commerce layout, same dealer OTP and admin password login handlers |

### Design tokens

Primary midnight `#0B203F`, B2B teal `#007F78`, commerce blue `#2256C8`, coral `#F4764A`, mist `#F2F6F5`, white `#FFFFFF`. Display: Plus Jakarta Sans. Body: Inter. Mono: IBM Plex Mono. The palette and custom elements live in `frontend/src/styles/arcwell.css`. Existing component styles remain as compatibility foundations for the many other functional pages; the final imported stylesheet determines the overall appearance. Ambient and hover transitions are removed when the OS requests reduced motion.

## Local Windows (WAMP) setup

**Prerequisites:** PHP compatible with your `composer.json`, Composer, Node.js/npm, MySQL, and a configured domain-per-tenant database.

1. Extract ZIP; open the `b2b_wholesale` folder.
2. Run `SETUP_WINDOWS.cmd` to install Composer/npm dependencies and create `.env` copies. **Do not overwrite your existing production `.env`**; this archive intentionally excludes private credentials.
3. Configure Laravel `.env` for your central database, tenant database, and services; if migrating an existing installation, reuse the correct values. Tenant/domain records and data must already exist or be set up using the project's tenancy commands.
4. The React dev proxy targets `http://abctraders.localhost:8000` by default; `abctraders.localhost` should resolve to `127.0.0.1`. Change `VITE_BACKEND_ORIGIN` in `frontend/.env` for a different tenant. Set `VITE_API_BASE_URL=/api` for local Vite-proxied requests.
5. Run `START_WINDOWS.cmd`. Browse to `http://127.0.0.1:5173`.

**Command-line alternative** (two terminals):

```powershell
# Laravel backend (after .env and composer install)
php artisan serve --host=127.0.0.1 --port=8000

# React frontend, from /frontend
npm ci
npm run dev
npm run build
```

### Database and uploads

- **Never run `migrate:fresh` on a real business database.** New source code does not include your private DB, tenant credentials or secrets.
- The archive retains the original `storage/app/public` files (product/misc images) but omits caches, compiled views, logs, sessions and non-public storage. After setting up Laravel, run `php artisan storage:link` if needed.
- No seeded credentials are guaranteed to exist in your DB. The original project's tenant account setup remains authoritative.
- For production, compile `frontend` using `npm run build`, deploy behind your Laravel domain setup, and complete a real login/order/payment/browser smoke test first.

## Verification performed

- All React/JS modules parsed with the available TypeScript JSX parser, and relative imports were resolved.
- All CSS parsed using PostCSS.
- Laravel PHP syntax checked using `php -l`.
- Frontend lockfile passed `npm ci --dry-run --offline`.
- Full Vite production compilation, database tenant boot, and authenticated browser testing could not be completed in the editing environment. **Do not interpret static checks as a production readiness certification.**

## Unchanged function paths

Backend controllers, services, migrations, routes, and pricing/stock/posting business logic are intentionally preserved. New UI links are to existing routes, and new page metrics use existing `dashboard` API responses rather than fabricated figures.
