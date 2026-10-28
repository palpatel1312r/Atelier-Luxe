import { Router } from "express";
import { queryOne, mapCart } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { syncCart, recordRecoveryClick } from "../services/cartRecovery.js";

const router = Router();

/* ============================================================
   POST /api/cart/sync
   Called by the frontend whenever the cart changes (debounced).
   Body: { items: [{ product_id, name, price, quantity, size, image }] }
   ============================================================ */
router.post("/sync", authRequired, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await syncCart(req.user.id, items);
    res.json({ ok: true, count: items.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/cart/recover/:token
   Public. Returns the cart so the frontend can rehydrate it.
   Also records the click event and returns the user_id so the
   frontend can decide whether to ask the user to log in.
   ============================================================ */
router.get("/recover/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (!token) return res.status(400).json({ message: "Missing token" });

    const row = await queryOne("SELECT * FROM carts WHERE recovery_token = ?", [
      token,
    ]);
    if (!row) return res.status(404).json({ message: "Cart not found" });

    if (!row.recovered_at) {
      await recordRecoveryClick(row.id, row.user_id);
    }

    res.json({
      cart: mapCart(row),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
