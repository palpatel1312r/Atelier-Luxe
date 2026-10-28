import crypto from "crypto";
import { query, queryOne, mapCart } from "../db.js";
import { logger } from "../utils/logger.js";
import { sendEmail } from "./email.js";
import { abandonedCartTemplate } from "../templates/abandonedCart.js";
import config from "../config/index.js";

const ABANDON_AFTER_HOURS = 4;
const RESEND_AFTER_HOURS = 48;

/** Compute the total price of a cart's items (uses stored price on each item). */
function computeSubtotal(items) {
  let total = 0;
  for (const it of items || []) {
    total += (Number(it.price) || 0) * (Number(it.quantity) || 0);
  }
  return total;
}

/** Upsert the user's cart — called from the sync endpoint. */
export async function syncCart(userId, items) {
  const clean = Array.isArray(items) ? items : [];
  const subtotal = computeSubtotal(clean);
  const itemCount = clean.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  const existing = await queryOne("SELECT * FROM carts WHERE user_id = ?", [
    userId,
  ]);

  if (!existing) {
    const token = crypto.randomBytes(24).toString("hex");
    await query(
      `INSERT INTO carts (user_id, items, subtotal, item_count, recovery_token)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, JSON.stringify(clean), subtotal, itemCount, token],
    );
  } else {
    await query(
      `UPDATE carts
       SET items = ?, subtotal = ?, item_count = ?
       WHERE user_id = ?`,
      [JSON.stringify(clean), subtotal, itemCount, userId],
    );
  }

  // If cart is now empty, mark recovered (silently — they didn't check out)
  if (clean.length === 0) {
    await query(
      "UPDATE carts SET recovered_at = NOW(), recovery_email_sent_at = NULL WHERE user_id = ?",
      [userId],
    );
  }
}

/** Called when an order is created — marks the cart as recovered. */
export async function markCartRecovered(userId, orderId) {
  const cart = await queryOne("SELECT * FROM carts WHERE user_id = ?", [
    userId,
  ]);
  if (!cart) return;

  await query(
    "UPDATE carts SET recovered_at = NOW(), items = '[]', item_count = 0 WHERE id = ?",
    [cart.id],
  );

  await query(
    `INSERT INTO cart_recovery_events (cart_id, user_id, event, meta)
     VALUES (?, ?, 'order_placed', ?)`,
    [cart.id, userId, JSON.stringify({ order_id: orderId })],
  );
}

/**
 * The scan. Finds carts that:
 *   - are not empty
 *   - were last updated more than ABANDON_AFTER_HOURS ago
 *   - haven't been recovered
 *   - haven't had a reminder in the last RESEND_AFTER_HOURS (or ever)
 * Then sends a recovery email to each.
 */
export async function runAbandonedCartScan({ dryRun = false } = {}) {
  const rows = await query(
    `SELECT c.*, u.name AS user_name, u.email AS user_email
     FROM carts c
     JOIN users u ON u.id = c.user_id
     WHERE c.item_count > 0
       AND c.recovered_at IS NULL
       AND c.updated_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
       AND (
         c.recovery_email_sent_at IS NULL
         OR c.recovery_email_sent_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
       )
     LIMIT 200`,
    [ABANDON_AFTER_HOURS, RESEND_AFTER_HOURS],
  );

  const results = {
    scanned: rows.length,
    sent: 0,
    failed: 0,
    dry_run: dryRun,
    preview: [],
  };

  for (const row of rows) {
    const cart = mapCart(row);
    try {
      // If the cart items reference products that no longer exist, skip.
      if (!Array.isArray(cart.items) || cart.items.length === 0) continue;

      if (dryRun) {
        results.preview.push({
          cart_id: cart.id,
          user_id: cart.user_id,
          email: row.user_email,
          item_count: cart.item_count,
          subtotal: cart.subtotal,
        });
        continue;
      }

      // Ensure the cart has a recovery token (backfill for old carts)
      let token = cart.recovery_token;
      if (!token) {
        token = crypto.randomBytes(24).toString("hex");
        await query("UPDATE carts SET recovery_token = ? WHERE id = ?", [
          token,
          cart.id,
        ]);
      }

      const recoverUrl = `${config.appUrl}/cart/recover/${token}`;
      const html = abandonedCartTemplate({
        userName: row.user_name || "there",
        items: cart.items,
        subtotal: cart.subtotal,
        recoverUrl,
      });

      await sendEmail({
        to: row.user_email,
        subject: `${row.user_name || "You"} left something in your bag`,
        text:
          `You left ${cart.item_count} item${cart.item_count === 1 ? "" : "s"} in your bag.\n\n` +
          `Continue where you left off: ${recoverUrl}`,
        html,
      });

      await query(
        "UPDATE carts SET recovery_email_sent_at = NOW() WHERE id = ?",
        [cart.id],
      );
      await query(
        `INSERT INTO cart_recovery_events (cart_id, user_id, event)
         VALUES (?, ?, 'email_sent')`,
        [cart.id, cart.user_id],
      );

      results.sent++;
    } catch (err) {
      logger.error(`[cartRecovery] failed for cart ${row.id}: ${err.message}`);
      results.failed++;
    }
  }

  return results;
}

/** Called from the recovery route. Marks the click event. */
export async function recordRecoveryClick(cartId, userId) {
  try {
    await query(
      `INSERT INTO cart_recovery_events (cart_id, user_id, event)
       VALUES (?, ?, 'link_clicked')`,
      [cartId, userId],
    );
  } catch {
    /* silent */
  }
}
