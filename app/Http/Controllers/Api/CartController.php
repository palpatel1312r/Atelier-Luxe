<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Product;
use App\Services\PricingEngine;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(protected PricingEngine $pricingEngine) {}

    private function cartFor($user): Cart
    {
        return Cart::firstOrCreate(['user_id' => $user->id]);
    }

    // GET /api/cart
    public function index(Request $request)
    {
        $user = $request->user();
        $cart = $this->cartFor($user)->load(['items.product.images', 'items.variant.images']);

        $items = $cart->items->map(function ($item) use ($user) {
            $priceInfo = $this->pricingEngine->resolve(
                $user,
                $item->product,
                $item->variant,
                $item->quantity
            );

            $unitPrice = $priceInfo['price'] ?? (float) $item->unit_price;

            if ((float) $item->unit_price !== (float) $unitPrice) {
                $item->update([
                    'unit_price'         => $unitPrice,
                    'total_price'        => $unitPrice * $item->quantity,
                    'slab_applied'       => $priceInfo['source'] === 'quantity_slab',
                    'slab_price_applied' => $priceInfo['source'] === 'quantity_slab' ? $unitPrice : null,
                ]);
            }

            return $this->itemPayload($item);
        });

        $total = $items->sum('total_price');

        return response()->json(['data' => ['items' => $items, 'grand_total' => $total]]);
    }

    // POST /api/cart/items
    public function addItem(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $user = $request->user();
        $product = Product::findOrFail($request->product_id);
        $variant = $request->variant_id ? $product->variants()->findOrFail($request->variant_id) : $product->variants()->first();

        if (!$variant) {
            return response()->json(['message' => 'This product has no purchasable variant.'], 422);
        }

        if ($request->quantity < $product->min_order_qty) {
            return response()->json(['message' => "Minimum order quantity is {$product->min_order_qty}."], 422);
        }
        if ($product->max_order_qty && $request->quantity > $product->max_order_qty) {
            return response()->json(['message' => "Maximum order quantity is {$product->max_order_qty}."], 422);
        }

        $available = $variant->availableStock();
        $warning = null;
        if ($request->quantity > $available) {
            return response()->json(['message' => "Only {$available} units available in stock."], 422);
        }
        if ($available - $request->quantity <= $product->low_stock_threshold) {
            $warning = "Hurry! Only {$available} units left in stock.";
        }

        $priceInfo = $this->pricingEngine->resolve($user, $product, $variant, $request->quantity);
        if ($priceInfo['price'] === null) {
            return response()->json(['message' => 'Pricing not configured for your account on this product. Contact admin.'], 422);
        }

        $cart = $this->cartFor($user);
        $item = $cart->items()->updateOrCreate(
            ['product_id' => $product->id, 'variant_id' => $variant->id],
            [
                'quantity' => $request->quantity,
                'unit_price' => $priceInfo['price'],
                'total_price' => $priceInfo['price'] * $request->quantity,
                'slab_applied' => $priceInfo['source'] === 'quantity_slab',
                'slab_price_applied' => $priceInfo['source'] === 'quantity_slab' ? $priceInfo['price'] : null,
            ]
        );

        return response()->json(['message' => 'Added to cart.', 'data' => $this->itemPayload($item->load(['product', 'variant'])), 'warning' => $warning]);
    }

    // PATCH /api/cart/items/{item}
    public function updateItem(Request $request, int $itemId)
    {
        $request->validate(['quantity' => 'required|integer|min:1']);
        $user = $request->user();
        $cart = $this->cartFor($user);
        $item = $cart->items()->with('product', 'variant')->findOrFail($itemId);

        $available = $item->variant->availableStock();
        if ($request->quantity > $available) {
            return response()->json(['message' => "Only {$available} units available in stock."], 422);
        }

        $priceInfo = $this->pricingEngine->resolve($user, $item->product, $item->variant, $request->quantity);

        $item->update([
            'quantity' => $request->quantity,
            'unit_price' => $priceInfo['price'],
            'total_price' => $priceInfo['price'] * $request->quantity,
            'slab_applied' => $priceInfo['source'] === 'quantity_slab',
            'slab_price_applied' => $priceInfo['source'] === 'quantity_slab' ? $priceInfo['price'] : null,
        ]);

        return response()->json(['message' => 'Cart updated.', 'data' => $this->itemPayload($item)]);
    }

    // DELETE /api/cart/items/{item}
    public function removeItem(Request $request, int $itemId)
    {
        $cart = $this->cartFor($request->user());
        $cart->items()->where('id', $itemId)->delete();
        return response()->json(['message' => 'Removed from cart.']);
    }

    private function itemPayload($item): array
    {
        $imageUrl = null;

        if ($item->variant && $item->variant->images && $item->variant->images->isNotEmpty()) {
            $imgPath = $item->variant->images->first()->image_path;
        } elseif ($item->product && $item->product->images && $item->product->images->isNotEmpty()) {
            $imgPath = $item->product->images->first()->image_path;
        } else {
            $imgPath = null;
        }

        if ($imgPath) {
            if (str_starts_with($imgPath, 'http')) {
                $imageUrl = $imgPath;
            } else {
                $clean = ltrim($imgPath, '/');
                $clean = preg_replace('#^storage/#', '', $clean);
                $imageUrl = asset('storage/' . $clean);
            }
        }

        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'product_name' => $item->product->name ?? null,
            'variant_id' => $item->variant_id,
            'sku' => $item->variant->sku ?? null,
            'quantity' => $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'total_price' => (float) $item->total_price,
            'slab_applied' => (bool) $item->slab_applied,
            'image_url' => $imageUrl,
        ];
    }

    /**
     * POST /api/cart/buy-now
     * Does NOT touch the cart. Returns price + item info for direct checkout.
     */
    public function prepareBuyNow(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        $user = $request->user();
        $product = Product::findOrFail($request->product_id);
        $variant = $request->variant_id
            ? $product->variants()->findOrFail($request->variant_id)
            : $product->variants()->first();

        if (!$variant) {
            return response()->json(['message' => 'No variant found.'], 422);
        }

        if ($request->quantity < $product->min_order_qty) {
            return response()->json(['message' => "Minimum order quantity is {$product->min_order_qty}."], 422);
        }
        if ($product->max_order_qty && $request->quantity > $product->max_order_qty) {
            return response()->json(['message' => "Maximum order quantity is {$product->max_order_qty}."], 422);
        }
        $available = $variant->availableStock();
        if ($request->quantity > $available) {
            return response()->json(['message' => "Only {$available} units available in stock."], 422);
        }

        $priceInfo = $this->pricingEngine->resolve($user, $product, $variant, $request->quantity);
        if ($priceInfo['price'] === null) {
            return response()->json(['message' => 'Pricing not configured.'], 422);
        }

        return response()->json([
            'message' => 'Ready for direct checkout.',
            'data' => [
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'variant_id'   => $variant->id,
                'sku'          => $variant->sku,
                'quantity'     => $request->quantity,
                'unit_price'   => (float) $priceInfo['price'],
                'total_price'  => (float) $priceInfo['price'] * $request->quantity,
                'source'       => $priceInfo['source'],
            ],
        ]);
    }
}
