import { Router } from 'express';
import { query, mapProduct } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.* FROM products p
       INNER JOIN wishlist w ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(mapProduct));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authRequired, async (req, res) => {
  try {
    const productId = Number(req.body.product_id);
    await query(
      'INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [req.user.id, productId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:productId', authRequired, async (req, res) => {
  try {
    await query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [
      req.user.id,
      Number(req.params.productId),
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/merge', authRequired, async (req, res) => {
  try {
    const ids = req.body.productIds || [];
    for (const id of ids) {
      await query('INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)', [
        req.user.id,
        Number(id),
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
