<?php

namespace App\Http\Controllers\Api;

use App\Constants\OrderStatus;
use App\Constants\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderRestriction;
use App\Models\Product;
use App\Services\ActivityLogger;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\PricingEngine;

class OrderController extends Controller
{
    public function __construct(protected StockService $stockService) {}

    public static function clearOrdersCache(): void
    {
        \Illuminate\Support\Facades\Cache::forever(
            'orders_cache_invalidated',
            now()->timestamp
        );
    }
    public function store(Request $request)
    {
        $request->validate([
            'shipping_address' => 'required|string',
            'billing_address' => 'nullable|string',
            'payment_method' => 'required|in:credit,cod,online',
            'notes' => 'nullable|string',
            'on_behalf_of_user_id' => 'nullable|exists:users,id',
            'buy_now' => 'nullable|array',
            'buy_now.product_id' => 'required_with:buy_now|exists:products,id',
            'buy_now.variant_id' => 'nullable|exists:product_variants,id',
            'buy_now.quantity'   => 'required_with:buy_now|integer|min:1',
        ]);

        $actingUser = $request->user();

        // Admin placing order on behalf of a dealer
        $orderOwner = $actingUser;
        if ($request->filled('on_behalf_of_user_id')) {
            if (!($actingUser->isSuperAdmin() || $actingUser->isSaasAdmin())) {
                return response()->json(['message' => 'Only admin can place orders on behalf of a dealer.'], 403);
            }
            $orderOwner = \App\Models\User::findOrFail($request->on_behalf_of_user_id);
        }

        // Determine the list of items to order
        $isBuyNow = $request->has('buy_now') && is_array($request->buy_now);

        if ($isBuyNow) {
            // ---- BUY NOW: build line items from the request payload (cart untouched) ----
            $buyNow = $request->buy_now;
            $product = Product::findOrFail($buyNow['product_id']);
            $variant = !empty($buyNow['variant_id'])
                ? $product->variants()->findOrFail($buyNow['variant_id'])
                : $product->variants()->first();

            if (!$variant) {
                return response()->json(['message' => 'No variant found.'], 422);
            }

            // MOQ + stock
            if ($buyNow['quantity'] < $product->min_order_qty) {
                return response()->json(['message' => "Minimum order quantity is {$product->min_order_qty}."], 422);
            }
            if ($product->max_order_qty && $buyNow['quantity'] > $product->max_order_qty) {
                return response()->json(['message' => "Maximum order quantity is {$product->max_order_qty}."], 422);
            }
            if ($buyNow['quantity'] > $variant->availableStock()) {
                return response()->json(['message' => "Only {$variant->availableStock()} units available in stock."], 422);
            }

        // Resolve price live
            /** @var PricingEngine $pricingEngine */
            $pricingEngine = app(\App\Services\PricingEngine::class);
            $priceInfo = $pricingEngine->resolve($orderOwner, $product, $variant, $buyNow['quantity']);
            if ($priceInfo['price'] === null) {
                return response()->json(['message' => 'Pricing not configured.'], 422);
            }

            // Build a plain-array line items collection for the rest of this method
            $lineItems = collect([[
                'product_id'    => $product->id,
                'variant_id'    => $variant->id,
                'quantity'      => (int) $buyNow['quantity'],
                'unit_price'    => (float) $priceInfo['price'],
                'total_price'   => (float) $priceInfo['price'] * (int) $buyNow['quantity'],
                'slab_applied'  => $priceInfo['source'] === 'quantity_slab',
            ]]);
        } else {
            // ---- CART CHECKOUT: pull from user's cart ----
            $cart = Cart::where('user_id', $orderOwner->id)->with(['items.product', 'items.variant'])->first();
            if (!$cart || $cart->items->isEmpty()) {
                return response()->json(['message' => 'Cart is empty.'], 422);
            }

            $lineItems = $cart->items->map(fn($item) => [
                'product_id'    => $item->product_id,
                'variant_id'    => $item->variant_id,
                'quantity'      => (int) $item->quantity,
                'unit_price'    => (float) $item->unit_price,
                'total_price'   => (float) $item->total_price,
                'slab_applied'  => (bool) $item->slab_applied,
            ]);
        }

        // ---- Order restriction checks ----
        $restriction = OrderRestriction::where('user_id', $orderOwner->id)->first();
        $subtotal = $lineItems->sum('total_price');

        if ($restriction) {
            if ($restriction->min_order_value && $subtotal < $restriction->min_order_value) {
                return response()->json(['message' => "Minimum order value is ₹{$restriction->min_order_value}."], 422);
            }
            if ($restriction->max_order_value && $subtotal > $restriction->max_order_value) {
                return response()->json(['message' => "Maximum order value is ₹{$restriction->max_order_value}."], 422);
            }
            if ($restriction->credit_block && $orderOwner->availableCredit() < $subtotal) {
                return response()->json(['message' => 'Order blocked: insufficient credit limit.'], 422);
            }
            foreach ($lineItems as $item) {
                if ($restriction->max_quantity_per_product && $item['quantity'] > $restriction->max_quantity_per_product) {
                    return response()->json(['message' => "Max quantity per product is {$restriction->max_quantity_per_product}."], 422);
                }
            }
            if ($restriction->restricted_states && in_array($orderOwner->state, $restriction->restricted_states ?? [])) {
                return response()->json(['message' => 'Orders are restricted for your state. Contact admin.'], 422);
            }
        }

        try {
            $order = DB::transaction(function () use ($lineItems, $orderOwner, $request, $subtotal, $isBuyNow) {
                $taxAmount = round($subtotal * 0.00, 2);
                $grandTotal = $subtotal + $taxAmount;

                $order = Order::create([
                    'user_id' => $orderOwner->id,
                    'order_number' => 'ORD-' . strtoupper(Str::random(10)),
                    'total_amount' => $subtotal,
                    'discount_amount' => 0,
                    'tax_amount' => $taxAmount,
                    'grand_total' => $grandTotal,
                    'payment_method' => $request->payment_method,
                    'payment_status' => PaymentStatus::PENDING,
                    'order_status' => OrderStatus::PENDING,
                    'shipping_address' => $request->shipping_address,
                    'billing_address' => $request->billing_address ?? $request->shipping_address,
                    'reserved_until' => now()->addHours(48),
                    'notes' => $request->notes,
                ]);

                foreach ($lineItems as $item) {
                    $this->stockService->reserve($item['variant_id'], $item['quantity']);

                    $order->items()->create([
                        'product_id' => $item['product_id'],
                        'variant_id' => $item['variant_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'slab_applied' => $item['slab_applied'],
                        'discount_applied' => 0,
                    ]);
                }

                $order->statusHistory()->create([
                    'status_from' => null,
                    'status_to' => OrderStatus::PENDING,
                    'changed_by' => $orderOwner->id,
                    'reason_text' => 'Order placed',
                ]);

                // ✅ Only clear the cart when this was a normal cart checkout
                if (!$isBuyNow) {
                    $cart = Cart::where('user_id', $orderOwner->id)->first();
                    $cart?->items()->delete();
                }

                return $order;
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        self::clearOrdersCache();
        ActivityLogger::log($orderOwner->id, Order::class, $order->id, 'order_placed', [], ['order_number' => $order->order_number]);

        return response()->json(['message' => 'Order placed successfully.', 'data' => $order->load('items')], 201);
    }

    // GET /api/orders  — dealer sees own orders; admin sees all (spec: "All Orders View")
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = (int) $request->input('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 50, 100]) ? $perPage : 20;

        $page = max(1, (int) $request->input('page', 1));
        $status = $request->input('status');
        $paymentStatus = $request->input('payment_status');
        $search = trim((string) $request->input('search', ''));
        $sortBy = $request->input('sort_by', 'latest');
        $filterUserId = $request->input('user_id');

        // Cache key: per user + filters + page
        $v = \Illuminate\Support\Facades\Cache::get('orders_cache_invalidated', 0);
        $cacheKey = sprintf(
            'orders:list:%s:%s:%s:%s:%s:%s:%s:%s:%s',
            $user->id,
            $user->isDealer() ? 'dealer' : 'admin',
            $page,
            $perPage,
            $status ?? 'all',
            $paymentStatus ?? 'all',
            md5($search),
            $sortBy,
            $filterUserId ?? 'all'
        ) . ":{$v}";

        $payload = \Illuminate\Support\Facades\Cache::remember($cacheKey, 60, function () use ($user, $perPage, $status, $paymentStatus, $search, $sortBy, $filterUserId) {
            $query = Order::with(['items.product.images', 'items.variant', 'user']);

            if ($user->isDealer()) {
                $query->where('user_id', $user->id);
            } else {
                if ($filterUserId) {
                    $query->where('user_id', $filterUserId)
                        ->where('created_at', '>=', now()->subYear());
                }
                if ($status) {
                    if ($status === 'cancelled') {
                        $query->whereIn('order_status', [OrderStatus::CANCELLED, OrderStatus::REJECTED]);
                    } else {
                        $query->where('order_status', $status);
                    }
                }
            }

            if ($paymentStatus) {
                $query->where('payment_status', $paymentStatus);
            }

            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                        ->orWhere('tracking_number', 'like', "%{$search}%")
                        ->orWhere('shipping_partner', 'like', "%{$search}%")
                        ->orWhere('shipping_address', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('name', 'like', "%{$search}%")
                                ->orWhere('company_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            }

            switch ($sortBy) {
                case 'oldest':
                    $query->oldest();
                    break;
                case 'amount_desc':
                    $query->orderByDesc('grand_total');
                    break;
                case 'amount_asc':
                    $query->orderBy('grand_total');
                    break;
                case 'latest':
                default:
                    $query->latest();
                    break;
            }

            $paginated = $query->paginate($perPage)->toArray();
            $paginated['data'] = array_map(
                fn (array $order) => $this->withResolvedProductImages($order),
                $paginated['data'] ?? []
            );

            if (!$user->isDealer()) {
                $paginated['counts'] = [
                    'all'        => Order::count(),
                    'pending'    => Order::where('order_status', OrderStatus::PENDING)->count(),
                    'approved'   => Order::where('order_status', OrderStatus::APPROVED)->count(),
                    'packing'    => Order::where('order_status', OrderStatus::PACKING)->count(),
                    'dispatched' => Order::where('order_status', OrderStatus::DISPATCHED)->count(),
                    'delivered'  => Order::where('order_status', OrderStatus::DELIVERED)->count(),
                    'cancelled'  => Order::whereIn('order_status', [OrderStatus::CANCELLED, OrderStatus::REJECTED])->count(),
                ];
                $paginated['revenue_total'] = (float) Order::whereIn('order_status', OrderStatus::REVENUE_COUNTING)->sum('grand_total');
            }

            return $paginated;
        });

        return response()->json($payload);
    }

    public function show(Request $request, Order $order)
    {
        $user = $request->user();
        if ($user->isDealer() && $order->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $order->load(['items.product.images', 'items.variant', 'statusHistory.changedBy', 'user', 'cancelledBy']);

        $payload = $this->withResolvedProductImages($order->toArray());

        if ($order->user) {
            $payload['user'] = [
                'id'           => $order->user->id,
                'name'         => $order->user->name,
                'email'        => $order->user->email,
                'phone'        => $order->user->phone,
                'company_name' => $order->user->company_name,
                'gst_number'   => $order->user->gst_number,
                'address'      => $order->user->address,
                'city'         => $order->user->city,
                'state'        => $order->user->state,
                'pincode'      => $order->user->pincode,
            ];
        }

        if (in_array($order->order_status, [OrderStatus::CANCELLED, OrderStatus::REJECTED], true)) {
            $history = $order->statusHistory
                ->where('status_to', $order->order_status)
                ->sortByDesc('id')
                ->first();
            $reason = $history?->reason_text;
            $isSystem = $reason && Str::startsWith(Str::lower($reason), 'auto-cancelled');
            $actor = $isSystem ? null : ($order->cancelledBy ?: $history?->changedBy);
            $actorType = $isSystem
                ? 'system'
                : (($actor && $actor->id === $order->user_id) ? 'customer' : ($actor ? 'admin' : 'system'));

            $payload['cancellation'] = [
                'actor_type' => $actorType,
                'actor_name' => $actor?->name,
                'cancelled_at' => $order->cancelled_at ?: $history?->created_at,
                'reason' => $reason,
            ];
        }

        return response()->json(['data' => $payload]);
    }

    // PATCH /api/orders/{order}/status  { status, reason }  — admin only (route-gated)
    public function updateStatus(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'required|in:' . implode(',', [...array_slice(OrderStatus::FLOW, 1), OrderStatus::REJECTED, OrderStatus::CANCELLED]),
            'reason' => 'nullable|string',
            'tracking_number' => 'nullable|string',
            'shipping_partner' => 'nullable|string',
        ]);

        $admin = $request->user();
        $from = $order->order_status;
        $to = $request->status;

        // BUG FIX: there was previously NO validation that $from -> $to is a
        // legal transition. Two concrete problems this caused:
        //   1. Calling this endpoint with status=approved on an order that was
        //      ALREADY 'approved' (double-click, retried request, or an admin
        //      re-submitting the form) would call StockService::commit() a
        //      SECOND time for the same order — silently decrementing physical
        //      stock twice for one sale.
        //   2. Nothing stopped an illegal jump like pending -> delivered
        //      directly, or delivered -> pending backwards, which would leave
        //      order_status_history telling a story that never actually happened.
        // isValidTransition() below is the single source of truth for what's
        // allowed, checked BEFORE the transaction runs (not after), so an
        // invalid request never touches stock at all.
        if (!$this->isValidTransition($from, $to)) {
            return response()->json([
                'message' => "Cannot move an order from '{$from}' to '{$to}'.",
            ], 422);
        }

        self::clearOrdersCache();
        DB::transaction(function () use ($order, $to, $admin, $request) {
            foreach ($order->items as $item) {
                if ($to === OrderStatus::APPROVED) {
                    // Convert reservation into a real stock decrease
                    $this->stockService->commit($item->variant_id, $item->quantity);
                } elseif (in_array($to, OrderStatus::STOCK_RELEASING, true)) {
                    // Release the hold back to available stock
                    $this->stockService->release($item->variant_id, $item->quantity);
                }
            }

            $order->update([
                'order_status' => $to,
                'tracking_number' => $request->tracking_number ?? $order->tracking_number,
                'shipping_partner' => $request->shipping_partner ?? $order->shipping_partner,
                'cancelled_at' => in_array($to, [OrderStatus::CANCELLED, OrderStatus::REJECTED], true) ? now() : $order->cancelled_at,
                'cancelled_by' => in_array($to, [OrderStatus::CANCELLED, OrderStatus::REJECTED], true) ? $admin->id : $order->cancelled_by,
            ]);
        });

        $reasonText = $request->reason;
        if (!$reasonText && $to === OrderStatus::DISPATCHED && ($request->tracking_number || $request->shipping_partner)) {
            $carrier = $request->shipping_partner ?: 'Courier';
            $track = $request->tracking_number ? " (Tracking #{$request->tracking_number})" : "";
            $reasonText = "Dispatched via {$carrier}{$track}";
        }

        $order->statusHistory()->create([
            'status_from' => $from,
            'status_to' => $to,
            'changed_by' => $admin->id,
            'reason_text' => $reasonText,
        ]);
        self::clearOrdersCache();
        return response()->json(['message' => 'Order status updated.', 'data' => $order->fresh(['items', 'statusHistory'])]);
    }

    // POST /api/orders/{order}/repeat  — re-adds all items from a past order back into the cart
    public function repeat(Request $request, Order $order)
    {
        $user = $request->user();
        if ($order->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $cart = Cart::firstOrCreate(['user_id' => $user->id]);
        $pricingEngine = app(\App\Services\PricingEngine::class);
        $skipped = [];

        foreach ($order->items as $item) {
            $variant = \App\Models\ProductVariant::find($item->variant_id);
            if (!$variant || $variant->availableStock() < $item->quantity) {
                $skipped[] = $item->product->name ?? "product #{$item->product_id}";
                continue;
            }
            $priceInfo = $pricingEngine->resolve($user, $item->product, $variant, $item->quantity);
            $cart->items()->updateOrCreate(
                ['product_id' => $item->product_id, 'variant_id' => $item->variant_id],
                [
                    'quantity' => $item->quantity,
                    'unit_price' => $priceInfo['price'] ?? $item->unit_price,
                    'total_price' => ($priceInfo['price'] ?? $item->unit_price) * $item->quantity,
                ]
            );
        }

        return response()->json([
            'message' => 'Items added to cart.',
            'skipped' => $skipped, // out-of-stock items that couldn't be re-added
        ]);
    }

    // PATCH /api/orders/{order}/cancel - user can cancel their own pending order
    public function cancel(Request $request, Order $order)
    {
        $user = $request->user();

        // Check ownership
        if ($order->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Only allow cancellation of pending orders
        if ($order->order_status !== OrderStatus::PENDING) {
            return response()->json(['message' => 'Only pending orders can be cancelled.'], 422);
        }

        DB::transaction(function () use ($order, $user) {
            // Release reserved stock
            foreach ($order->items as $item) {
                $this->stockService->release($item->variant_id, $item->quantity);
            }

            $from = $order->order_status;
            $to = OrderStatus::CANCELLED;

            $order->update([
                'order_status' => $to,
                'cancelled_at' => now(),
                'cancelled_by' => $user->id,
            ]);

            $order->statusHistory()->create([
                'status_from' => $from,
                'status_to' => $to,
                'changed_by' => $user->id,
                'reason_text' => 'Order cancelled by user',
            ]);
        });
        self::clearOrdersCache();
        return response()->json(['message' => 'Order cancelled successfully.', 'data' => $order->fresh(['items', 'statusHistory'])]);
    }

    private function isValidTransition(string $from, string $to): bool
    {
        if (in_array($from, [OrderStatus::DELIVERED, OrderStatus::REJECTED, OrderStatus::CANCELLED], true)) {
            return false; // terminal states never transition further
        }

        if (in_array($to, [OrderStatus::REJECTED, OrderStatus::CANCELLED], true)) {
            return $from === OrderStatus::PENDING;
        }

        $fromIndex = array_search($from, OrderStatus::FLOW, true);
        $toIndex = array_search($to, OrderStatus::FLOW, true);

        if ($fromIndex === false || $toIndex === false) {
            return false; // $to isn't even in the recognized forward flow
        }

        return $toIndex === $fromIndex + 1; // exactly one step forward, no skipping
    }

    /**
     * Order endpoints serialize Eloquent models directly, so convert stored
     * product image paths to browser-ready URLs just like the catalog API.
     */
    private function withResolvedProductImages(array $order): array
    {
        foreach ($order['items'] ?? [] as &$item) {
            if (!isset($item['product']['images']) || !is_array($item['product']['images'])) {
                continue;
            }

            foreach ($item['product']['images'] as &$image) {
                $path = $image['image_path'] ?? null;

                if (!$path || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                    continue;
                }

                $clean = preg_replace('#^storage/#', '', ltrim($path, '/'));
                $image['image_path'] = asset('storage/' . $clean);
            }
            unset($image);
        }
        unset($item);

        return $order;
    }
}
