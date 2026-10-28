import { Router } from "express";
import { parse as parseCsv } from "csv-parse/sync";
import multer from "multer";
import { query, queryOne, withTransaction, mapProduct } from "../db.js";
import { adminRequired } from "../middleware/auth.js";

const router = Router();
router.use(adminRequired);

/* ============================================================
   CSV helpers
   ============================================================ */

const HEADERS = [
  "id", // optional — if present, updates; if empty, inserts
  "name",
  "description",
  "price",
  "sale_price",
  "sale_starts_at",
  "sale_ends_at",
  "category", // slug preferred; falls back to name
  "color",
  "sizes", // comma-separated inside the cell, e.g. "S,M,L"
  "size_prices", // JSON-ish: "S:1000|M:1200" or leave blank
  "stock",
  "featured", // 0/1
  "is_active", // 0/1
  "image",
  "images", // comma-separated URLs
];

/** Escape a value for CSV output. */
function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize an array of products into CSV text. */
function productsToCsv(products) {
  const lines = [HEADERS.join(",")];
  for (const p of products) {
    const row = [
      p.id,
      p.name,
      p.description || "",
      p.price,
      p.sale_price ?? "",
      p.sale_starts_at ?? "",
      p.sale_ends_at ?? "",
      p.category || "",
      p.color || "",
      Array.isArray(p.sizes) ? p.sizes.join(",") : "",
      // size_prices as "S:1000|M:1200"
      Object.entries(p.size_prices || {})
        .map(([k, v]) => `${k}:${v}`)
        .join("|"),
      p.stock ?? 0,
      p.featured ? 1 : 0,
      p.is_active === false ? 0 : 1,
      p.image || "",
      Array.isArray(p.images) ? p.images.join(",") : "",
    ];
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Parse the size_prices cell: "S:1000|M:1200" → { S: 1000, M: 1200 }. */
function parseSizePrices(raw) {
  const out = {};
  if (!raw) return out;
  for (const pair of String(raw).split("|")) {
    const [k, v] = pair.split(":");
    if (!k) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k.trim()] = n;
  }
  return out;
}

/** Normalize a cell that should be a date. */
function normalizeDate(raw) {
  if (!raw) return null;
  // Accept "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;
  return s;
}

/** Convert yes/no, true/false, 1/0 → boolean. Default false. */
function parseBool(raw, defaultVal = false) {
  if (raw == null || raw === "") return defaultVal;
  const s = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return defaultVal;
}

/* ============================================================
   GET /api/admin/products/export.csv
   Download the full catalog as CSV.
   ============================================================ */
router.get("/export.csv", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM products ORDER BY id ASC");
    const products = rows.map(mapProduct);
    const csv = productsToCsv(products);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="products-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   GET /api/admin/products/template.csv
   Download a blank CSV with headers and one sample row.
   ============================================================ */
router.get("/template.csv", async (_req, res) => {
  const sample = {
    id: "",
    name: "Sample Silk Scarf",
    description: "Hand-rolled edges",
    price: 2499,
    sale_price: "",
    sale_starts_at: "",
    sale_ends_at: "",
    category: "accessories",
    color: "Ivory",
    sizes: "One Size",
    size_prices: "",
    stock: 10,
    featured: 0,
    is_active: 1,
    image: "/uploads/sample.jpg",
    images: "/uploads/sample.jpg",
  };

  const lines = [
    HEADERS.join(","),
    [
      sample.id,
      sample.name,
      sample.description,
      sample.price,
      sample.sale_price,
      sample.sale_starts_at,
      sample.sale_ends_at,
      sample.category,
      sample.color,
      sample.sizes,
      sample.size_prices,
      sample.stock,
      sample.featured,
      sample.is_active,
      sample.image,
      sample.images,
    ]
      .map(csvCell)
      .join(","),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="products-template.csv"',
  );
  res.send(lines.join("\n") + "\n");
});

/* ============================================================
   POST /api/admin/products/import
   Body: multipart/form-data with a `file` field containing the CSV.
   Query: ?dry=1 for a preview (no DB writes).
   ============================================================ */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const dryRun = req.query.dry === "1" || req.query.dry === "true";

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let records;
    try {
      records = parseCsv(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (err) {
      return res
        .status(400)
        .json({ message: `CSV parse error: ${err.message}` });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "CSV has no data rows" });
    }

    // Cap to avoid abuse
    const MAX = 2000;
    if (records.length > MAX) {
      return res
        .status(400)
        .json({ message: `Too many rows. Max ${MAX} per import.` });
    }

    const results = {
      total: records.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [], // { row: number, message: string }
      preview: [], // filled for dry run
    };

    // Pre-load categories for slug/name resolution and lazily create missing ones
    const categoryBySlug = new Map();
    const categoryByName = new Map();
    {
      const cats = await query("SELECT id, name, slug FROM categories");
      for (const c of cats) {
        categoryBySlug.set(String(c.slug).toLowerCase(), c);
        categoryByName.set(String(c.name).toLowerCase(), c);
      }
    }

    // Wrap in a transaction so a catastrophic error rolls back cleanly.
    // For dry runs, still use a transaction and roll it back.
    await withTransaction(async (conn) => {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const lineNumber = i + 2; // 1-based + header row

        try {
          const name = String(row.name || "").trim();
          if (!name) {
            throw new Error("`name` is required");
          }

          const price = Number(row.price);
          if (!Number.isFinite(price) || price < 0) {
            throw new Error("`price` must be a non-negative number");
          }

          // ---- Category handling ----
          let categorySlug = String(row.category || "")
            .trim()
            .toLowerCase();
          let categoryId = null;

          if (categorySlug) {
            const existing =
              categoryBySlug.get(categorySlug) ||
              categoryByName.get(categorySlug);
            if (existing) {
              categorySlug = existing.slug;
              categoryId = existing.id;
            } else if (!dryRun) {
              // Auto-create the category
              const [ins] = await conn.execute(
                `INSERT INTO categories (name, slug, description, sort_order, active)
                 VALUES (?, ?, NULL, 0, 1)`,
                [
                  categorySlug
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                  categorySlug,
                ],
              );
              const newCat = {
                id: ins.insertId,
                name: categorySlug,
                slug: categorySlug,
              };
              categoryBySlug.set(categorySlug, newCat);
              categoryId = newCat.id;
            } else {
              // Dry run — pretend it will be created
              categoryId = -1;
            }
          }

          // ---- Sizes & size_prices ----
          const sizes = String(row.sizes || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const sizePrices = parseSizePrices(row.size_prices);

          // ---- Images ----
          const image = String(row.image || "").trim();
          const images = String(row.images || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (image && !images.includes(image)) images.unshift(image);

          // ---- Booleans ----
          const featured = parseBool(row.featured, false) ? 1 : 0;
          const isActive =
            row.is_active === "" || row.is_active == null
              ? 1
              : parseBool(row.is_active, true)
                ? 1
                : 0;

          // ---- Sale ----
          const salePriceRaw = String(row.sale_price || "").trim();
          const salePrice = salePriceRaw === "" ? null : Number(salePriceRaw);
          if (
            salePrice != null &&
            (!Number.isFinite(salePrice) || salePrice < 0)
          ) {
            throw new Error(
              "`sale_price` must be a non-negative number or blank",
            );
          }
          if (salePrice != null && salePrice >= price) {
            throw new Error("`sale_price` must be less than `price`");
          }
          const saleStarts = normalizeDate(row.sale_starts_at);
          const saleEnds = normalizeDate(row.sale_ends_at);

          // ---- Upsert decision ----
          const idRaw = String(row.id || "").trim();
          const id = idRaw ? Number(idRaw) : null;

          const payload = [
            name,
            String(row.description || ""),
            JSON.stringify([]), // details not part of CSV
            price,
            salePrice,
            saleStarts,
            saleEnds,
            categorySlug || "uncategorized",
            categoryId,
            String(row.color || ""),
            JSON.stringify(sizes),
            JSON.stringify(sizePrices),
            Number(row.stock) || 0,
            featured,
            isActive,
            image,
            JSON.stringify(images),
          ];

          if (id) {
            const [existing] = await conn.execute(
              "SELECT id FROM products WHERE id = ?",
              [id],
            );
            if (existing.length === 0) {
              throw new Error(`Product with id ${id} not found (can't update)`);
            }

            if (!dryRun) {
              await conn.execute(
                `UPDATE products SET
                   name = ?, description = ?, details = ?, price = ?,
                   sale_price = ?, sale_starts_at = ?, sale_ends_at = ?,
                   category = ?, category_id = ?,
                   color = ?, sizes = ?, size_prices = ?, stock = ?,
                   featured = ?, is_active = ?, image = ?, images = ?
                 WHERE id = ?`,
                [...payload, id],
              );
            }
            results.updated++;
            if (dryRun) {
              results.preview.push({
                row: lineNumber,
                action: "update",
                id,
                name,
              });
            }
          } else {
            if (!dryRun) {
              await conn.execute(
                `INSERT INTO products
                   (name, description, details, price,
                    sale_price, sale_starts_at, sale_ends_at,
                    category, category_id, color,
                    sizes, size_prices, stock, featured, is_active, image, images)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                payload,
              );
            }
            results.created++;
            if (dryRun) {
              results.preview.push({ row: lineNumber, action: "create", name });
            }
          }
        } catch (rowErr) {
          results.failed++;
          results.errors.push({
            row: lineNumber,
            message: rowErr.message || "Unknown error",
          });
        }
      }

      // Always roll back on dry run so nothing changes
      if (dryRun) {
        throw Object.assign(new Error("__dry_run__"), { __dry: true });
      }
    }).catch((err) => {
      if (!err.__dry) throw err;
    });

    res.json({
      dry_run: dryRun,
      ...results,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
