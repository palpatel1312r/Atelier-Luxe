import { layout, escapeHtml, inr } from "./layout.js";

export function orderCancelledTemplate(order, { refunded = false } = {}) {
  const content = `
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:300;color:#292524;">
      ${refunded ? "Your order has been refunded" : "Your order has been cancelled"}
    </h1>
    <p style="margin:0 0 24px 0;font-size:14px;color:#57534e;">
      Order <strong style="color:#292524;">${escapeHtml(order.order_number)}</strong>
      ${refunded ? "has been refunded." : "has been cancelled."}
    </p>

    <div style="background-color:#fafaf9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#57534e;">Amount</td>
          <td style="font-size:14px;color:#292524;font-weight:500;text-align:right;">
            ${inr(order.total)}
          </td>
        </tr>
        ${
          refunded
            ? `
        <tr>
          <td style="font-size:13px;color:#57534e;padding-top:6px;">Refund method</td>
          <td style="font-size:13px;color:#292524;text-align:right;padding-top:6px;text-transform:capitalize;">
            ${escapeHtml(order.payment_method || "original payment method")}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="font-size:12px;color:#78716c;padding-top:8px;">
            Refunds typically appear within 5–7 business days.
          </td>
        </tr>`
            : ""
        }
      </table>
    </div>

    <p style="margin:0;font-size:13px;color:#57534e;">
      If you have questions, reply to this email.
    </p>
  `;

  return layout({
    title: refunded
      ? `Order #${order.order_number} refunded`
      : `Order #${order.order_number} cancelled`,
    preheader: refunded
      ? `Your order ${order.order_number} has been refunded.`
      : `Your order ${order.order_number} has been cancelled.`,
    content,
  });
}
