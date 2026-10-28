import { layout, escapeHtml } from "./layout.js";

export function orderDeliveredTemplate(order) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const content = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:300;color:#292524;">
      Your order has been delivered
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#57534e;">
      Order <strong style="color:#292524;">${escapeHtml(order.order_number)}</strong> was delivered.
      We hope you love it.
    </p>

    <div style="background-color:#fafaf9;border-radius:6px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#292524;">
        How was your purchase?
      </p>
      <a href="${appUrl}/orders/${order.id}"
         style="display:inline-block;background-color:#292524;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;padding:12px 24px;border-radius:4px;">
        Write a review
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#57534e;">
      Thank you for shopping with Atelier Luxe.
    </p>
  `;

  return layout({
    title: `Order #${order.order_number} delivered`,
    preheader: `Your order ${order.order_number} has been delivered.`,
    content,
  });
}
