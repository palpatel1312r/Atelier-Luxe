import nodemailer from "nodemailer";
import config from "../config/index.js";
import { logger } from "../utils/logger.js";
import { layout, inr, addressLines } from "../templates/layout.js";
import { orderConfirmationTemplate } from "../templates/orderConfirmation.js";
import { orderShippedTemplate } from "../templates/orderShipped.js";
import { orderDeliveredTemplate } from "../templates/orderDelivered.js";
import { orderCancelledTemplate } from "../templates/orderCancelled.js";
import { passwordResetTemplate } from "../templates/passwordReset.js";
import { buildInvoicePdf } from "./invoice.js";

let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter;
  if (!config.mail.host || !config.mail.user) {
    transporter = null;
    return null;
  }
  try {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass,
      },
    });
    logger.info(
      `[email] SMTP transport ready (${config.mail.host}:${config.mail.port})`,
    );
  } catch (err) {
    logger.error(`[email] Failed to build SMTP transport: ${err.message}`);
    transporter = null;
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html, attachments }) {
  const from = `"${config.mail.fromName}" <${config.mail.from}>`;
  const t = getTransporter();

  if (!t) {
    console.log("\n========== EMAIL ==========");
    console.log(`From: ${from}`);
    console.log(`To:   ${to}`);
    console.log(`Subj: ${subject}`);
    if (attachments?.length) {
      console.log(
        `Attachments: ${attachments.map((a) => a.filename).join(", ")}`,
      );
    }
    console.log(text || "(html only)");
    console.log("===========================\n");
    return { ok: true, mode: "console" };
  }

  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      html: html || undefined,
      attachments: attachments || undefined,
    });
    logger.info(`[email] Sent "${subject}" to ${to} (id: ${info.messageId})`);
    return { ok: true, mode: "smtp", messageId: info.messageId };
  } catch (err) {
    logger.error(`[email] Send failed to ${to}: ${err.message}`);
    return { ok: false, mode: "smtp", error: err.message };
  }
}

/* ============================================================
   Order emails
   ============================================================ */

export async function sendOrderConfirmation(order, customerEmail) {
  const html = orderConfirmationTemplate(order);
  const text = plainOrderText(order, "Thank you for your order!");

  let attachments;
  try {
    attachments = [
      {
        filename: `invoice-${order.order_number}.pdf`,
        content: await pdfToBuffer(order),
        contentType: "application/pdf",
      },
    ];
  } catch (err) {
    logger.warn(`[email] Could not attach invoice: ${err.message}`);
  }

  return sendEmail({
    to: customerEmail,
    subject: `Order Confirmation #${order.order_number}`,
    text,
    html,
    attachments,
  });
}

function pdfToBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const pdf = buildInvoicePdf(order);
      pdf.on("data", (chunk) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

export async function sendOrderShipped(order, customerEmail) {
  const html = orderShippedTemplate(order);
  const text = plainOrderText(
    order,
    `Order #${order.order_number} has shipped.`,
  );

  return sendEmail({
    to: customerEmail,
    subject: `Order #${order.order_number} shipped`,
    text,
    html,
  });
}

export async function sendOrderDelivered(order, customerEmail) {
  const html = orderDeliveredTemplate(order);
  const text = `Order #${order.order_number} was delivered.\n\nThank you for shopping with Atelier Luxe.`;

  return sendEmail({
    to: customerEmail,
    subject: `Order #${order.order_number} delivered`,
    text,
    html,
  });
}

export async function sendOrderCancelled(
  order,
  customerEmail,
  { refunded = false } = {},
) {
  const html = orderCancelledTemplate(order, { refunded });
  const text = refunded
    ? `Order #${order.order_number} has been refunded. Amount: ${inr(order.total)}.`
    : `Order #${order.order_number} has been cancelled.`;

  return sendEmail({
    to: customerEmail,
    subject: refunded
      ? `Order #${order.order_number} refunded`
      : `Order #${order.order_number} cancelled`,
    text,
    html,
  });
}

/* ============================================================
   Auth emails
   ============================================================ */

export async function sendPasswordReset(email, token) {
  const resetUrl = `${config.appUrl}/reset-password?token=${encodeURIComponent(
    token,
  )}`;
  const html = passwordResetTemplate({ resetUrl });
  const text =
    `Reset your Atelier Luxe password by visiting:\n\n${resetUrl}\n\n` +
    `This link expires in 1 hour. If you didn't request this, ignore this email.`;

  return sendEmail({
    to: email,
    subject: "Reset your password — Atelier Luxe",
    text,
    html,
  });
}

/* ============================================================
   Helpers
   ============================================================ */

function plainOrderText(order, intro) {
  const items = (order.items || [])
    .map(
      (i) =>
        `  - ${i.name} × ${i.quantity}${
          i.size ? ` (${i.size})` : ""
        } — ${inr(i.price * i.quantity)}`,
    )
    .join("\n");

  const addr = addressLines(order.shipping_address).replace(
    /<br\s*\/?>/g,
    "\n",
  );

  return (
    `${intro}\n\n` +
    `Order: ${order.order_number}\n` +
    `Status: ${order.status}\n\n` +
    `Items:\n${items}\n\n` +
    `Subtotal: ${inr(order.subtotal)}\n` +
    `Shipping: ${order.shipping === 0 ? "Free" : inr(order.shipping)}\n` +
    (order.discount > 0 ? `Discount: −${inr(order.discount)}\n` : "") +
    `Total: ${inr(order.total)}\n\n` +
    `Shipping to:\n${order.customer_name}\n${addr}\n\n` +
    `— Atelier Luxe`
  );
}
