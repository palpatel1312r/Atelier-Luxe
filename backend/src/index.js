import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import adminProductsCsv from "./routes/adminProductsCsv.js";
import { fileURLToPath } from "url";
import config from "./config/index.js";
import { getPool, query } from "./db.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import orderRoutes from "./routes/orders.js";
import wishlistRoutes from "./routes/wishlist.js";
import contactRoutes from "./routes/contact.js";
import reviewRoutes from "./routes/reviews.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import uploadRoutes from "./routes/upload.js";
import webhookRoutes from "./routes/webhooks.js";
import userRoutes from "./routes/users.js";
import adminReviewsRoutes from "./routes/adminReviews.js";
import notificationRoutes from "./routes/notifications.js";
import cartRoutes from "./routes/cart.js";
import { runAbandonedCartScan } from "./services/cartRecovery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);
app.use(cors(config.cors));

// Stripe webhooks need raw body — mount before json parser
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  webhookRoutes,
);

app.use(express.json({ limit: "10mb" }));
app.use(rateLimit());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", config.upload.dir)),
);

app.get("/api/health", async (_req, res) => {
  try {
    const [row] = await query(
      `SELECT
         (SELECT COUNT(*) FROM products) AS products,
         (SELECT COUNT(*) FROM orders) AS orders`,
    );
    res.json({
      ok: true,
      database: "mysql",
      products: Number(row.products),
      orders: Number(row.orders),
      payment_mode: config.stripe.secretKey ? "stripe" : "mock",
    });
  } catch (err) {
    res.status(503).json({ ok: false, message: err.message });
  }
});

app.use("/api", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reviews", reviewRoutes);

// CSV router must be mounted BEFORE the main admin router
app.use("/api/admin", adminProductsCsv);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/reviews", adminReviewsRoutes);

app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/cart", cartRoutes);

const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads"))
      return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, async () => {
  try {
    getPool();
    await query("SELECT 1");
    logger.info(`Atelier Luxe API → http://localhost:${config.port}`);
    logger.info(`Database         → MySQL (${config.db.database})`);
    logger.info(
      `Payment mode     → ${config.stripe.secretKey ? "Stripe" : "Mock"}`,
    );

    // Every hour, scan for abandoned carts and email their owners.
    // First run happens 5 minutes after boot so it doesn't block startup.
    setTimeout(
      () => {
        runAbandonedCartScan().catch((err) =>
          logger.error(`[cartRecovery] initial scan failed: ${err.message}`),
        );
        setInterval(
          () => {
            runAbandonedCartScan().catch((err) =>
              logger.error(`[cartRecovery] scan failed: ${err.message}`),
            );
          },
          60 * 60 * 1000,
        );
      },
      5 * 60 * 1000,
    );
  } catch (err) {
    logger.error("MySQL connection failed:", err.message);
    logger.error("Check DB_* vars in backend/.env and run: npm run migrate");
  }
});
