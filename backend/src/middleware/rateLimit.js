import config from '../config/index.js';

/** Simple in-memory rate limiter (per IP). Replace with redis in production. */
const hits = new Map();

export function rateLimit(options = {}) {
  const windowMs = options.windowMs ?? config.rateLimit.windowMs;
  const max = options.max ?? config.rateLimit.max;

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) {
    if (now - v.start > config.rateLimit.windowMs * 2) hits.delete(k);
  }
}, 60_000).unref?.();
