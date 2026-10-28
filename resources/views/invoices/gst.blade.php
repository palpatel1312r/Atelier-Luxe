<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: sans-serif; font-size: 12px; color: #1a1d24; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f6f8; }
    .totals { margin-top: 16px; width: 260px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-weight: bold; border-top: 1px solid #ccc; padding-top: 6px; }
</style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Tax Invoice</h1>
            <p>Invoice #: {{ $invoiceNumber }}</p>
            <p>Order #: {{ $order->order_number }}</p>
            <p>Date: {{ $order->created_at->format('d M Y') }}</p>
        </div>
        <div>
            <p><strong>{{ $order->user->company_name ?? $order->user->name }}</strong></p>
            <p>{{ $order->user->address }}</p>
            <p>{{ $order->user->city }}, {{ $order->user->state }}</p>
            <p>GSTIN: {{ $order->user->gst_number ?? 'N/A' }}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
        </thead>
        <tbody>
            @foreach ($order->items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item->product->name ?? '-' }}</td>
                <td>{{ $item->variant->sku ?? '-' }}</td>
                <td>{{ $item->quantity }}</td>
                <td>₹{{ number_format($item->unit_price, 2) }}</td>
                <td>₹{{ number_format($item->total_price, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div><span>Subtotal</span><span>₹{{ number_format($order->total_amount, 2) }}</span></div>
        <div><span>Discount</span><span>-₹{{ number_format($order->discount_amount, 2) }}</span></div>
        <div><span>Tax (GST)</span><span>₹{{ number_format($order->tax_amount, 2) }}</span></div>
        <div class="grand"><span>Grand Total</span><span>₹{{ number_format($order->grand_total, 2) }}</span></div>
    </div>

    <p style="margin-top: 40px; font-size: 10px; color: #666;">
        This is a system-generated invoice and does not require a signature.
    </p>
</body>
</html>
