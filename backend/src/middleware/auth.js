import jwt from 'jsonwebtoken';
import { queryOne, mapUser } from '../db.js';

const SECRET = process.env.JWT_SECRET || 'atelier-luxe-dev-secret-key-2026';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: !!user.is_admin },
    SECRET,
    { expiresIn: '7d' }
  );
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthenticated' });
  try {
    const payload = jwt.verify(token, SECRET);
    const row = await queryOne('SELECT * FROM users WHERE id = ?', [payload.id]);
    const user = mapUser(row);
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ message: 'Admin only' });
    next();
  });
}

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    const row = await queryOne('SELECT * FROM users WHERE id = ?', [payload.id]);
    const user = mapUser(row);
    if (user) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
      };
    }
  } catch {}
  next();
}
