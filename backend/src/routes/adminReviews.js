import { Router } from "express";
import { query, queryOne, mapReview } from "../db.js";
import { adminRequired } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { notify } from "../services/notifications.js";

const router = Router();
router.use(adminRequired);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT r.*, p.name AS product_name
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ORDER BY r.created_at DESC`,
    );
    res.json(
      rows.map((r) => ({
        ...mapReview(r),
        product_name: r.product_name,
      })),
    );
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = await queryOne(
      `SELECT r.*, p.name AS product_name
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.id = ?`,
      [id],
    );
    if (!row) throw new ApiError(404, "Review not found");

    const approved =
      req.body.approved !== undefined
        ? req.body.approved
          ? 1
          : 0
        : row.approved;

    const becameApproved = !row.approved && approved === 1;

    await query("UPDATE reviews SET approved = ? WHERE id = ?", [approved, id]);

    const updated = await queryOne("SELECT * FROM reviews WHERE id = ?", [id]);

    // Week 7 — notify the reviewer the first time their review goes live
    if (becameApproved) {
      notify({
        userId: row.user_id,
        type: "review_approved",
        title: "Your review is live",
        body: `Your review for "${row.product_name || "a product"}" is now visible.`,
        link: `/product/${row.product_id}`,
        meta: { review_id: row.id, product_id: row.product_id },
      }).catch(() => {});
    }

    res.json(mapReview(updated));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await query("DELETE FROM reviews WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  }),
);

export default router;
