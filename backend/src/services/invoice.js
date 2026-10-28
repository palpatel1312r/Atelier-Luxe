import PDFDocument from "pdfkit";

/**
 * Format a value as INR for the invoice.
 */
function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

/**
 * Format a date as "12 Oct 2026".
 */
function fmtDate(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Pull address fields out of either a JSON object or a legacy string.
 */
function normalizeAddress(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("{")) {
      try {
        return JSON.parse(t);
      } catch {
        return { address: raw };
      }
    }
    return { address: raw };
  }
  return raw;
}

/**
 * Write text without letting pdfkit advance its internal cursor.
 * This is the key to preventing surprise page breaks.
 */
function textAt(doc, str, x, y, options = {}) {
  const savedX = doc.x;
  const savedY = doc.y;
  doc.text(str, x, y, options);
  doc.x = savedX;
  doc.y = savedY;
}

export function buildInvoicePdf(order, opts = {}) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    bufferPages: true,
    info: {
      Title: `Invoice ${order.order_number}`,
      Author: "Atelier Luxe",
      Subject: `Invoice for order ${order.order_number}`,
      ...opts.info,
    },
  });

  // Critical: disable pdfkit's automatic page breaks.
  // We control all vertical positioning ourselves.
  doc.page.margins.bottom = 0;

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = 48;
  const right = pageWidth - 48;
  const innerWidth = right - left;

  const stone900 = "#1c1917";
  const stone700 = "#44403c";
  const stone500 = "#78716c";
  const stone400 = "#a8a29e";
  const stone200 = "#e7e5e4";

  // ---------- Header ----------
  doc.font("Helvetica").fontSize(20).fillColor(stone900);
  textAt(doc, "ATELIER", left, 48, { continued: false });

  doc.fontSize(9).fillColor(stone500);
  textAt(doc, "LUXE", left, 72, { characterSpacing: 3 });

  doc.font("Helvetica-Bold").fontSize(22).fillColor(stone400);
  textAt(doc, "INVOICE", right - 200, 48, { width: 200, align: "right" });

  // ---------- Invoice meta ----------
  let y = 120;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(stone500);
  textAt(doc, "INVOICE NO.", left, y);

  doc.font("Helvetica").fontSize(11).fillColor(stone900);
  textAt(doc, order.order_number || `#${order.id}`, left, y + 14);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(stone500);
  textAt(doc, "DATE", left + 180, y);

  doc.font("Helvetica").fontSize(11).fillColor(stone900);
  textAt(
    doc,
    order.created_at ? fmtDate(order.created_at) : "—",
    left + 180,
    y + 14,
  );

  doc.font("Helvetica-Bold").fontSize(9).fillColor(stone500);
  textAt(doc, "STATUS", left + 360, y);

  doc.font("Helvetica").fontSize(11).fillColor(stone900);
  textAt(doc, (order.status || "").toUpperCase(), left + 360, y + 14);

  // ---------- Divider ----------
  y += 48;
  doc
    .strokeColor(stone200)
    .lineWidth(1)
    .moveTo(left, y)
    .lineTo(right, y)
    .stroke();

  // ---------- Billed to / Shipped to ----------
  y += 20;
  const colWidth = (innerWidth - 24) / 2;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(stone500);
  textAt(doc, "BILLED TO", left, y);
  textAt(doc, "SHIPPED TO", left + colWidth + 24, y);

  const addr = normalizeAddress(order.shipping_address);

  doc.font("Helvetica").fontSize(11).fillColor(stone900);
  textAt(doc, order.customer_name || "—", left, y + 16);

  doc.fontSize(10).fillColor(stone700);
  textAt(doc, order.customer_email || "", left, y + 32);
  if (order.customer_phone) {
    textAt(doc, order.customer_phone, left, y + 46);
  }

  doc.font("Helvetica").fontSize(11).fillColor(stone900);
  textAt(doc, order.customer_name || "—", left + colWidth + 24, y + 16);

  doc.fontSize(10).fillColor(stone700);
  let addrY = y + 32;
  if (addr.address) {
    textAt(doc, addr.address, left + colWidth + 24, addrY, { width: colWidth });
    addrY += doc.heightOfString(addr.address, { width: colWidth });
  }
  const cityLine = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
  if (cityLine) {
    textAt(doc, cityLine, left + colWidth + 24, addrY, { width: colWidth });
    addrY += 14;
  }
  if (addr.country) {
    textAt(doc, addr.country, left + colWidth + 24, addrY, { width: colWidth });
    addrY += 14;
  }
  if (addr.phone) {
    doc.fillColor(stone500);
    textAt(doc, addr.phone, left + colWidth + 24, addrY, { width: colWidth });
  }

  // ---------- Line items table ----------
  y = Math.max(addrY + 32, y + 140);

  // Table header
  doc.rect(left, y, innerWidth, 24).fillColor("#fafaf9").fill();
  doc.fillColor(stone500).font("Helvetica-Bold").fontSize(9);

  const colDesc = left + 12;
  const colQty = right - 260;
  const colPrice = right - 170;
  const colTotal = right - 12;

  textAt(doc, "DESCRIPTION", colDesc, y + 8);
  textAt(doc, "QTY", colQty, y + 8, { width: 40, align: "right" });
  textAt(doc, "PRICE", colPrice, y + 8, { width: 70, align: "right" });
  textAt(doc, "TOTAL", colTotal - 70, y + 8, { width: 70, align: "right" });

  y += 24;

  // Table rows
  const items = Array.isArray(order.items) ? order.items : [];
  doc.font("Helvetica").fontSize(10);

  items.forEach((item, idx) => {
    const rowTop = y + 10;
    const desc = item.size ? `${item.name}  ·  Size ${item.size}` : item.name;
    const descHeight = doc.heightOfString(desc, {
      width: colQty - colDesc - 20,
    });

    doc.fillColor(stone900).font("Helvetica").fontSize(10);
    textAt(doc, desc, colDesc, rowTop, { width: colQty - colDesc - 20 });

    doc.fillColor(stone700);
    textAt(doc, String(item.quantity), colQty, rowTop, {
      width: 40,
      align: "right",
    });
    textAt(doc, inr(item.price), colPrice, rowTop, {
      width: 70,
      align: "right",
    });
    textAt(doc, inr(item.price * item.quantity), colTotal - 70, rowTop, {
      width: 70,
      align: "right",
    });

    y = rowTop + Math.max(descHeight, 14) + 8;

    if (idx < items.length - 1) {
      doc
        .strokeColor(stone200)
        .lineWidth(0.5)
        .moveTo(left, y)
        .lineTo(right, y)
        .stroke();
      y += 6;
    }
  });

  // ---------- Totals ----------
  y += 12;
  doc
    .strokeColor(stone200)
    .lineWidth(1)
    .moveTo(right - 240, y)
    .lineTo(right, y)
    .stroke();

  y += 12;
  const labelX = right - 240;
  const valueX = right - 100;

  doc.font("Helvetica").fontSize(10).fillColor(stone700);
  textAt(doc, "Subtotal", labelX, y);
  textAt(doc, inr(order.subtotal), valueX, y, { width: 100, align: "right" });
  y += 16;

  textAt(doc, "Shipping", labelX, y);
  textAt(doc, order.shipping === 0 ? "Free" : inr(order.shipping), valueX, y, {
    width: 100,
    align: "right",
  });
  y += 16;

  if (Number(order.discount) > 0) {
    doc.fillColor("#15803d");
    textAt(
      doc,
      `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`,
      labelX,
      y,
    );
    textAt(doc, `−${inr(order.discount)}`, valueX, y, {
      width: 100,
      align: "right",
    });
    y += 16;
  }

  y += 4;
  doc
    .strokeColor(stone200)
    .lineWidth(1)
    .moveTo(labelX, y)
    .lineTo(right, y)
    .stroke();

  y += 10;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(stone900);
  textAt(doc, "Total", labelX, y);
  textAt(doc, inr(order.total), valueX, y, { width: 100, align: "right" });

  // ---------- Payment method ----------
  if (order.payment_method) {
    y += 32;
    doc.font("Helvetica").fontSize(9).fillColor(stone500);
    textAt(
      doc,
      `Payment method: ${String(order.payment_method).toUpperCase()}`,
      left,
      y,
    );
    if (order.payment_id) {
      textAt(doc, `Reference: ${order.payment_id}`, left, y + 12);
    }
  }

  // ---------- Footer (stamped on every buffered page) ----------
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const footerY = pageHeight - 60;

    doc
      .strokeColor(stone200)
      .lineWidth(1)
      .moveTo(left, footerY)
      .lineTo(right, footerY)
      .stroke();

    doc.font("Helvetica").fontSize(9).fillColor(stone500);
    textAt(
      doc,
      "Thank you for shopping with Atelier Luxe.",
      left,
      footerY + 12,
      {
        width: innerWidth,
        align: "center",
        lineBreak: false,
      },
    );

    doc.fontSize(8).fillColor(stone400);
    textAt(
      doc,
      "This is a computer-generated invoice and does not require a signature.",
      left,
      footerY + 26,
      { width: innerWidth, align: "center", lineBreak: false },
    );

    doc.fontSize(8).fillColor(stone400);
    textAt(doc, `Page ${i + 1} of ${range.count}`, left, footerY - 14, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
  }

  doc.end();
  return doc;
}
