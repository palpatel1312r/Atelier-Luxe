import "dotenv/config";

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  appUrl: process.env.APP_URL || "http://localhost:5173",
  jwt: {
    secret: process.env.JWT_SECRET || "atelier-luxe-dev-secret-key-2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "atelier_luxe",
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:5000/api/auth/google/callback",
  },
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mail: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "orders@atelierluxe.com",
    fromName: process.env.MAIL_FROM_NAME || "Atelier Luxe",
  },
  upload: {
    dir: process.env.UPLOAD_DIR || "uploads",
    maxFileSize: Number(process.env.UPLOAD_MAX_SIZE || 5 * 1024 * 1024),
    allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 200),
  },
};

export default config;
