import { Router } from "express";
import { query, queryOne, mapReview } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ============================================================
   GET /api/reviews/product/:productId
   Public. Returns reviews with pagination, plus a summary.
   Query: ?sort=newest|highest|lowest  &page=1&per_page=10
   ============================================================ */
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId)
      return res.status(400).json({ message: "Invalid product id" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(req.query.per_page) || 10));
    const offset = (page - 1) * perPage;

    let orderBy = "created_at DESC";
    if (req.query.sort === "highest") orderBy = "rating DESC, created_at DESC";
    else if (req.query.sort === "lowest")
      orderBy = "rating ASC, created_at DESC";

    const [{ total }] = await query(
      "SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND approved = 1",
      [productId],
    );

    const rows = await query(
      `SELECT * FROM reviews
       WHERE product_id = ? AND approved = 1
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [productId, perPage, offset],
    );

    // Rating distribution + average
    const dist = await query(
      `SELECT rating, COUNT(*) AS count
       FROM reviews
       WHERE product_id = ? AND approved = 1
       GROUP BY rating`,
      [productId],
    );

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) counts[Number(d.rating)] = Number(d.count);

    const totalReviews = Number(total) || 0;
    const sum = Object.entries(counts).reduce(
      (acc, [r, c]) => acc + Number(r) * c,
      0,
    );
    const average = totalReviews > 0 ? sum / totalReviews : 0;

    res.json({
      items: rows.map(mapReview),
      total: totalReviews,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(totalReviews / perPage)),
      summary: {
        average: Math.round(average * 10) / 10,
        count: totalReviews,
        distribution: counts,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/reviews/product/:productId/mine
   Returns the current user's review for a product, if any.
   ============================================================ */
router.get("/product/:productId/mine", authRequired, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const row = await queryOne(
      "SELECT * FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1",
      [productId, req.user.id],
    );
    res.json(row ? mapReview(row) : null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   POST /api/reviews
   Create a review. Only allowed if the user has purchased the
   product. One review per user per product.
   ============================================================ */
router.post("/", authRequired, async (req, res) => {
  try {
    const { product_id, rating, title = "", body = "" } = req.body || {};
    const productId = Number(product_id);
    const ratingNum = Number(rating);

    if (!productId) {
      return res.status(400).json({ message: "product_id is required" });
    }
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "rating must be 1–5" });
    }
    if (body.length > 2000) {
      return res.status(400).json({ message: "Review body is too long" });
    }

    // Product exists?
    const product = await queryOne(
      "SELECT id, name FROM products WHERE id = ?",
      [productId],
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Already reviewed?
    const existing = await queryOne(
      "SELECT id FROM reviews WHERE product_id = ? AND user_id = ?",
      [productId, req.user.id],
    );
    if (existing) {
      return res
        .status(409)
        .json({ message: "You already reviewed this product." });
    }
    const orderRows = await query(
      `SELECT items FROM orders
       WHERE (user_id = ? OR customer_email = ?)
         AND (
           status IN ('paid','shipped','delivered','completed')
           OR (payment_method = 'cod' AND status IN ('delivered','completed'))
         )`,
      [req.user.id, req.user.email],
    );

    let verified = false;
    for (const o of orderRows) {
      let items = [];
      try {
        items =
          typeof o.items === "string" ? JSON.parse(o.items) : o.items || [];
      } catch {
        items = [];
      }
      if (items.some((it) => Number(it.product_id) === productId)) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      return res.status(403).json({
        message: "Only customers who purchased this product can review it.",
      });
    }

    const result = await query(
      `INSERT INTO reviews
        (product_id, user_id, user_name, rating, title, body, approved, verified_purchase)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        productId,
        req.user.id,
        req.user.name || "Customer",
        ratingNum,
        String(title).slice(0, 200),
        String(body).slice(0, 2000),
      ],
    );

    const row = await queryOne("SELECT * FROM reviews WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json(mapReview(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   PATCH /api/reviews/:id
   Edit your own review.
   ============================================================ */
router.patch("/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM reviews WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ message: "Review not found" });

    if (existing.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: "Not your review" });
    }

    const rating =
      req.body.rating !== undefined ? Number(req.body.rating) : null;
    if (
      rating !== null &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      return res.status(400).json({ message: "rating must be 1–5" });
    }

    await query(
      `UPDATE reviews
       SET rating = ?, title = ?, body = ?
       WHERE id = ?`,
      [
        rating ?? existing.rating,
        req.body.title !== undefined
          ? String(req.body.title).slice(0, 200)
          : existing.title,
        req.body.body !== undefined
          ? String(req.body.body).slice(0, 2000)
          : existing.body,
        id,
      ],
    );

    const row = await queryOne("SELECT * FROM reviews WHERE id = ?", [id]);
    res.json(mapReview(row));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   DELETE /api/reviews/:id
   Delete your own review.
   ============================================================ */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne("SELECT * FROM reviews WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ message: "Review not found" });

    if (existing.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: "Not your review" });
    }

    await query("DELETE FROM reviews WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
