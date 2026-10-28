<?php

namespace App\Http\Controllers\Api\Admin;

use App\Constants\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

/**
 * Generates a GST-compliant invoice PDF for an approved order and stores the
 * URL on orders.gst_invoice_number / gst_invoice_url — the dealer's Order
 * Detail screen already shows a "Download Invoice" button whenever this
 * field is populated (see frontend/src/pages/OrderDetail.jsx).
 *
 * Requires: composer require barryvdh/laravel-dompdf
 */
class InvoiceController extends Controller
{
    // POST /api/admin/orders/{order}/generate-invoice
    public function generate(Request $request, Order $order)
    {
        if (!in_array($order->order_status, OrderStatus::REVENUE_COUNTING, true)) {
            return response()->json(['message' => 'Invoice can only be generated for approved orders.'], 422);
        }

        $order->load(['items.product', 'items.variant', 'user']);
        $invoiceNumber = $order->gst_invoice_number ?? ('INV-' . now()->format('Ym') . '-' . str_pad($order->id, 5, '0', STR_PAD_LEFT));

        $pdf = Pdf::loadView('invoices.gst', ['order' => $order, 'invoiceNumber' => $invoiceNumber]);

        $path = "invoices/{$invoiceNumber}.pdf";
        \Storage::disk('public')->put($path, $pdf->output());

        $order->update([
            'gst_invoice_number' => $invoiceNumber,
            'gst_invoice_url' => \Storage::url($path),
        ]);

        return response()->json(['message' => 'Invoice generated.', 'invoice_url' => $order->gst_invoice_url]);
    }
}
