/**
 * Shared HTML layout for all transactional emails.
 * Inline CSS only — email clients strip <style> blocks inconsistently.
 */
export function layout({ title, preheader = "", content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#292524;line-height:1.6;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#fafaf9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 16px 32px;text-align:center;border-bottom:1px solid #f5f5f4;">
              <div style="font-size:22px;letter-spacing:0.2em;color:#292524;font-weight:300;">ATELIER</div>
              <div style="font-size:10px;letter-spacing:0.3em;color:#78716c;text-transform:uppercase;margin-top:2px;">Luxe</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#fafaf9;border-top:1px solid #f5f5f4;text-align:center;">
              <p style="margin:0;font-size:12px;color:#78716c;">
                Questions? Reply to this email or contact us at
                <a href="mailto:orders@atelierluxe.com" style="color:#92400e;text-decoration:none;">orders@atelierluxe.com</a>
              </p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#a8a29e;">
                © ${new Date().getFullYear()} Atelier Luxe. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Reusable INR formatter for templates. */
export function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

/** Format an order's shipping_address (JSON object or legacy string) → plain text. */
export function addressLines(raw) {
  if (!raw) return "";
  let a = raw;
  if (typeof a === "string") {
    if (a.trim().startsWith("{")) {
      try {
        a = JSON.parse(a);
      } catch {
        return a;
      }
    } else {
      return a;
    }
  }
  const parts = [
    a.address,
    [a.city, a.state, a.zip].filter(Boolean).join(", "),
    a.country,
    a.phone,
  ].filter(Boolean);
  return parts.join("<br />");
}

import config from "../config/index.js";

export function imageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (config.appUrl || "").replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
