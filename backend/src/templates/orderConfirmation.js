import { layout, escapeHtml, inr, addressLines } from "./layout.js";

export function orderConfirmationTemplate(order) {
  const itemsHtml = (order.items || [])
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f5f5f4;">
          <div style="font-size:14px;color:#292524;font-weight:500;">${escapeHtml(i.name)}</div>
          <div style="font-size:12px;color:#78716c;margin-top:2px;">
            ${i.size ? `Size ${escapeHtml(i.size)} · ` : ""}Qty ${i.quantity}
          </div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f5f5f4;text-align:right;font-size:14px;color:#292524;white-space:nowrap;">
          ${inr(i.price * i.quantity)}
        </td>
      </tr>`,
    )
    .join("");

  const content = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:300;color:#292524;">
      Thank you for your order
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#57534e;">
      We've received your order and will begin preparing it shortly.
    </p>

    <div style="background-color:#fafaf9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:0.1em;">Order</td>
          <td style="font-size:14px;color:#292524;font-weight:500;text-align:right;">
            ${escapeHtml(order.order_number)}
          </td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:0.1em;padding-top:6px;">Status</td>
          <td style="font-size:14px;color:#292524;text-align:right;padding-top:6px;text-transform:capitalize;">
            ${escapeHtml(order.status)}
          </td>
        </tr>
      </table>
    </div>

    <h2 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#78716c;">
      Items
    </h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsHtml}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-size:13px;color:#57534e;padding:2px 0;">Subtotal</td>
        <td style="font-size:13px;color:#292524;text-align:right;padding:2px 0;">${inr(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#57534e;padding:2px 0;">Shipping</td>
        <td style="font-size:13px;color:#292524;text-align:right;padding:2px 0;">
          ${order.shipping === 0 ? "Free" : inr(order.shipping)}
        </td>
      </tr>
      ${
        order.discount > 0
          ? `
      <tr>
        <td style="font-size:13px;color:#15803d;padding:2px 0;">Discount${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ""}</td>
        <td style="font-size:13px;color:#15803d;text-align:right;padding:2px 0;">−${inr(order.discount)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="font-size:14px;color:#292524;font-weight:600;padding:8px 0 0 0;border-top:1px solid #e7e5e4;">Total</td>
        <td style="font-size:14px;color:#292524;font-weight:600;text-align:right;padding:8px 0 0 0;border-top:1px solid #e7e5e4;">${inr(order.total)}</td>
      </tr>
    </table>

    <h2 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#78716c;">
      Shipping to
    </h2>
    <p style="margin:0 0 24px 0;font-size:13px;color:#57534e;line-height:1.6;">
      <strong style="color:#292524;">${escapeHtml(order.customer_name)}</strong><br />
      ${addressLines(order.shipping_address)}
    </p>

    <p style="margin:0;font-size:13px;color:#57534e;">
      You can track your order status any time in
      <a href="${process.env.APP_URL || "http://localhost:5173"}/orders" style="color:#92400e;">My Orders</a>.
    </p>
  `;

  return layout({
    title: `Order Confirmation #${order.order_number}`,
    preheader: `Your order ${order.order_number} has been received.`,
    content,
  });
}
