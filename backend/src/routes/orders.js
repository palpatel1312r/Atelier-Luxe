import { Router } from "express";
import { buildInvoicePdf } from "../services/invoice.js";
import { authRequired, optionalAuth } from "../middleware/auth.js";
import {
  query,
  queryOne,
  mapOrder,
  mapOrderEvent,
  mapProduct,
  mapCoupon,
  withTransaction,
} from "../db.js";
import {
  sendOrderConfirmation,
  sendOrderCancelled,
} from "../services/email.js";
import { markCartRecovered } from "../services/cartRecovery.js";

const router = Router();

async function applyCoupon(code, subtotal) {
  if (!code) return { discount: 0, coupon: null };
  const row = await queryOne(
    "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND active = 1",
    [code],
  );
  const coupon = mapCoupon(row);
  if (!coupon) throw new Error("Invalid coupon code");
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
    throw new Error("Coupon expired");
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses)
    throw new Error("Coupon fully redeemed");
  if (subtotal < (coupon.min_order || 0)) {
    throw new Error(
      `Minimum order of $${coupon.min_order} required for this coupon`,
    );
  }
  let discount = 0;
  if (coupon.type === "percent") discount = (subtotal * coupon.value) / 100;
  else discount = coupon.value;
  discount = Math.min(discount, subtotal);
  return { discount, coupon };
}

router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      items,
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country,
      coupon_code,
      payment_method,
      payment_id,
    } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (!name || !email || !address) {
      return res
        .status(400)
        .json({ message: "Name, email, and address are required" });
    }

    const order = await withTransaction(async (conn) => {
      // ... (all the existing transaction body, unchanged)
    });

    // Week 8 — mark the user's persisted cart as recovered
    if (order?.user_id) {
      markCartRecovered(order.user_id, order.id).catch(() => {});
    }

    // Week 3 — fire the confirmation email (non-blocking)
    if (order?.customer_email) {
      sendOrderConfirmation(order, order.customer_email).catch((e) =>
        console.error("Confirmation email failed:", e.message),
      );
    }

    res.status(201).json(order);
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ message: err.message || "Failed to create order" });
  }
});

/* ============================================================
   GET /api/orders/my
   ============================================================ */
router.get("/my", authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM orders
       WHERE user_id = ? OR customer_email = ?
       ORDER BY created_at DESC`,
      [req.user.id, req.user.email],
    );
    res.json(rows.map(mapOrder));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/orders/my/:id
   ============================================================ */
router.get("/my/:id", authRequired, async (req, res) => {
  try {
    const row = await queryOne(
      `SELECT * FROM orders
       WHERE id = ? AND (user_id = ? OR customer_email = ?)`,
      [Number(req.params.id), req.user.id, req.user.email],
    );
    if (!row) return res.status(404).json({ message: "Order not found" });
    res.json(mapOrder(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/orders/my/:id/invoice
   ============================================================ */
router.get("/my/:id/invoice", authRequired, async (req, res) => {
  try {
    const row = await queryOne(
      `SELECT * FROM orders
       WHERE id = ? AND (user_id = ? OR customer_email = ?)`,
      [Number(req.params.id), req.user.id, req.user.email],
    );
    if (!row) return res.status(404).json({ message: "Order not found" });

    const order = mapOrder(row);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${order.order_number}.pdf"`,
    );

    const pdf = buildInvoicePdf(order);
    pdf.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   POST /api/orders/validate-coupon
   ============================================================ */
router.post("/validate-coupon", async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    const { discount, coupon } = await applyCoupon(code, Number(subtotal) || 0);
    res.json({
      valid: true,
      code: coupon.code,
      discount,
      type: coupon.type,
      value: coupon.value,
    });
  } catch (err) {
    res.status(400).json({ valid: false, message: err.message });
  }
});

/* ============================================================
   GET /api/orders/:id
   Owner or admin only. (Generic, after the /my/* routes.)
   ============================================================ */
router.get("/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await queryOne("SELECT * FROM orders WHERE id = ?", [id]);
    if (!row) return res.status(404).json({ message: "Order not found" });

    const isOwner = row.user_id && row.user_id === req.user.id;
    const isAdmin = !!req.user.is_admin;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not your order" });
    }

    res.json(mapOrder(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/orders/:id/events
   Timeline for an order. Owner or admin only.
   ============================================================ */
router.get("/:id/events", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await queryOne("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.user_id && order.user_id === req.user.id;
    const isAdmin = !!req.user.is_admin;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not your order" });
    }

    const rows = await query(
      "SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC",
      [id],
    );
    res.json(rows.map(mapOrderEvent));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   PATCH /api/orders/:id/cancel
   Customer cancels their own order. Allowed only while pending or paid.
   ============================================================ */
router.patch("/:id/cancel", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await queryOne("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = order.user_id && order.user_id === req.user.id;
    const isAdmin = !!req.user.is_admin;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not your order" });
    }

    if (!["pending", "paid"].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel an order that is already ${order.status}.`,
      });
    }

    await query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id]);

    await query(
      `INSERT INTO order_events (order_id, status, note, created_by)
       VALUES (?, 'cancelled', ?, ?)`,
      [
        id,
        isAdmin ? "Cancelled by admin" : "Cancelled by customer",
        req.user.id,
      ],
    );

    const updated = mapOrder(
      await queryOne("SELECT * FROM orders WHERE id = ?", [id]),
    );

    if (updated.customer_email) {
      sendOrderCancelled(updated, updated.customer_email, {
        refunded: updated.payment_method !== "cod",
      }).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
