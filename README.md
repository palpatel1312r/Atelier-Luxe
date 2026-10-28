# Atelier Luxe — Full-Stack Fashion E-Commerce

React 18 + Vite + TypeScript + Tailwind frontend · Express + **MySQL** backend.

## Features

- Product catalog, search, sort, filters
- Cart (`CartContext` + localStorage) · Checkout · Coupons
- Mock payments (Stripe-ready) + webhook endpoint
- JWT auth · Profile · Password change · Forgot password
- Wishlist · My Orders · Order detail
- Reviews (customer + admin moderation)
- Admin: products, categories, orders, messages, reviews, users, coupons
- Rate limiting · centralized error handler · structured config
- Docker Compose (MySQL + API) · GitHub Actions CI

## Requirements

- Node.js 20+ (see `.nvmrc`)
- MySQL 8+ **or** Docker

## Quick start (local MySQL)

```bash
# Backend
cd backend
cp .env.example .env   # edit DB_* credentials
npm install
npm run migrate
npm run seed
npm run dev            # http://localhost:8000

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

## Docker

```bash
docker compose up --build
# API: http://localhost:8000  ·  MySQL: localhost:3306 (root/root)
# Run frontend separately against the API
```

## Demo accounts

| Role     | Email                 | Password    |
|----------|-----------------------|-------------|
| Admin    | admin@atelierluxe.com | admin123    |
| Customer | demo@atelierluxe.com  | password123 |

## Coupons

- `WELCOME10` — 10% off (min $50)
- `LUXE25` — $25 off (min $150)

## Key routes

| Area | Path |
|------|------|
| Health | `GET /api/health` |
| Stripe webhook | `POST /api/webhooks/stripe` |
| Users / profile | `/api/users/profile`, `/api/users` (admin) |
| Admin reviews | `/api/admin/reviews` |

## Project layout

```
backend/src/
  config/          env-driven config
  middleware/      auth, rateLimit, errorHandler, upload
  routes/          API routers + webhooks
  services/        payment, email
  utils/           ApiError, asyncHandler, logger
  schema.sql migrate.js seed.js
frontend/src/
  context/         Auth, Cart, Wishlist, Toast
  components/      storefront + admin
  hooks/           useDebounce, useFetch
  lib/             api, format, constants, images
```

## Production checklist

1. Strong `JWT_SECRET` and restricted MySQL user
2. Set `CORS_ORIGIN` to your real frontend origin
3. Optional: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
4. Optional: SMTP for real order emails
5. `cd frontend && npm run build` — API serves `frontend/dist` when present
