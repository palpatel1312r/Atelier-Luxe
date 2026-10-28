# WHOLESALE / AURORA — Enterprise Commerce Design System (v3)

A vibrant, disciplined design language for B2B buyers, dealers, sellers and wholesale administrators. This edition replaces the pale blue/white aesthetic with a rich, multi-hued visual system while keeping inventory numbers, order statuses, tables, search and fulfillment tasks readable.

## Core palette

| Token | Hex | Job |
|---|---|---|
| Midnight navy `--navy` | `#161B4B` | Main text, visual anchor, navigation contrast |
| Royal indigo `--blue` | `#5358EB` | Primary actions, selections, prominent links |
| Indigo hover `--blue-deep` | `#3E42C8` | Interactive emphasis |
| Electric violet `--violet` | `#8B4BEF` | Hero gradient and product/discovery accents |
| Trade teal `--teal` | `#009F99` | Inventory and business-success cues |
| Aqua `--aqua` | `#18CDBE` | Light/glow highlights and secondary branding |
| Sunset coral `--coral` | `#F57364` | Promotions and high-priority highlights |
| Frosted lavender `--paper` | `#F0F3FF` | Main page canvas, supplemented with ambient glows |
| Raised surface `--paper-raised` | `#FFFFFF` | Legible controls and data-dense content |
| Body text `--ink` | `#19234B` | Primary reading text |
| Muted text `--ink-soft` | `#647293` | Supporting copy |
| Rules `--rule` | `#DDE4F5` | Quiet card borders and separators |

**Palette logic:** deep indigo + electric violet create a distinctive premium identity, teal communicates trade availability, and coral adds energetic highlights only where appropriate. High-density content stays readable against gently tinted cards; not every surface is dark or saturated. Semantic warning, success and danger shades remain distinct.

## Typography

- **Plus Jakarta Sans:** headlines, prices, page titles, KPI data. Weight 700–800 with tight tracking.
- **Inter:** controls, forms, navigation, table labels, body copy. Weight 400–700.
- **IBM Plex Mono:** stock numbers, identifiers and structured financial values where already applied.
- Size hierarchy: 11/12 px metadata, 13/14 px controls, 16 px comfortable reading, 20–35 px page headings, 36–54 px major hero/auth statements.
- Interactive inputs have clear visible focus outlines; labels aren't replaced with placeholders.

## Layout, motion, and surfaces

- 4 px rhythm with 8/12/16/24/32/48 px spacing increments.
- Content: up to 1440 px buyer pages; admin adapts to a collapsible ~258 px desktop rail.
- 11–22 px corners; large heroes and sign-in shell 24–30 px.
- Card backgrounds include subtle per-category color washes and gradients (violet, teal, coral, blue) in place of identical white rectangles.
- Glows live mostly behind panels; table text and commerce totals remain high-contrast.
- Micro-interactions: 180–300 ms hover transitions, gentle lifts, staggered data-card entry, an ambient drifting backdrop on auth and hero scenes, bar-chart fill. All are CSS-only.
- `prefers-reduced-motion: reduce` turns off animations, and users retain keyboard focus states.

## Screen coverage

- **Sign in:** immersive two-panel login with deep-violet commerce-workflow visual on desktop, a luminous but readable form, and a stacked layout on mobile. Existing dealer OTP and admin login submission logic is unchanged.
- **Buyer dashboard:** dramatic multi-stop indigo/violet/teal hero, coral-accent CTAs, four different color-washed KPI cards, colorful discovery sections and interactive product cards.
- **Admin dashboard:** deep gradient executive banner, saturated active sidebar, seven soft-tinted operational stat panels, animated selling bars and enhanced recent-order cards; displays actual API data only.
- **Product catalog:** tinted section header, purple action toolbar, expressive product image wells, tiered pills, improved search/focus and responsive grid.
- **Product detail:** a luminous, high-visibility purchase-price panel, vivid transaction actions, pale-violet information card and neutral product-gallery area.
- **Orders & inventory:** softly colored summary bands and data table headers, color-coded border rhythm for orders, clearer high-density tables, responsive management controls.
- **Shared areas:** header, footer, mobile nav, cart, checkout, modals, status badges, loading and empty states inherit the new tokens and polish.

## Implementation

Styles load in `frontend/src/main.jsx` in the following order:

1. `styles/global.css` — semantic tokens, core elements and primitives.
2. `styles/premium.css` — original v2 foundations and component layout rules.
3. **`styles/aurora.css`** — v3 color, surface, motion and responsive overrides.

The sign-in visual is coded in `frontend/src/pages/Login.jsx`. React routes, auth state management, inventory APIs, order fulfillment and payment logic are not changed. `frontend/package.json` retains the resolved `react-quill` dependency fix from the previous ZIP.

## Running and verification

From `frontend`, run `npm ci` followed by `npm run dev` or `npm run build`. The ZIP intentionally excludes installed dependencies (`node_modules`) so dependencies can install cleanly on Windows. Keep existing Laravel `.env`, domain/tenant setup and API configuration separately. Do not overwrite real tenant data with seeders. Syntax checks passed for frontend JS/JSX and CSS; production Vite build and authenticated end-to-end workflows must be verified in the target environment.
