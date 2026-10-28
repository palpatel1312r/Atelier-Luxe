import { Router } from 'express';
import { query, queryOne, mapUser } from '../db.js';
import { adminRequired, authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Current user profile (alias of /me style)
router.get(
  '/profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const row = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!row) throw new ApiError(404, 'User not found');
    const u = mapUser(row);
    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      is_admin: u.is_admin,
      phone: u.phone,
      addresses: u.addresses,
      created_at: u.created_at,
    });
  })
);

router.patch(
  '/profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const row = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!row) throw new ApiError(404, 'User not found');
    const name = req.body.name ?? row.name;
    const phone = req.body.phone !== undefined ? req.body.phone : row.phone;
    const addresses =
      req.body.addresses !== undefined ? JSON.stringify(req.body.addresses) : row.addresses;
    await query('UPDATE users SET name = ?, phone = ?, addresses = ? WHERE id = ?', [
      name,
      phone,
      typeof addresses === 'string' ? addresses : JSON.stringify(addresses),
      req.user.id,
    ]);
    const updated = mapUser(await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]));
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      is_admin: updated.is_admin,
      phone: updated.phone,
      addresses: updated.addresses,
    });
  })
);

router.post(
  '/change-password',
  authRequired,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      throw new ApiError(400, 'current_password and new_password required');
    }
    if (new_password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    const row = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!row || !bcrypt.compareSync(current_password, row.password)) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    await query('UPDATE users SET password = ? WHERE id = ?', [
      bcrypt.hashSync(new_password, 10),
      req.user.id,
    ]);
    res.json({ ok: true, message: 'Password updated' });
  })
);

// Admin user list
router.get(
  '/',
  adminRequired,
  asyncHandler(async (_req, res) => {
    const rows = await query(
      'SELECT id, name, email, is_admin, phone, created_at FROM users ORDER BY id DESC'
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        is_admin: !!r.is_admin,
        phone: r.phone || '',
        created_at: r.created_at,
      }))
    );
  })
);

router.patch(
  '/:id',
  adminRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) throw new ApiError(404, 'User not found');
    const isAdmin =
      req.body.is_admin !== undefined ? (req.body.is_admin ? 1 : 0) : row.is_admin;
    const name = req.body.name ?? row.name;
    await query('UPDATE users SET name = ?, is_admin = ? WHERE id = ?', [name, isAdmin, id]);
    const updated = await queryOne(
      'SELECT id, name, email, is_admin, phone, created_at FROM users WHERE id = ?',
      [id]
    );
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      is_admin: !!updated.is_admin,
      phone: updated.phone || '',
      created_at: updated.created_at,
    });
  })
);

router.delete(
  '/:id',
  adminRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) throw new ApiError(400, 'Cannot delete your own account');
    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true });
  })
);

export default router;
