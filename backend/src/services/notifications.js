import { query } from "../db.js";
import { logger } from "../utils/logger.js";

/**
 * Create a notification for a user.
 * Failures are swallowed — a notification failure should never break
 * the business action that triggered it.
 *
 * @param {Object} opts
 * @param {number} opts.userId
 * @param {string} opts.type      - 'order_status' | 'review_approved' | 'system'
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {string} [opts.link]    - e.g. '/orders/42'
 * @param {Object} [opts.meta]    - arbitrary JSON
 */
export async function notify({
  userId,
  type,
  title,
  body = "",
  link = null,
  meta = null,
}) {
  try {
    if (!userId) return null;
    await query(
      `INSERT INTO notifications
         (user_id, type, title, body, link, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        title,
        body || null,
        link || null,
        meta ? JSON.stringify(meta) : null,
      ],
    );
    return true;
  } catch (err) {
    logger.error(`[notify] failed for user ${userId}: ${err.message}`);
    return false;
  }
}

/**
 * Convenience: fan out one notification to many users at once.
 */
export async function notifyMany(userIds, payload) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  await Promise.all(unique.map((uid) => notify({ userId: uid, ...payload })));
}
