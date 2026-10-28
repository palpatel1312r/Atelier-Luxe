import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { query, queryOne, mapUser } from "../db.js";
import { signToken, authRequired } from "../middleware/auth.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForProfile,
} from "../services/googleAuth.js";
import { sendPasswordReset } from "../services/email.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });
    const row = await queryOne("SELECT * FROM users WHERE email = ?", [
      String(email).toLowerCase(),
    ]);
    const user = mapUser(row);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const safe = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
    };
    res.json({ user: safe, token: signToken(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   Google OAuth — start
   GET /api/auth/google?state=login
   ============================================================ */
router.get("/google", (req, res) => {
  const state = String(req.query.state || "login").slice(0, 40);
  const url = buildGoogleAuthUrl(state);
  res.redirect(url);
});

/* ============================================================
   Google OAuth — callback
   GET /api/auth/google/callback?code=...&state=...
   ============================================================ */
router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!code) {
    return res.redirect(
      `${clientUrl}/login?error=${encodeURIComponent("google_no_code")}`,
    );
  }

  try {
    const profile = await exchangeCodeForProfile(String(code));

    // Find existing user by email
    let user = await queryOne("SELECT * FROM users WHERE email = ?", [
      profile.email,
    ]);

    // Create if not found
    if (!user) {
      const result = await query(
        `INSERT INTO users (name, email, password, is_admin, phone, addresses)
         VALUES (?, ?, ?, 0, '', ?)`,
        [
          profile.name,
          profile.email,
          // Unguessable placeholder password. Google users can set a real
          // one via "forgot password" if they ever want password login.
          `$google$${Math.random().toString(36).slice(2)}${Date.now()}`,
          JSON.stringify([]),
        ],
      );
      user = {
        id: result.insertId,
        name: profile.name,
        email: profile.email,
        is_admin: 0,
      };
    }

    const safe = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: !!user.is_admin,
    };
    const token = signToken(safe);

    // Send the token + user back to the frontend
    const params = new URLSearchParams({
      token,
      user: JSON.stringify(safe),
      state: String(state || "login"),
    });
    res.redirect(`${clientUrl}/oauth/callback?${params.toString()}`);
  } catch (err) {
    console.error("[google-oauth]", err.message);
    const params = new URLSearchParams({
      error: "google_failed",
      message: err.message || "Sign-in failed",
    });
    res.redirect(`${clientUrl}/login?${params.toString()}`);
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, password_confirmation } = req.body || {};
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email, password required" });
    if (password !== password_confirmation)
      return res.status(400).json({ message: "Passwords do not match" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });

    const existing = await queryOne("SELECT id FROM users WHERE email = ?", [
      String(email).toLowerCase(),
    ]);
    if (existing)
      return res.status(422).json({ message: "Email already registered" });

    const result = await query(
      `INSERT INTO users (name, email, password, is_admin, phone, addresses)
       VALUES (?, ?, ?, 0, '', ?)`,
      [
        name,
        String(email).toLowerCase(),
        bcrypt.hashSync(password, 10),
        JSON.stringify([]),
      ],
    );
    const user = {
      id: result.insertId,
      name,
      email: String(email).toLowerCase(),
      is_admin: false,
    };
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/logout", (_req, res) => res.json({ ok: true }));

router.get("/me", authRequired, async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const user = mapUser(row);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
      phone: user.phone,
      addresses: user.addresses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Alias: change password via /api/me/change-password
router.post("/me/change-password", authRequired, async (req, res) => {
  try {
    const { current_password, new_password, password_confirmation } =
      req.body || {};
    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ message: "current_password and new_password required" });
    }
    if (
      password_confirmation !== undefined &&
      new_password !== password_confirmation
    ) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (new_password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    const row = await queryOne("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (!row || !bcrypt.compareSync(current_password, row.password)) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    await query("UPDATE users SET password = ? WHERE id = ?", [
      bcrypt.hashSync(new_password, 10),
      req.user.id,
    ]);
    res.json({ ok: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/me", authRequired, async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (!row) return res.status(404).json({ message: "User not found" });
    const name = req.body.name ?? row.name;
    const phone = req.body.phone !== undefined ? req.body.phone : row.phone;
    const addresses =
      req.body.addresses !== undefined
        ? JSON.stringify(req.body.addresses)
        : row.addresses;
    await query(
      "UPDATE users SET name = ?, phone = ?, addresses = ? WHERE id = ?",
      [
        name,
        phone,
        typeof addresses === "string" ? addresses : JSON.stringify(addresses),
        req.user.id,
      ],
    );
    const updated = mapUser(
      await queryOne("SELECT * FROM users WHERE id = ?", [req.user.id]),
    );
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      is_admin: updated.is_admin,
      phone: updated.phone,
      addresses: updated.addresses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const row = await queryOne("SELECT * FROM users WHERE email = ?", [
      String(email || "").toLowerCase(),
    ]);
    if (row) {
      const token = nanoid(32);
      await query(
        "UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?",
        [token, Date.now() + 3600_000, row.id],
      );
      await sendPasswordReset(row.email, token);
    }
    res.json({
      ok: true,
      message: "If that email exists, a reset link was sent.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
