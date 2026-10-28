# Theme & UI upgrades (v3+)

## Color themes (header palette control)
The picker offers color previews and applies each palette to the page background,
header, artwork, cards, primary buttons, and navigation.

| ID | Label | Colors |
|----|-------|--------|
| cobalt | Ocean Blue | Blue and aqua |
| sapphire | Indigo | Indigo and periwinkle |
| emerald | Emerald | Green and mint |
| teal | Lagoon | Teal and turquoise |
| sunset | Sunset | Orange and gold |
| daylight | Daylight / White | White with blue and aqua accents |
| graphite | Graphite | Neutral gray with a blue accent |
| violet | Lavender | Violet and lavender |

Preference stored in `localStorage` key `b2b-wholesale-ui-theme`.
Motion: `b2b-wholesale-motion-level` = `vivid` | `calm`.
The former Rose preference migrates to Daylight / White. Legacy `light`
preferences migrate to Ocean Blue; `dark` and `obsidian` migrate to Indigo.
Restricted browser storage still permits changing the active palette.

## CSS
- `frontend/src/styles/multi-theme.css` — tokens + surface mapping
- `frontend/src/styles/responsive-mobile.css` — mobile / safe-area / grids
- `frontend/src/theme.js` — shared palette catalog, migration, and persistence
- `ThemeSwitcher.jsx` — palette previews and keyboard-accessible selection

## Mobile
- 44px touch targets, 16px inputs (no iOS zoom)
- Responsive product grids and a palette picker that fits the viewport
- Drawer sidebar under 960px
