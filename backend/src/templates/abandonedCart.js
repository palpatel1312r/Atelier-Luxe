import { layout, inr, imageUrl } from "./layout.js";

export function abandonedCartTemplate({
  userName,
  items,
  subtotal,
  recoverUrl,
}) {
  const itemRows = (items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:64px;vertical-align:top;">
                ${
                  it.image
                    ? `<img src="${imageUrl(it.image)}" width="64" height="80" style="display:block;border-radius:4px;object-fit:cover;" alt="" />`
                    : `<div style="width:64px;height:80px;background:#f5f5f5;border-radius:4px;"></div>`
                }
              </td>
              <td style="padding-left:16px;vertical-align:top;">
                <p style="margin:0;font-size:14px;color:#1c1917;">${it.name || "Item"}</p>
                ${
                  it.size
                    ? `<p style="margin:4px 0 0;font-size:12px;color:#78716c;">Size ${it.size}</p>`
                    : ""
                }
                <p style="margin:4px 0 0;font-size:12px;color:#78716c;">Qty ${it.quantity}</p>
              </td>
              <td style="text-align:right;vertical-align:top;font-size:14px;color:#1c1917;white-space:nowrap;">
                ${inr((Number(it.price) || 0) * (Number(it.quantity) || 0))}
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return layout({
    title: "Your bag is waiting",
    preheader: "Come back and finish checking out.",
    content: `
      <p style="font-size:16px;color:#1c1917;">Hi ${userName},</p>
      <p style="font-size:14px;color:#57534e;line-height:1.6;">
        You left these pieces in your bag. They're still available — for now.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
        ${itemRows}
      </table>

      <p style="font-size:14px;color:#57534e;text-align:right;margin:0 0 24px;">
        Subtotal: <strong style="color:#1c1917;">${inr(subtotal)}</strong>
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td style="background:#1c1917;border-radius:4px;">
            <a href="${recoverUrl}"
               style="display:inline-block;padding:14px 28px;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#fff;text-decoration:none;">
              Resume Your Order
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size:12px;color:#a8a29e;text-align:center;margin-top:24px;">
        Questions? Just reply to this email.
      </p>
    `,
  });
}
