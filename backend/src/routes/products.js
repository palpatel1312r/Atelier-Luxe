import { Router } from "express";
import { query, queryOne, mapProduct, mapReview } from "../db.js";

const router = Router();

/* ============================================================
   Helpers
   ============================================================ */

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v))
    return v
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function buildWhere(q, { excludeFacet } = {}) {
  const conditions = ["is_active = 1"];
  const params = [];

  const category = q.category;
  if (category && String(category).toLowerCase() !== "all") {
    if (/^\d+$/.test(String(category))) {
      conditions.push("(category_id = ? OR category = ?)");
      params.push(Number(category), "");
    } else {
      conditions.push("(LOWER(category) = ? OR category_id = ?)");
      params.push(String(category).toLowerCase(), -1);
    }
  }

  if (q.search) {
    conditions.push("(name LIKE ? OR description LIKE ? OR color LIKE ?)");
    const s = `%${String(q.search).trim()}%`;
    params.push(s, s, s);
  }

  if (q.min_price !== undefined && q.min_price !== "") {
    conditions.push("price >= ?");
    params.push(Number(q.min_price));
  }
  if (q.max_price !== undefined && q.max_price !== "") {
    conditions.push("price <= ?");
    params.push(Number(q.max_price));
  }

  const colors = parseList(q.colors ?? q.color);
  if (colors.length && excludeFacet !== "colors") {
    conditions.push(
      "(" + colors.map(() => "LOWER(color) = LOWER(?)").join(" OR ") + ")",
    );
    colors.forEach((c) => params.push(c));
  }

  const sizes = parseList(q.sizes ?? q.size);
  if (sizes.length && excludeFacet !== "sizes") {
    conditions.push(
      "(" +
        sizes.map(() => "JSON_CONTAINS(sizes, JSON_QUOTE(?))").join(" OR ") +
        ")",
    );
    sizes.forEach((s) => params.push(s));
  }

  if (q.in_stock === "1" || q.in_stock === "true") {
    conditions.push("stock > 0");
  }

  if (q.on_sale === "1" || q.on_sale === "true") {
    conditions.push(`(
      sale_price IS NOT NULL
      AND sale_price < price
      AND (sale_starts_at IS NULL OR sale_starts_at <= NOW())
      AND (sale_ends_at   IS NULL OR sale_ends_at   >= NOW())
    )`);
  }

  if (q.featured === "1" || q.featured === "true") {
    conditions.push("featured = 1");
  }

  return { where: conditions.join(" AND "), params };
}

function buildOrderBy(sort) {
  switch (sort) {
    case "price_asc":
      return "ORDER BY price ASC, id ASC";
    case "price_desc":
      return "ORDER BY price DESC, id ASC";
    case "newest":
      return "ORDER BY created_at DESC, id DESC";
    case "name":
      return "ORDER BY name ASC, id ASC";
    case "on_sale_first":
      return `ORDER BY (
        sale_price IS NOT NULL
        AND sale_price < price
        AND (sale_starts_at IS NULL OR sale_starts_at <= NOW())
        AND (sale_ends_at   IS NULL OR sale_ends_at   >= NOW())
      ) DESC, id ASC`;
    default:
      return "ORDER BY id ASC";
  }
}

/* ============================================================
   GET /api/products
   ============================================================ */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.per_page, 24)),
    );
    const offset = (page - 1) * perPage;

    const { where, params } = buildWhere(req.query);
    const orderBy = buildOrderBy(req.query.sort);

    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM products WHERE ${where}`,
      params,
    );

    const rows = await query(
      `SELECT * FROM products WHERE ${where} ${orderBy} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    const totalNum = Number(total) || 0;
    const totalPages = Math.max(1, Math.ceil(totalNum / perPage));

    res.json({
      items: rows.map(mapProduct),
      total: totalNum,
      page,
      per_page: perPage,
      total_pages: totalPages,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/products/facets
   ============================================================ */
router.get("/facets", async (req, res) => {
  try {
    const { where: catWhere, params: catParams } = buildWhere(req.query, {
      excludeFacet: "categories",
    });
    const categoryRows = await query(
      `SELECT category, category_id, COUNT(*) AS count
       FROM products
       WHERE ${catWhere}
       GROUP BY category, category_id
       ORDER BY count DESC`,
      catParams,
    );

    const { where: colorWhere, params: colorParams } = buildWhere(req.query, {
      excludeFacet: "colors",
    });
    const colorRows = await query(
      `SELECT color, COUNT(*) AS count
       FROM products
       WHERE ${colorWhere} AND color <> ''
       GROUP BY color
       ORDER BY count DESC`,
      colorParams,
    );

    const { where: sizeWhere, params: sizeParams } = buildWhere(req.query, {
      excludeFacet: "sizes",
    });

    let sizeRows = [];
    try {
      sizeRows = await query(
        `SELECT jt.size AS size, COUNT(*) AS count
         FROM products p,
              JSON_TABLE(p.sizes, '$[*]' COLUMNS (size VARCHAR(40) PATH '$')) jt
         WHERE p.is_active = 1
           AND ${sizeWhere.replace(/\bis_active = 1\s*AND\s*/i, "")}
         GROUP BY jt.size
         ORDER BY count DESC`,
        sizeParams,
      );
    } catch {
      const rows = await query(
        `SELECT sizes FROM products WHERE ${sizeWhere}`,
        sizeParams,
      );
      const counts = new Map();
      for (const r of rows) {
        let arr = [];
        try {
          arr =
            typeof r.sizes === "string" ? JSON.parse(r.sizes) : r.sizes || [];
        } catch {
          arr = [];
        }
        for (const s of arr) {
          counts.set(s, (counts.get(s) || 0) + 1);
        }
      }
      sizeRows = Array.from(counts.entries())
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => b.count - a.count);
    }

    const { where: priceWhere, params: priceParams } = buildWhere(
      { ...req.query, min_price: undefined, max_price: undefined },
      {},
    );
    const [priceRange] = await query(
      `SELECT MIN(price) AS min_price, MAX(price) AS max_price
       FROM products WHERE ${priceWhere}`,
      priceParams,
    );

    const [onSaleRow] = await query(
      `SELECT COUNT(*) AS count FROM products
       WHERE is_active = 1
         AND sale_price IS NOT NULL
         AND sale_price < price
         AND (sale_starts_at IS NULL OR sale_starts_at <= NOW())
         AND (sale_ends_at   IS NULL OR sale_ends_at   >= NOW())`,
    );

    res.json({
      categories: categoryRows.map((c) => ({
        name: c.category,
        category_id: c.category_id,
        count: Number(c.count),
      })),
      colors: colorRows.map((c) => ({
        name: c.color,
        count: Number(c.count),
      })),
      sizes: sizeRows.map((s) => ({
        name: s.size,
        count: Number(s.count),
      })),
      price_range: {
        min: Math.floor(Number(priceRange?.min_price) || 0),
        max: Math.ceil(Number(priceRange?.max_price) || 0),
      },
      on_sale_count: Number(onSaleRow?.count) || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/products/suggest
   ============================================================ */
router.get("/suggest", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json([]);

    const like = `%${q}%`;
    const rows = await query(
      `SELECT id, name, image, price, category
       FROM products
       WHERE is_active = 1
         AND (name LIKE ? OR category LIKE ? OR color LIKE ?)
       ORDER BY (name LIKE ?) DESC, CHAR_LENGTH(name) ASC, id DESC
       LIMIT 8`,
      [like, like, like, `${q}%`],
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        image: r.image,
        price: Number(r.price),
        category: r.category,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/products/:id/related
   ============================================================ */
router.get("/:id/related", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const product = await queryOne(
      "SELECT id, category, category_id, price FROM products WHERE id = ?",
      [id],
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const rows = await query(
      `SELECT * FROM products
       WHERE is_active = 1
         AND id <> ?
         AND (
           (category_id IS NOT NULL AND category_id = ?)
           OR (category_id IS NULL AND category = ?)
         )
       ORDER BY ABS(price - ?) ASC, created_at DESC
       LIMIT ?`,
      [
        id,
        product.category_id ?? -1,
        product.category,
        Number(product.price) || 0,
        limit,
      ],
    );

    res.json(rows.map(mapProduct));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/products/:id
   ============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM products WHERE id = ?", [
      Number(req.params.id),
    ]);
    if (!row) return res.status(404).json({ message: "Product not found" });

    const product = mapProduct(row);
    const reviewRows = await query(
      "SELECT * FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY created_at DESC",
      [product.id],
    );
    const reviews = reviewRows.map(mapReview);
    const totalReviews = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const avg = totalReviews > 0 ? sum / totalReviews : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews)
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;

    res.json({
      ...product,
      reviews,
      rating_avg: Math.round(avg * 10) / 10,
      rating_count: totalReviews,
      rating_distribution: distribution,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
