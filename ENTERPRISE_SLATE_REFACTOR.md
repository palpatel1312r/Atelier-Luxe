# Trade Desk — Enterprise Slate Refactor

This project contains the existing Laravel API and React/Vite wholesale application, with an incremental design-system upgrade oriented toward operational density, accessibility and B2B buying.

## Design tokens

The visual authority is `frontend/src/styles/enterprise-slate.css`, imported after the previous CSS by `frontend/src/main.jsx`. It provides CSS variables in HSL and an optional OKLCH brand enhancement. Core palette:

| Role | Value |
|---|---|
| Executive text / sidebar | `#0F172A` |
| Royal Blue action | `#2563EB` |
| Hover Blue | `#1D4ED8` |
| App canvas | `#F8FAFC` |
| Panel | `#FFFFFF` |
| Subdued surface | `#F1F5F9` |
| Borders | `#E2E8F0` |
| Success | `#059669` |
| Warning | `#D97706` |
| Danger | `#E11D48` |
| Info | `#0284C7` |

Typography uses Inter with system fallback, semibold and bold headings, tabular numerals for financial values, 8–18px corner radii and restrained elevation.

The repository's actual frontend is React with custom CSS, not an active Tailwind implementation. CSS variables let the same design migrate to Tailwind configuration later without breaking the existing application. **This update does not claim to install or migrate to Tailwind.**

## Implemented changes

- Buyer navigation is collapsible on wide screens; below 1050px, a dismissible off-canvas drawer with a blurred backdrop is used. Navigation grouped by Catalog, Bulk Orders, Account.
- Admin workspace continues to support its existing collapse and mobile drawer and gains a role-aware command search.
- `Ctrl/Cmd+K` opens a keyboard-first command palette on authenticated buyer and admin pages (navigation only). The current currency display reflects the existing INR pricing, not a fictitious FX conversion.
- Fast order pad (`/fast-order`): debounced product/SKU lookup, variant selection from actual product detail, quantity fields, indicative line totals, density setting and direct addition to the existing `/cart/items` endpoint. This is a **basket entry pad**, not a new Purchase Order backend workflow. Each addition is validated by existing APIs.
- Product detail now renders live quantity slabs as interactive pill tiers. Quantity changes continue to use the existing product pricing endpoint.
- Admin inventory: sticky product/action columns, compact/comfortable density, mobile card layout and floating selection toolbar using existing bulk-action endpoint options. Unsupported actions (bulk price update, invoice creation) were not fabricated.
- Consistent illustrated empty states on admin inventory and buyer order history.
- Order detail tax ledger uses recorded subtotal/tax/discount/grand-total fields. It links to a PDF only if `gst_invoice_url` exists; it does not invent missing tax breakdowns or downloadable invoice files.
- Respects `prefers-reduced-motion` for entrance, button, and off-canvas animations.

## Setup

Keep your current database and tenant configuration. Do not reset existing databases. On Windows, use the bundled `SETUP_WINDOWS.cmd` and `START_WINDOWS.cmd` after reviewing `.env.example` and `frontend/.env.example`, or run:

```
cd frontend
npm ci
npm run build
npm run dev
```

Laravel also requires Composer dependencies and a correctly configured `.env` and tenant database. `.env`, private invoice files, installed packages, and logs are intentionally excluded.

## Verification boundaries

JS/JSX, CSS and PHP are checked for syntax and local relative imports are checked for existence. A Chromium **static layout fixture** was checked at 360, 390, 768, 1024, and 1440px. These tests are not an authenticated end-to-end test. Full Vite build cannot be completed in the editing environment because `npm ci --offline` has no cached `yallist@3.1.1` tarball. Run `npm ci && npm run build` in an environment with npm access and test against your configured tenant APIs before deployment.
