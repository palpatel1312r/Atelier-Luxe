import { Router } from "express";
import {
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
} from "../services/email.js";
import { buildInvoicePdf } from "../services/invoice.js";
import { notify } from "../services/notifications.js";
import { runAbandonedCartScan } from "../services/cartRecovery.js";
import {
  query,
  queryOne,
  mapProduct,
  mapCategory,
  mapOrder,
  mapMessage,
  mapCoupon,
} from "../db.js";
import { adminRequired } from "../middleware/auth.js";

const router = Router();
router.use(adminRequired);

/**
 * Parse a date range from query params.
 * Accepts: ?days=7|30|90   OR   ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Defaults to last 30 days.
 * Returns { from, to } as JS Date objects at day boundaries.
 */
function parseRange(q) {
  const now = new Date();

  if (q.from && q.to) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (!isNaN(from) && !isNaN(to)) {
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
  }

  const days = Math.min(365, Math.max(1, Number(q.days) || 30));
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

/**
 * Compute the equivalent prior period for "% change" comparisons.
 * E.g. if range is last 30 days, prior period is the 30 days before that.
 */
function priorRange({ from, to }) {
  const spanMs = to.getTime() - from.getTime();
  const priorTo = new Date(from.getTime() - 1);
  const priorFrom = new Date(priorTo.getTime() - spanMs);
  return { from: priorFrom, to: priorTo };
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

/* ============================================================
   Dashboard / Stats
   ============================================================ */

router.get("/dashboard", async (_req, res) => {
  try {
    const [stats] = await query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products_count,
        (SELECT COUNT(*) FROM orders) AS orders_count,
        (SELECT COUNT(*) FROM messages WHERE is_read = 0) AS messages_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled') AS revenue
    `);
    const recent = await query(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5",
    );
    const lowStock = await query(
      "SELECT * FROM products WHERE stock <= 5 AND is_active = 1 ORDER BY stock ASC",
    );
    res.json({
      products_count: Number(stats.products_count),
      orders_count: Number(stats.orders_count),
      messages_count: Number(stats.messages_count),
      users_count: Number(stats.users_count),
      revenue: Number(stats.revenue),
      recent_orders: recent.map(mapOrder),
      low_stock: lowStock.map(mapProduct),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/carts/abandoned-preview", async (_req, res) => {
  try {
    const result = await runAbandonedCartScan({ dryRun: true });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/carts/run-recovery", async (_req, res) => {
  try {
    const result = await runAbandonedCartScan({ dryRun: false });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/analytics/summary", async (req, res) => {
  try {
    const range = parseRange(req.query);
    const prior = priorRange(range);

    const [current] = await query(
      `SELECT
         COUNT(*) AS orders_count,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
         COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total END), 0) AS avg_order_value
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [range.from, range.to],
    );

    const [priorStats] = await query(
      `SELECT
         COUNT(*) AS orders_count,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [prior.from, prior.to],
    );

    const [customerStats] = await query(
      `SELECT COUNT(DISTINCT user_id) AS new_customers
       FROM orders
       WHERE created_at BETWEEN ? AND ? AND user_id IS NOT NULL`,
      [range.from, range.to],
    );

    const pct = (curr, prev) => {
      const c = Number(curr) || 0;
      const p = Number(prev) || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 1000) / 10;
    };

    res.json({
      range: {
        from: fmtDate(range.from),
        to: fmtDate(range.to),
      },
      revenue: {
        value: Number(current.revenue),
        change_pct: pct(current.revenue, priorStats.revenue),
      },
      orders: {
        value: Number(current.orders_count),
        change_pct: pct(current.orders_count, priorStats.orders_count),
      },
      avg_order_value: {
        value: Number(current.avg_order_value),
        change_pct: 0,
      },
      new_customers: {
        value: Number(customerStats.new_customers),
        change_pct: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/analytics/revenue-series", async (req, res) => {
  try {
    const range = parseRange(req.query);

    const rows = await query(
      `SELECT
         DATE(created_at) AS day,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
         COUNT(*) AS orders
       FROM orders
       WHERE created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [range.from, range.to],
    );

    // Build a complete day-by-day series (fill zeros)
    const map = new Map(
      rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r]),
    );

    const series = [];
    const cursor = new Date(range.from);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= range.to) {
      const key = cursor.toISOString().slice(0, 10);
      const row = map.get(key);
      series.push({
        date: key,
        revenue: row ? Number(row.revenue) : 0,
        orders: row ? Number(row.orders) : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ series });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/analytics/top-products", async (req, res) => {
  try {
    const range = parseRange(req.query);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const rows = await query(
      `SELECT id, items FROM orders
       WHERE created_at BETWEEN ? AND ? AND status != 'cancelled'`,
      [range.from, range.to],
    );

    // Aggregate in JS because items is a JSON array
    const byProduct = new Map();
    for (const o of rows) {
      let items = [];
      try {
        items =
          typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
      } catch {
        items = [];
      }
      for (const it of items) {
        const id = Number(it.product_id);
        if (!id) continue;
        const entry = byProduct.get(id) || {
          product_id: id,
          name: it.name || "(unknown)",
          image: it.image || "",
          units: 0,
          revenue: 0,
        };
        entry.units += Number(it.quantity) || 0;
        entry.revenue += (Number(it.price) || 0) * (Number(it.quantity) || 0);
        byProduct.set(id, entry);
      }
    }

    const sorted = Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    res.json({ products: sorted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/analytics/top-customers", async (req, res) => {
  try {
    const range = parseRange(req.query);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const rows = await query(
      `SELECT
         MAX(user_id) AS user_id,
         customer_email,
         MAX(customer_name) AS customer_name,
         COUNT(*) AS orders,
         COALESCE(SUM(total), 0) AS revenue
       FROM orders
       WHERE created_at BETWEEN ? AND ? AND status != 'cancelled'
       GROUP BY customer_email
       ORDER BY revenue DESC
       LIMIT ?`,
      [range.from, range.to, limit],
    );

    res.json({
      customers: rows.map((c) => ({
        user_id: c.user_id || null,
        name: c.customer_name,
        email: c.customer_email,
        orders: Number(c.orders),
        revenue: Number(c.revenue),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/analytics/status-breakdown", async (req, res) => {
  try {
    const range = parseRange(req.query);

    const rows = await query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE created_at BETWEEN ? AND ?
       GROUP BY status`,
      [range.from, range.to],
    );

    res.json({
      statuses: rows.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/analytics/category-performance", async (req, res) => {
  try {
    const range = parseRange(req.query);

    const rows = await query(
      `SELECT items FROM orders
       WHERE created_at BETWEEN ? AND ? AND status != 'cancelled'`,
      [range.from, range.to],
    );

    // Fetch product → category map (once, small)
    const products = await query("SELECT id, category FROM products");
    const catOf = new Map(products.map((p) => [Number(p.id), p.category]));

    const byCategory = new Map();
    for (const o of rows) {
      let items = [];
      try {
        items =
          typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
      } catch {
        items = [];
      }
      for (const it of items) {
        const cat = catOf.get(Number(it.product_id)) || "uncategorized";
        const entry = byCategory.get(cat) || {
          category: cat,
          revenue: 0,
          units: 0,
        };
        entry.revenue += (Number(it.price) || 0) * (Number(it.quantity) || 0);
        entry.units += Number(it.quantity) || 0;
        byCategory.set(cat, entry);
      }
    }

    const sorted = Array.from(byCategory.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
      }));

    res.json({ categories: sorted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [stats] = await query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products_count,
        (SELECT COUNT(*) FROM orders) AS orders_count,
        (SELECT COUNT(*) FROM messages WHERE is_read = 0) AS messages_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled') AS revenue
    `);
    const recent = await query(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5",
    );
    const lowStock = await query(
      "SELECT * FROM products WHERE stock <= 5 AND is_active = 1 ORDER BY stock ASC",
    );
    res.json({
      products_count: Number(stats.products_count),
      orders_count: Number(stats.orders_count),
      messages_count: Number(stats.messages_count),
      users_count: Number(stats.users_count),
      revenue: Number(stats.revenue),
      recent_orders: recent.map(mapOrder),
      low_stock: lowStock.map(mapProduct),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   Products
   ============================================================ */

router.get("/products", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM products ORDER BY id DESC");
    res.json(rows.map(mapProduct));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM products WHERE id = ?", [
      Number(req.params.id),
    ]);
    if (!row) return res.status(404).json({ message: "Product not found" });
    res.json(mapProduct(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/products", async (req, res) => {
  try {
    const data = req.body || {};
    let category = data.category || "tshirts";
    let categoryId = data.category_id || null;
    if (categoryId) {
      const cat = await queryOne("SELECT * FROM categories WHERE id = ?", [
        categoryId,
      ]);
      if (cat) category = cat.slug;
    } else if (data.category) {
      const cat = await queryOne("SELECT * FROM categories WHERE slug = ?", [
        data.category,
      ]);
      if (cat) categoryId = cat.id;
    }
    const image = data.image || (data.images && data.images[0]) || "";
    const images = data.images || (data.image ? [data.image] : []);

    const salePrice =
      data.sale_price === "" || data.sale_price == null
        ? null
        : Number(data.sale_price);
    const saleStarts = data.sale_starts_at || null;
    const saleEnds = data.sale_ends_at || null;

    const result = await query(
      `INSERT INTO products
        (name, description, details, price, sale_price, sale_starts_at, sale_ends_at,
         category, category_id, color, sizes, size_prices, stock, featured, is_active, image, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.description || "",
        JSON.stringify(data.details || []),
        Number(data.price) || 0,
        salePrice,
        saleStarts,
        saleEnds,
        category,
        categoryId,
        data.color || "",
        JSON.stringify(data.sizes || ["S", "M", "L", "XL"]),
        JSON.stringify(data.size_prices || {}),
        Number(data.stock) || 0,
        data.featured ? 1 : 0,
        data.is_active === false ? 0 : 1,
        image,
        JSON.stringify(images),
      ],
    );

    const row = await queryOne("SELECT * FROM products WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json(mapProduct(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const d = req.body || {};

    await query(
      `UPDATE products SET
        name = ?, description = ?, details = ?, price = ?,
        sale_price = ?, sale_starts_at = ?, sale_ends_at = ?,
        category = ?, category_id = ?,
        color = ?, sizes = ?, size_prices = ?, stock = ?,
        featured = ?, is_active = ?, image = ?, images = ?
       WHERE id = ?`,
      [
        d.name ?? existing.name,
        d.description ?? existing.description,
        JSON.stringify(d.details ?? JSON.parse(existing.details || "[]")),
        d.price !== undefined ? Number(d.price) : existing.price,
        d.sale_price === "" || d.sale_price === null
          ? null
          : d.sale_price !== undefined
            ? Number(d.sale_price)
            : existing.sale_price,
        d.sale_starts_at !== undefined
          ? d.sale_starts_at || null
          : existing.sale_starts_at,
        d.sale_ends_at !== undefined
          ? d.sale_ends_at || null
          : existing.sale_ends_at,
        d.category ?? existing.category,
        d.category_id !== undefined ? d.category_id : existing.category_id,
        d.color ?? existing.color,
        JSON.stringify(d.sizes ?? JSON.parse(existing.sizes || "[]")),
        JSON.stringify(
          d.size_prices ?? JSON.parse(existing.size_prices || "{}"),
        ),
        d.stock !== undefined ? Number(d.stock) : existing.stock,
        d.featured !== undefined ? (d.featured ? 1 : 0) : existing.featured,
        d.is_active !== undefined ? (d.is_active ? 1 : 0) : existing.is_active,
        d.image ?? existing.image,
        JSON.stringify(d.images ?? JSON.parse(existing.images || "[]")),
        id,
      ],
    );

    res.json(
      mapProduct(await queryOne("SELECT * FROM products WHERE id = ?", [id])),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const fields = [];
    const params = [];
    for (const [key, val] of Object.entries(req.body || {})) {
      if (["name", "description", "category", "color", "image"].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(val);
      } else if (["price", "stock", "category_id"].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(Number(val));
      } else if (key === "sale_price") {
        fields.push(`${key} = ?`);
        params.push(val === "" || val === null ? null : Number(val));
      } else if (["sale_starts_at", "sale_ends_at"].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(val || null);
      } else if (["featured", "is_active"].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(val ? 1 : 0);
      } else if (["details", "sizes", "images", "size_prices"].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(JSON.stringify(val));
      }
    }
    if (fields.length) {
      params.push(id);
      await query(
        `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
        params,
      );
    }
    res.json(
      mapProduct(await queryOne("SELECT * FROM products WHERE id = ?", [id])),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    await query("DELETE FROM products WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   Categories
   ============================================================ */

router.get("/categories", async (_req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM categories ORDER BY sort_order ASC",
    );
    res.json(rows.map(mapCategory));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const name = req.body.name;
    const slug =
      req.body.slug ||
      String(name || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
    const result = await query(
      `INSERT INTO categories (name, slug, description, sort_order, active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        req.body.description ?? null,
        req.body.sort_order ?? 0,
        req.body.active === false ? 0 : 1,
      ],
    );
    res
      .status(201)
      .json(
        mapCategory(
          await queryOne("SELECT * FROM categories WHERE id = ?", [
            result.insertId,
          ]),
        ),
      );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM categories WHERE id = ?", [
      id,
    ]);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const d = req.body || {};
    await query(
      `UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ?, active = ? WHERE id = ?`,
      [
        d.name ?? existing.name,
        d.slug ?? existing.slug,
        d.description !== undefined ? d.description : existing.description,
        d.sort_order !== undefined ? d.sort_order : existing.sort_order,
        d.active !== undefined ? (d.active ? 1 : 0) : existing.active,
        id,
      ],
    );
    res.json(
      mapCategory(
        await queryOne("SELECT * FROM categories WHERE id = ?", [id]),
      ),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM categories WHERE id = ?", [
      id,
    ]);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const d = req.body || {};
    await query(
      `UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ?, active = ? WHERE id = ?`,
      [
        d.name ?? existing.name,
        d.slug ?? existing.slug,
        d.description !== undefined ? d.description : existing.description,
        d.sort_order !== undefined ? d.sort_order : existing.sort_order,
        d.active !== undefined ? (d.active ? 1 : 0) : existing.active,
        id,
      ],
    );
    res.json(
      mapCategory(
        await queryOne("SELECT * FROM categories WHERE id = ?", [id]),
      ),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    await query("DELETE FROM categories WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   Orders
   ============================================================ */

router.get("/orders", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(rows.map(mapOrder));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/orders/:id/invoice", async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM orders WHERE id = ?", [
      Number(req.params.id),
    ]);
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

router.patch("/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM orders WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const previousStatus = existing.status;
    const status = req.body.status ?? existing.status;
    const tracking =
      req.body.tracking_number !== undefined
        ? req.body.tracking_number
        : existing.tracking_number;

    await query(
      "UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?",
      [status, tracking, id],
    );

    if (status !== previousStatus) {
      await query(
        `INSERT INTO order_events (order_id, status, note, created_by)
         VALUES (?, ?, ?, ?)`,
        [
          id,
          status,
          `Status changed: ${previousStatus} → ${status}`,
          req.user?.id ?? null,
        ],
      );
    }

    const updated = mapOrder(
      await queryOne("SELECT * FROM orders WHERE id = ?", [id]),
    );

    if (status !== previousStatus) {
      const to = updated.customer_email;
      if (to) {
        if (status === "shipped") {
          sendOrderShipped(updated, to).catch(() => {});
        } else if (status === "delivered" || status === "completed") {
          sendOrderDelivered(updated, to).catch(() => {});
        } else if (status === "cancelled") {
          const refunded = /refund/i.test(req.body.refund_note || "");
          sendOrderCancelled(updated, to, { refunded }).catch(() => {});
        }
      }
    }

    // Week 7 — in-app notification for the customer
    if (status !== previousStatus && updated.user_id) {
      const title =
        status === "shipped"
          ? `Your order ${updated.order_number} has shipped`
          : status === "delivered" || status === "completed"
            ? `Your order ${updated.order_number} was delivered`
            : status === "cancelled"
              ? `Your order ${updated.order_number} was cancelled`
              : `Order ${updated.order_number} is now ${status}`;

      notify({
        userId: updated.user_id,
        type: "order_status",
        title,
        body: tracking ? `Tracking: ${tracking}` : "",
        link: `/orders/${updated.id}`,
        meta: { order_id: updated.id, status },
      }).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   Messages
   ============================================================ */

router.get("/messages", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM messages ORDER BY created_at DESC");
    res.json(rows.map(mapMessage));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/messages/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query("UPDATE messages SET is_read = 1 WHERE id = ?", [id]);
    const row = await queryOne("SELECT * FROM messages WHERE id = ?", [id]);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(mapMessage(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   Coupons
   ============================================================ */

router.get("/coupons", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM coupons ORDER BY id DESC");
    res.json(rows.map(mapCoupon));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/coupons", async (req, res) => {
  try {
    const result = await query(
      `INSERT INTO coupons (code, type, value, min_order, max_uses, used_count, active, expires_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        String(req.body.code || "").toUpperCase(),
        req.body.type || "percent",
        Number(req.body.value) || 0,
        Number(req.body.min_order) || 0,
        Number(req.body.max_uses) || 0,
        req.body.active === false ? 0 : 1,
        req.body.expires_at || null,
      ],
    );
    res
      .status(201)
      .json(
        mapCoupon(
          await queryOne("SELECT * FROM coupons WHERE id = ?", [
            result.insertId,
          ]),
        ),
      );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/coupons/:id", async (req, res) => {
  try {
    await query("DELETE FROM coupons WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
