import { layout, escapeHtml, inr, addressLines } from "./layout.js";

export function orderShippedTemplate(order) {
  const content = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:300;color:#292524;">
      Your order is on the way
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#57534e;">
      Order <strong style="color:#292524;">${escapeHtml(order.order_number)}</strong> has been shipped.
    </p>

    ${
      order.tracking_number
        ? `
    <div style="background-color:#fafaf9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <div style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">
        Tracking Number
      </div>
      <div style="font-size:16px;color:#292524;font-family:monospace;font-weight:500;">
        ${escapeHtml(order.tracking_number)}
      </div>
    </div>`
        : ""
    }

    <h2 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#78716c;">
      Shipping to
    </h2>
    <p style="margin:0 0 24px 0;font-size:13px;color:#57534e;line-height:1.6;">
      <strong style="color:#292524;">${escapeHtml(order.customer_name)}</strong><br />
      ${addressLines(order.shipping_address)}
    </p>

    <p style="margin:0;font-size:13px;color:#57534e;">
      Track your order in
      <a href="${process.env.APP_URL || "http://localhost:5173"}/orders/${order.id}" style="color:#92400e;">My Orders</a>.
    </p>
  `;

  return layout({
    title: `Order #${order.order_number} shipped`,
    preheader: `Your order ${order.order_number} has shipped.`,
    content,
  });
}
