<?php

namespace App\Http\Controllers\Api;

use App\Constants\OrderStatus;
use App\Constants\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Razorpay\Api\Api;

/**
 * Wires the "online" payment_method (Checkout.jsx already collects this
 * choice; this is where it actually becomes a real payment). Flow:
 *   1. Dealer places order via OrderController::store (payment_status: pending)
 *   2. Frontend calls POST /orders/{order}/create-payment -> gets a Razorpay order id
 *   3. Frontend opens Razorpay Checkout.js with that id
 *   4. On success, frontend calls POST /orders/{order}/verify-payment with the
 *      returned payment_id + signature -> we verify server-side and mark paid
 *
 * Requires: composer require razorpay/razorpay
 * .env: RAZORPAY_KEY, RAZORPAY_SECRET
 */
class PaymentController extends Controller
{
    private function client(): Api
    {
        return new Api(config('services.razorpay.key'), config('services.razorpay.secret'));
    }

    // POST /api/orders/{order}/create-payment
    public function createPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        if ($order->payment_status === PaymentStatus::PAID) {
            return response()->json(['message' => 'Order already paid.'], 422);
        }
        // BUG FIX: previously only payment_status was checked, so a dealer
        // could still open the Razorpay widget and pay for an order the admin
        // had already rejected or that the dealer themselves had cancelled —
        // taking their money for an order that will never be fulfilled.
        if (in_array($order->order_status, OrderStatus::STOCK_RELEASING, true)) {
            return response()->json(['message' => "This order was {$order->order_status} and can no longer be paid for."], 422);
        }

        $razorpayOrder = $this->client()->order->create([
            'receipt' => $order->order_number,
            'amount' => (int) round($order->grand_total * 100), // paise
            'currency' => 'INR',
            'notes' => ['order_id' => $order->id],
        ]);

        $order->update(['razorpay_order_id' => $razorpayOrder['id']]);

        return response()->json([
            'razorpay_order_id' => $razorpayOrder['id'],
            'razorpay_key' => config('services.razorpay.key'),
            'amount' => $razorpayOrder['amount'],
            'currency' => 'INR',
            'order_number' => $order->order_number,
        ]);
    }

    // POST /api/orders/{order}/verify-payment { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    public function verifyPayment(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'razorpay_payment_id' => 'required|string',
            'razorpay_order_id' => 'required|string',
            'razorpay_signature' => 'required|string',
        ]);

        try {
            $this->client()->utility->verifyPaymentSignature([
                'razorpay_order_id' => $request->razorpay_order_id,
                'razorpay_payment_id' => $request->razorpay_payment_id,
                'razorpay_signature' => $request->razorpay_signature,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Payment verification failed.'], 422);
        }

        $order->update([
            'payment_status' => PaymentStatus::PAID,
            'razorpay_payment_id' => $request->razorpay_payment_id,
            'razorpay_signature' => $request->razorpay_signature,
        ]);

        return response()->json(['message' => 'Payment verified. Order marked as paid.', 'data' => $order]);
    }

    /**
     * POST /api/webhooks/razorpay — public route (no auth), Razorpay calls this
     * server-to-server as a fallback in case the browser closes before
     * verify-payment fires. Register this URL in the Razorpay dashboard.
     */
    public function webhook(Request $request)
    {
        $signature = $request->header('X-Razorpay-Signature');
        $secret = config('services.razorpay.webhook_secret');

        try {
            $this->client()->utility->verifyWebhookSignature($request->getContent(), $signature, $secret);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Invalid webhook signature.'], 400);
        }

        $payload = $request->json()->all();
        if (($payload['event'] ?? null) === 'payment.captured') {
            $razorpayOrderId = $payload['payload']['payment']['entity']['order_id'] ?? null;
            if ($razorpayOrderId) {
                Order::where('razorpay_order_id', $razorpayOrderId)
                    ->where('payment_status', '!=', PaymentStatus::PAID)
                    ->update(['payment_status' => PaymentStatus::PAID]);
            }
        }

        return response()->json(['status' => 'ok']);
    }
}
