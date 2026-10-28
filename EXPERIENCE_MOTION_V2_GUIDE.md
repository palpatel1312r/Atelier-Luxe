# Wholesale Motion Experience 2.0

This update builds on the previous Motion Studio **zoom-fixed** project. It modifies the **React frontend presentation**; Laravel controllers, models, migrations, routes, and existing authentication, pricing, cart, checkout, and API request contracts are unchanged.

## What's new

### Interactive product cards
- Product cards have a subtle rAF-coalesced pointer glow and 3D hover tilt on fine-pointer desktops only.
- Gallery arrow buttons now live **inside the image frame**, outside the whole-card link. This prevents interactive nesting and overlap with titles/prices.
- When products have two or more photos, shoppers can flip between them using the arrow buttons (keyboard accessible) or swipe horizontally on touch devices.
- Product image changes crossfade and come into focus; cards are ordinary links for product details. If no image is available, a placeholder appears.

### Product detail experience
- Cursor-following image zoom remains **inside** the gallery, preserving the earlier overlay fix.
- Tappable fullscreen photo gallery with thumbnail selection and swipe navigation remains available.
- Quantity now has large plus/minus controls as well as an editable numeric input.
- Add-to-cart success animates **only when the existing API confirms success**.

### Mobile, tablet, and desktop
- A new thumb-friendly mobile nav appears for authenticated buyer pages up to 767px (Home, Shop, Orders, Basket). It stays out of the way on checkout and product detail, where the purchase action bar takes priority.
- On phones below 420px, catalog cards switch to one generous column instead of an unreadable two-column layout. Larger screens progressively show more columns.
- Horizontal category shelves, touch-sized gallery buttons, photo thumbnails below the gallery, safe-area-aware navigation, and improved filter sheets.
- A small scroll-progress indicator tracks the page without rerendering React every scroll event.
- Admin mobile drawer now closes on route changes and Escape, with background scroll lock while open.

### Colors and motion preferences
Select **Theme** in the header or on the sign-in screen:

| ID | Palette | Base | Primary | Accent |
| --- | --- | --- | --- | --- |
| cobalt | Cobalt / Coral | `#12234E` | `#365BFA` | `#FF795C` |
| orchid | Amethyst / Rose | `#291B52` | `#8655DF` | `#F46A9C` |
| amber | Graphite / Copper | `#1E273A` | `#B96829` | `#FFC06C` |
| sapphire | Sapphire / Sunset | `#0D2852` | `#117CD2` | `#FF876C` |
| berry | Bordeaux / Gold | `#371E38` | `#A44270` | `#F6B960` |

Motion intensity is adjustable between **Calm** and **Expressive**. Preferences are saved to local storage. Operating-system `prefers-reduced-motion` always takes priority. There is no animation-library dependency.

## Main files changed
- `frontend/src/components/ProductCard.jsx`
- `frontend/src/components/ProductGallery.jsx`
- `frontend/src/components/Layout.jsx`
- `frontend/src/components/AdminLayout.jsx`
- `frontend/src/components/ui/ThemeSwitcher.jsx`
- `frontend/src/components/ui/MobileDock.jsx` **(new)**
- `frontend/src/components/ui/ScrollProgress.jsx` **(new)**
- `frontend/src/pages/ProductDetail.jsx`
- `frontend/src/styles/experience-motion.css` **(new, imported last)**
- `frontend/src/main.jsx`

## Running locally
1. Keep a copy of your working `.env` configuration and databases. Environment secrets are not shipped in the archive.
2. Extract the archive, configure Laravel and tenant domains according to the existing README.
3. In `frontend`, run `npm ci` and then `npm run dev` (or `npm run build` for a production build).
4. Use the included Windows setup/start scripts if appropriate to your installation.

## Checks and limitations
- Frontend JSX/JS syntax and CSS parsing, frontend relative imports, PHP syntax and ZIP integrity can be checked without backend credentials.
- Layout smoke checks for 360px, 390px, 768px, 1024px and 1440px use representative static markup and real CSS; they do **not** replace authenticated browser QA.
- Before production release, run the actual Vite build, manually test real product images, the tenant API, auth sessions, add-to-cart, payment flow, and real mobile browsers. Those integration checks require your local infrastructure.
