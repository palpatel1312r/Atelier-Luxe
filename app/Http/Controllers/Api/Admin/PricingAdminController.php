<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Controller;
use App\Models\DealerSpecificPrice;
use App\Models\GroupPrice;
use App\Models\QuantitySlab;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class PricingAdminController extends Controller
{
    public function removeQuantitySlab(Request $request, $id)
    {
        $slab = QuantitySlab::findOrFail($id);
        ActivityLogger::log(
            $request->user()->id,
            QuantitySlab::class,
            $slab->id,
            'quantity_slab_removed',
            ['min_qty' => $slab->min_qty, 'max_qty' => $slab->max_qty, 'price' => $slab->price],
            []
        );
        $slab->delete();
        DashboardController::clearCache();
        return response()->json(['message' => 'Quantity slab removed.']);
    }

    public function setGroupPrice(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'group_id' => 'required|exists:groups,id',
            'price' => 'required|numeric|min:0',
        ]);

        $existing = GroupPrice::where('product_id', $data['product_id'])
            ->where('variant_id', $data['variant_id'] ?? null)
            ->where('group_id', $data['group_id'])
            ->first();
        $oldPrice = $existing?->price;

        $gp = GroupPrice::updateOrCreate(
            ['product_id' => $data['product_id'], 'variant_id' => $data['variant_id'] ?? null, 'group_id' => $data['group_id']],
            ['price' => $data['price']]
        );

        // Activity log captures old rate -> new rate, per your spec's Activity Log requirement
        ActivityLogger::log($request->user()->id, GroupPrice::class, $gp->id, 'price_changed', ['price' => $oldPrice], ['price' => $data['price']]);
        DashboardController::clearCache();
        return response()->json(['message' => 'Group price updated.', 'data' => $gp]);
    }
    public function getProductPricing($productId)
    {
        $groupPrices = GroupPrice::where('product_id', $productId)->get();

        $dealerPrices = DealerSpecificPrice::where('product_id', $productId)
            ->with('user:id,name,phone')
            ->get();

        $quantitySlabs = QuantitySlab::where('product_id', $productId)->get();

        return response()->json([
            'group_prices' => $groupPrices,
            'dealer_prices' => $dealerPrices->map(function ($dp) {
                return [
                    'id' => $dp->id,
                    'product_id' => $dp->product_id,
                    'variant_id' => $dp->variant_id,
                    'user_id' => $dp->user_id,
                    'override_price' => $dp->override_price,
                    'reason_text' => $dp->reason_text,
                    'dealer_name' => $dp->user?->name,
                    'dealer_phone' => $dp->user?->phone,
                ];
            }),
            'quantity_slabs' => $quantitySlabs,
        ]);
    }
    public function setDealerOverride(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'user_id' => 'required|exists:users,id',
            'override_price' => 'required|numeric|min:0',
            'reason_text' => 'nullable|string',
        ]);

        $existing = DealerSpecificPrice::where('product_id', $data['product_id'])
            ->where('variant_id', $data['variant_id'] ?? null)
            ->where('user_id', $data['user_id'])
            ->first();
        $oldPrice = $existing?->override_price;

        $dp = DealerSpecificPrice::updateOrCreate(
            ['product_id' => $data['product_id'], 'variant_id' => $data['variant_id'] ?? null, 'user_id' => $data['user_id']],
            ['override_price' => $data['override_price'], 'reason_text' => $data['reason_text'] ?? null]
        );

        ActivityLogger::log($request->user()->id, DealerSpecificPrice::class, $dp->id, 'dealer_price_override', ['price' => $oldPrice], ['price' => $data['override_price']]);
        DashboardController::clearCache();
        return response()->json(['message' => 'Dealer-specific price set. This overrides the group price only for this dealer.', 'data' => $dp]);
    }

    public function removeDealerOverride(Request $request, $id)
    {
        $dp = DealerSpecificPrice::findOrFail($id);
        ActivityLogger::log($request->user()->id, DealerSpecificPrice::class, $dp->id, 'dealer_price_override_removed', ['price' => $dp->override_price], []);
        $dp->delete();
        return response()->json(['message' => 'Override removed. Dealer will now see standard group price.']);
    }
    public function setQuantitySlabs(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'slabs' => 'present|array',   // ✅ was 'required|array|min:1'
            'slabs.*.min_qty' => 'required|integer|min:1',
            'slabs.*.max_qty' => 'nullable|integer',
            'slabs.*.price' => 'required|numeric|min:0',
        ]);

        // Delete all slabs for this product/variant
        QuantitySlab::where('product_id', $data['product_id'])
            ->where('variant_id', $data['variant_id'] ?? null)
            ->delete();

        // If slabs provided, create them
        $created = collect($data['slabs'] ?? [])->map(fn($slab) => QuantitySlab::create([
            'product_id' => $data['product_id'],
            'variant_id' => $data['variant_id'] ?? null,
            'min_qty' => $slab['min_qty'],
            'max_qty' => $slab['max_qty'] ?? null,
            'price' => $slab['price'],
        ]));

        ActivityLogger::log(
            $request->user()->id,
            \App\Models\Product::class,
            $data['product_id'],
            'quantity_slabs_updated',
            [],
            ['slabs' => $data['slabs'] ?? []]
        );
        DashboardController::clearCache();
        return response()->json([
            'message' => count($created) > 0
                ? 'Quantity slabs updated.'
                : 'All quantity slabs removed.',
            'data' => $created,
        ]);
    }
}
