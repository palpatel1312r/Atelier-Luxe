<?php

namespace Database\Seeders;

use App\Constants\OrderStatus;
use App\Constants\PaymentStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\PricingEngine;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds one order per major order_status so OrderHistory (dealer),
 * AdminOrders (admin), and every Report screen all have real rows to
 * render instead of an empty state. Also seeds order_status_history so
 * OrderDetail's visual tracker has more than one step to show.
 */
class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $pricingEngine = app(PricingEngine::class);
        $nilesh = User::where('phone', '9111100001')->first();
        $mahesh = User::where('phone', '9111100002')->first();
        $priya = User::where('phone', '9111100003')->first();

        $shirt = Product::where('slug', 'cotton-formal-shirt')->first();
        $shirtVariant = $shirt->variants->first();
        $tshirt = Product::where('slug', 'round-neck-t-shirt')->first();
        $tshirtVariant = $tshirt->variants->first();

        // Delivered order — full history, GST invoice-ready
        $this->makeOrder($nilesh, $shirt, $shirtVariant, 5, OrderStatus::DELIVERED, PaymentStatus::PAID, $pricingEngine, daysAgo: 10);

        // Pending order — awaiting admin approval (tests Approve/Reject buttons)
        $this->makeOrder($mahesh, $tshirt, $tshirtVariant, 20, OrderStatus::PENDING, PaymentStatus::PENDING, $pricingEngine, daysAgo: 0);

        // Approved, mid-flow order — tests the "move to next status" dropdown
        $this->makeOrder($priya, $shirt, $shirtVariant, 15, OrderStatus::APPROVED, PaymentStatus::PENDING, $pricingEngine, daysAgo: 2);

        // Dispatched order — tests tracking number display
        $this->makeOrder($nilesh, $tshirt, $tshirtVariant, 8, OrderStatus::DISPATCHED, PaymentStatus::PAID, $pricingEngine, daysAgo: 4, trackingNumber: 'TRK123456789');

        // Rejected order — tests rejected-state UI + stock release
        $this->makeOrder($mahesh, $shirt, $shirtVariant, 3, OrderStatus::REJECTED, PaymentStatus::FAILED, $pricingEngine, daysAgo: 6);
    }

    private function makeOrder(User $user, Product $product, ProductVariant $variant, int $qty, string $status, string $paymentStatus, PricingEngine $pricingEngine, int $daysAgo = 0, ?string $trackingNumber = null): void
    {
        $price = $pricingEngine->price($user, $product, $variant, $qty) ?? $variant->mrp;
        $total = $price * $qty;
        $createdAt = now()->subDays($daysAgo);

        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'total_amount' => $total, 'discount_amount' => 0, 'tax_amount' => 0, 'grand_total' => $total,
            'payment_method' => 'credit', 'payment_status' => $paymentStatus, 'order_status' => $status,
            'shipping_address' => "{$user->address}, {$user->city}, {$user->state}",
            'tracking_number' => $trackingNumber,
            'shipping_partner' => $trackingNumber ? 'BlueDart' : null,
            'created_at' => $createdAt, 'updated_at' => $createdAt,
        ]);

        $order->items()->create([
            'product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => $qty,
            'unit_price' => $price, 'total_price' => $total, 'slab_applied' => false, 'discount_applied' => 0,
        ]);

        $order->statusHistory()->create([
            'status_from' => null, 'status_to' => OrderStatus::PENDING, 'changed_by' => $user->id,
            'reason_text' => 'Order placed', 'created_at' => $createdAt, 'updated_at' => $createdAt,
        ]);

        if ($status !== OrderStatus::PENDING) {
            $order->statusHistory()->create([
                'status_from' => OrderStatus::PENDING, 'status_to' => $status, 'changed_by' => $user->id,
                'reason_text' => 'Seeded test data', 'created_at' => $createdAt->addHour(),
            ]);
        }
    }
}
