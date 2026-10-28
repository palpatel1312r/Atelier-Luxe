import mysql from "mysql2/promise";
import "dotenv/config";

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "atelier_luxe",
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      timezone: "Z",
    });
  }
  return pool;
}

export async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function execMulti(sql) {
  const conn = await getPool().getConnection();
  try {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await conn.query(stmt);
    }
  } finally {
    conn.release();
  }
}

export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function mapProduct(row) {
  if (!row) return null;

  const price = Number(row.price);
  const rawSalePrice =
    row.sale_price === null || row.sale_price === undefined
      ? null
      : Number(row.sale_price);

  const now = Date.now();
  const startsOk =
    !row.sale_starts_at || new Date(row.sale_starts_at).getTime() <= now;
  const endsOk =
    !row.sale_ends_at || new Date(row.sale_ends_at).getTime() >= now;

  const isOnSale =
    rawSalePrice !== null && rawSalePrice < price && startsOk && endsOk;

  const effectivePrice = isOnSale ? rawSalePrice : price;
  const discountPct = isOnSale
    ? Math.round(((price - rawSalePrice) / price) * 100)
    : 0;

  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    details: parseJson(row.details, []),
    price,
    sale_price: rawSalePrice,
    sale_starts_at: row.sale_starts_at,
    sale_ends_at: row.sale_ends_at,
    effective_price: effectivePrice,
    is_on_sale: isOnSale,
    discount_pct: discountPct,
    category: row.category,
    category_id: row.category_id,
    color: row.color || "",
    sizes: parseJson(row.sizes, []),
    size_prices: parseJson(row.size_prices, {}),
    stock: Number(row.stock),
    featured: !!row.featured,
    is_active: !!row.is_active,
    image: row.image || "",
    images: parseJson(row.images, row.image ? [row.image] : []),
    created_at: row.created_at,
  };
}

export function mapCart(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    items: parseJson(row.items, []),
    subtotal: Number(row.subtotal),
    item_count: Number(row.item_count),
    recovery_token: row.recovery_token,
    recovery_email_sent_at: row.recovery_email_sent_at,
    recovered_at: row.recovered_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body || "",
    link: row.link || "",
    meta: parseJson(row.meta, {}),
    is_read: !!row.is_read,
    created_at: row.created_at,
  };
}

export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    is_admin: !!row.is_admin,
    phone: row.phone || "",
    addresses: parseJson(row.addresses, []),
    reset_token: row.reset_token,
    reset_expires: row.reset_expires,
    created_at: row.created_at,
  };
}

export function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone || "",
    items: parseJson(row.items, []),
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    discount: Number(row.discount),
    coupon_code: row.coupon_code,
    total: Number(row.total),
    status: row.status,
    payment_method: row.payment_method,
    payment_id: row.payment_id,
    shipping_address: parseJson(row.shipping_address, {}),
    tracking_number: row.tracking_number,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapOrderEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    order_id: row.order_id,
    status: row.status,
    note: row.note || "",
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sort_order: row.sort_order,
    active: !!row.active,
    created_at: row.created_at,
  };
}

export function mapCoupon(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    min_order: Number(row.min_order),
    max_uses: Number(row.max_uses),
    used_count: Number(row.used_count),
    active: !!row.active,
    expires_at: row.expires_at,
  };
}

export function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    is_read: !!row.is_read,
    created_at: row.created_at,
  };
}

export function mapReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    user_id: row.user_id,
    user_name: row.user_name,
    rating: Number(row.rating),
    title: row.title || "",
    body: row.body || "",
    approved: !!row.approved,
    verified_purchase: !!row.verified_purchase,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
