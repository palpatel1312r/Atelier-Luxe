import { Router } from "express";
import { query, queryOne, mapNotification } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

/* ============================================================
   GET /api/notifications
   Returns the current user's notifications.
   Query: ?unread=1   ?page=1   ?per_page=20
   ============================================================ */
router.get("/", authRequired, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, Number(req.query.per_page) || 20),
    );
    const offset = (page - 1) * perPage;

    const unreadOnly = req.query.unread === "1" || req.query.unread === "true";

    const where = ["user_id = ?"];
    const params = [req.user.id];
    if (unreadOnly) where.push("is_read = 0");

    const whereSql = where.join(" AND ");

    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM notifications WHERE ${whereSql}`,
      params,
    );

    const rows = await query(
      `SELECT * FROM notifications
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    const totalNum = Number(total) || 0;

    res.json({
      items: rows.map(mapNotification),
      total: totalNum,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(totalNum / perPage)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/notifications/unread-count
   Lightweight endpoint for the bell badge — polled by the client.
   ============================================================ */
router.get("/unread-count", authRequired, async (req, res) => {
  try {
    const [row] = await query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.user.id],
    );
    res.json({ unread: Number(row.count) || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   PATCH /api/notifications/:id/read
   ============================================================ */
router.patch("/:id/read", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await queryOne(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );
    if (!row) return res.status(404).json({ message: "Not found" });

    await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
    const updated = await queryOne("SELECT * FROM notifications WHERE id = ?", [
      id,
    ]);
    res.json(mapNotification(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   PATCH /api/notifications/read-all
   ============================================================ */
router.patch("/read-all", authRequired, async (req, res) => {
  try {
    await query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [req.user.id],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   DELETE /api/notifications/:id
   ============================================================ */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [
      id,
      req.user.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
