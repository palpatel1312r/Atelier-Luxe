# Meridian Commerce — UI redesign guide

This is a **presentation-focused redesign** of the existing B2B Wholesale application. The React routes, API endpoints, authentication, roles, database models, pricing, orders, stock actions, and Laravel backend are intentionally unchanged. The components still display real API data; visual mock data is not inserted into the storefront.

## Brand direction

**Positioning:** premium, confident B2B commerce without consumer-marketplace clutter. The experience balances a dramatic commerce-blue surface with clean merchandising space, clear trade pricing, and subtle coral attention cues.

| Role | Token | HEX | Typical use |
|---|---|---|---|
| Midnight structure | `--navy` | `#0B2442` | Navigation, merchandising banners, sign-in |
| Commerce blue | `--blue` | `#2562CF` | Focus, supporting affordances |
| Trade teal | `--teal` | `#078B86` | Primary actions, availability, links |
| Deep teal | `--teal-deep` | `#006965` | Accessible text accents |
| Coral | `--coral` | `#F07855` | Promotions, hero calls to action, selected emphasis |
| Porcelain | `--paper` | `#F3F7F9` | App background |
| Ink | `--ink` | `#152F47` | Primary text |
| Muted ink | `--ink-soft` | `#60768C` | Secondary text |
| Light edge | `--rule` | `#DCE7EE` | Delicate surfaces and borders |

**Typography:** Plus Jakarta Sans for headings and hero statements; Inter for controls and body; IBM Plex Mono for monetary/identifier treatments inherited from the existing system. Fonts have local system fallbacks when Google Fonts is unavailable.

**Layout system:** responsive 4/8px rhythm; primary desktop content max-width 1520px; 20–29px cards; airy 18–26px gaps; explicit content hierarchy (eyebrow → title → supporting copy → actions → API data).

**Motion:** ease-out entrances, hover elevation, gentle floating hero art; disabled for users requesting reduced motion. No animated numeric KPIs or misleading fabricated graphs.

## Notable updates

- **Sign-in:** midnight-to-teal split experience and calmer form surface. The existing dealer OTP and admin password flows remain intact.
- **Buyer dashboard:** visual merchandising hero with a commerce logistics illustration, clearer CTAs, color-coded KPI panels, and existing API product sections.
- **Catalog:** editorial featured hero, result heading, filter toolbar, category chips, redesigned product tiles and original category/search/pagination behavior.
- **Product detail:** photography-forward gallery and a clear teal purchase-price panel; existing quantity, slab, cart and wishlist logic untouched.
- **Order history / detail:** stronger purchase overview, structured order cards, clear action links and order-status styling.
- **Admin dashboard, inventory, orders:** midnight/teal command-center banners, readable denser data tables, refined filters and cards.
- **Other workflows:** checkout, cart, chat, settings/profile, modals, mobile navigation, footer, placeholders and shared forms use the same token system.
- **Site-wide buyer assurance strip:** describes existing catalog, pricing and reordering capabilities without unverifiable claims.

## Source change map

The principal stylesheet is `frontend/src/styles/meridian.css` imported **last** in `frontend/src/main.jsx`. It builds on the existing `global.css`, `premium.css`, and `aurora.css` to minimize risky changes to component behavior. New decorative public SVG: `frontend/public/commerce-scene.svg`.

Copy/layout edits touch `Login.jsx`, `ProductList.jsx`, `ProductCard.jsx`, the buyer/admin dashboards, buyer orders, product detail, header, footer, and shared buyer layout. The Laravel backend and API contracts are untouched.

## Run and verify

1. From `frontend/`, run `npm ci`, then `npm run dev`.
2. Ensure the existing Laravel `.env`, tenant configuration, migrations, asset uploads and backend server are correctly configured. Environment-specific files were not packaged.
3. Verify admin login, dealer OTP login, catalog filtering, detail add-to-cart, checkout, order reorder/cancellation, inventory bulk actions, and admin order fulfillment in your environment.
4. Run `npm run build` locally before deployment; a full Vite production build and backend integration tests could not run within the offline editing environment. Frontend JSX parsing, relative-import resolution, CSS parsing and npm manifest dry-run were checked.

This ZIP contains source code and product/public assets from the prior deliverable, but excludes installed dependency folders and private environment settings. No guarantee of production readiness is possible without running authenticated integration tests and deployment checks against your actual tenant databases and payment settings.
