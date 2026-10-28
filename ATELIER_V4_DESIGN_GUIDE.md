# Atelier Commerce V4 — premium B2B wholesale UI

A structural and visual redesign of the React frontend based on the Meridian release. Laravel APIs, database, authentication, pricing engine, and fulfillment behavior remain unchanged.

## Design identity

| Role | Token | Hex |
|---|---|---|
| Structural navy | `--navy` | `#0A2346` |
| Action blue | `--blue` | `#315DFA` |
| Trade teal | `--teal` | `#058F89` |
| Energetic coral | `--coral` | `#F67652` |
| Warm supporting peach | Catalog/CTA accent | `#FFCCA8` |
| Tinted page canvas | `--paper` | `#EFF4FA` |
| Deep interface text | `--ink` | `#172E49` |

Typography: **Plus Jakarta Sans** for display and interface headings, **Inter** for UI text and descriptions, **IBM Plex Mono** for order/SKU number treatments. Fonts have system fallbacks.

Consistent 8/12/16/24/32 spacing, 11–23px component radii, intentionally subtle elevation, accessible focus indicators, visible controls, and tabular pricing.

## Changed frontend structure

- `src/styles/atelier.css` — last-loaded V4 theme with responsive behavior and reduced-motion preference support.
- `src/components/ui/Reveal.jsx` — lightweight, one-time IntersectionObserver entrance animation (no third-party motion dependency).
- `src/components/CommerceJourney.jsx` — real links to existing catalog/order workflows.
- `src/components/CatalogCategories.jsx` — animated category discovery tiles populated from the existing categories API.
- `src/pages/Dashboard.jsx` — editorial discovery block, refined merchandise shelves, trade-journey navigation.
- `src/pages/ProductList.jsx` — dynamic category cards, native sort selection, quick stock filters, richer empty state. Existing API-driven sorting and filters retained.
- `src/components/ProductCard.jsx` — improved merchandising hierarchy and existing MOQ and stock information.
- `src/pages/ProductDetail.jsx` — product facts, better context above gallery and detail information, trustworthy purchase explanation. Cart/Buy Now API unchanged.
- `src/pages/OrderHistory.jsx` — order desk and browser-side search/status filtering of the *currently loaded page only*; server pagination and order-repeat API unchanged.
- `src/pages/admin/AdminDashboard.jsx` — actionable priority cards derived from real API stats and linked to existing admin routes.
- `src/pages/Cart.jsx` and `src/pages/Checkout.jsx` — clearer headings and a visual checkout progression (not a new step-based submission flow).
- Other screens benefit from global navigation, table, form, status, button, and card styling.

## Animation policy

- Scroll-entrance and category/product hover motion are subtle and short.
- Decorative orbits are purely presentational, do not block interactions, and do not convey operational state.
- `prefers-reduced-motion: reduce` removes nonessential animation.
- No continuous background network requests or additional UI libraries have been introduced.

## Functional and deployment notes

- The backend source has not been edited as part of this redesign.
- All counts, prices, product availability, and order status continue to originate from the actual APIs. No mock business metrics are shown.
- Category tiles use the pre-existing category selection handler; quick availability/sort selectors use existing filter state.
- Order-history client-side filters operate only on the **currently loaded page** and say so in the UI.
- Important: complete `npm run build`, Laravel API integration tests, and authenticated browser validation are required on a configured environment before production use.
- Extract the project and run `cd b2b_wholesale/frontend && npm ci && npm run build` (or `npm run dev`). Keep the existing Laravel `.env` and tenant database configuration; they are not shipped in this public archive.
