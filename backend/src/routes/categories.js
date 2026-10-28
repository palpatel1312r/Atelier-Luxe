import { Router } from 'express';
import { query, mapCategory } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, id ASC'
    );
    res.json(rows.map(mapCategory));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
