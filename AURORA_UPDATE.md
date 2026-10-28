# Aurora v3 — What's New

A more expressive, professional redesign addressing the prior version's overly pale white/blue look.

**Key changes:**
- New `frontend/src/styles/aurora.css` with midnight indigo, electric violet, teal, coral and tinted data surfaces across the frontend.
- Responsive split-panel animated sign-in experience in `frontend/src/pages/Login.jsx`.
- Redesigned dashboard hero/metrics, product catalog, product detail, order histories, admin side navigation, admin tables, order/inventory summaries, footer and commerce forms.
- Motion refinement for KPI cards, item grids, recent orders and dashboard chart bars; reduced-motion safeguards.
- No new npm packages required beyond the dependencies in `frontend/package.json`.
- Previous missing ReactQuill dependency fix is retained.

**Local start:**

```bash
cd b2b_wholesale/frontend
npm ci
npm run dev
```

Build check on your machine: `npm run build`.

**Notes:** This package includes Laravel source and public product imagery. It does *not* bundle `.env` secrets, tenant database contents, generated `node_modules`, logs or private invoices. API authentication, tenant database setup and WAMP host mapping remain specific to your environment.
