# B2B Wholesale — Premium UI Edition

This archive contains the original Laravel backend, React/Vite frontend and public product assets with a redesigned user interface. The backend service/data contracts and application routes have been preserved.

## Quick start

1. **Backend**: from the project root run `composer install`, copy `.env.example` to `.env`, configure database/tenancy, run `php artisan key:generate`, then follow the project's original `README.md` for migrations, tenant setup and `php artisan serve`.
2. **Frontend**: from `frontend/`, run `npm ci` and `npm run dev`. For production assets use `npm run build`.
3. **API host**: `frontend/src/api/client.js` and `frontend/vite.config.js` currently refer to `abctraders.localhost:8000`. Keep or change these together for your environment.

## What changed

The interface now uses a navy / cobalt / teal / coral design system, modern typography, desktop admin navigation with accessible tablet drawer, professionally surfaced tables, catalog cards, inventory and orders pages, new admin dashboard panels and loading skeletons. See `DESIGN_SYSTEM.md` for all color hex values, component behavior, responsive breakpoints and screen coverage.

## Packaging and validation

- Excluded generated dependencies (`node_modules/`, `dist/`), temporary caches, `.env`, logs and uploaded private invoice PDFs. No deployment secrets are included by intent.
- Preserved public product/misc images from the provided project; these may need `php artisan storage:link` in your environment.
- Checked all frontend JS/JSX files with Babel parser and stylesheets with PostCSS parser.
- A full Vite bundle **was not verified** in this environment due to Windows-native optional packages in the original uploaded `node_modules` archive. Install dependencies afresh on your machine and run `npm run build`.
- Backend application and business logic were not rewritten as part of the UI redesign. Regression testing against your actual tenant data is still recommended before production deployment.
