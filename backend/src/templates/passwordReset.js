import { layout, escapeHtml } from "./layout.js";

export function passwordResetTemplate({ resetUrl }) {
  const content = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:300;color:#292524;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#57534e;">
      Click the button below to choose a new password. This link expires in 1 hour.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}"
         style="display:inline-block;background-color:#292524;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;padding:14px 28px;border-radius:4px;">
        Reset password
      </a>
    </div>

    <p style="margin:0 0 8px 0;font-size:12px;color:#78716c;">
      Or paste this link into your browser:
    </p>
    <p style="margin:0;font-size:12px;color:#57534e;word-break:break-all;">
      ${escapeHtml(resetUrl)}
    </p>

    <p style="margin:24px 0 0 0;font-size:12px;color:#a8a29e;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `;

  return layout({
    title: "Reset your password",
    preheader: "Reset your Atelier Luxe password.",
    content,
  });
}
