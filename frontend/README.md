# Atelier Luxe — React.js

Premium fashion e-commerce storefront built with **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, and **React Router**.

This is a **standalone frontend** project (Laravel backend removed). All data is handled by a client-side mock API with seed products, categories, auth, cart, wishlist, orders, and admin features — everything works offline with no backend required.

## Features

- Shop by category & search
- Product detail, cart, checkout & order confirmation
- Wishlist (persisted in localStorage)
- Login / Register (demo accounts)
- Contact form
- Admin panel: dashboard, products, categories, orders, messages
- Toast notifications
- Responsive UI with Tailwind

## Demo accounts

| Role     | Email                 | Password    |
|----------|-----------------------|-------------|
| Admin    | admin@atelierluxe.com | admin123    |
| Customer | demo@atelierluxe.com  | password123 |

## Getting started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build
npm run preview
```

## Tech stack

- React 18 + TypeScript
- Vite 6
- React Router 7
- Tailwind CSS 4
- Mock API (`src/lib/api.ts` + `src/lib/mockData.ts`) — localStorage persistence

## Project structure

```
src/
  components/     # UI components (shop + admin)
  context/        # Auth, Wishlist, Toast providers
  lib/
    api.ts        # Mock API (same interface as original Laravel client)
    mockData.ts   # Seed products, categories, users
    images.ts     # Image URL helpers
  App.tsx         # Routes & shop logic
  types.ts        # Shared types
```

## Notes

- Cart, wishlist, products, orders, and messages are stored in `localStorage`.
- Clearing site data resets the store to seed values.
- Product images use external URLs from the original seed data.
