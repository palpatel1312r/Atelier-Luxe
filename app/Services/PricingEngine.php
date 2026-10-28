<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class PricingEngine
{
    private static bool $hasEffectiveFrom = false;
    private static bool $hasEffectiveTo = false;
    private static bool $schemaChecked = false;

    public function resolve(
        User $user,
        Product $product,
        ?ProductVariant $variant,
        int $quantity,
        ?\Illuminate\Support\Collection $preloadedGroupPrices = null
    ): array {
        $now = Carbon::now();

        // ---- 1. Quantity slab (now highest priority) ----
        $slabs = $product->quantitySlabs;

        if ($variant) {
            $slabs = $slabs->where('variant_id', $variant->id);
        } else {
            $slabs = $slabs->whereNull('variant_id');
        }

        $slab = $slabs
            ->filter(function ($s) use ($quantity) {
                return $s->min_qty <= $quantity
                    && (is_null($s->max_qty) || $s->max_qty >= $quantity);
            })
            ->sortByDesc('min_qty')
            ->first();

        if ($slab) {
            return [
                'price'     => (float) $slab->price,
                'source'    => 'quantity_slab',
                'source_id' => $slab->id,
            ];
        }

        // ---- 2. Dealer-specific override ----
        $override = $product->dealerPrices
            ->where('user_id', $user->id)
            ->when($variant, fn($q) => $q->where('variant_id', $variant->id))
            ->when(!$variant, fn($q) => $q->whereNull('variant_id'))
            ->first();

        if ($override) {
            return [
                'price'     => (float) $override->override_price,
                'source'    => 'dealer_override',
                'source_id' => $override->id,
            ];
        }

        // ---- 3. Group price ----
        if ($user->group_id) {
            $groupId = (int) $user->group_id;

            if ($preloadedGroupPrices) {
                $groupPrice = $preloadedGroupPrices
                    ->filter(fn($gp) => (int) $gp->group_id === $groupId)
                    ->sortBy(fn($gp) => $gp->variant_id === null ? 1 : 0)
                    ->first(function ($gp) use ($variant) {
                        if (!$variant) {
                            return $gp->variant_id === null;
                        }
                        return (int) $gp->variant_id === (int) $variant->id || $gp->variant_id === null;
                    });
            } else {
                $query = $product->groupPrices()->where('group_id', $groupId);

                if ($variant) {
                    $query->where(function ($q) use ($variant) {
                        $q->where('variant_id', $variant->id)->orWhereNull('variant_id');
                    })->orderByRaw('CASE WHEN variant_id IS NULL THEN 1 ELSE 0 END');
                } else {
                    $query->whereNull('variant_id');
                }

                if (!self::$schemaChecked) {
                    self::$hasEffectiveFrom = Schema::hasColumn('group_prices', 'effective_from');
                    self::$hasEffectiveTo   = Schema::hasColumn('group_prices', 'effective_to');
                    self::$schemaChecked    = true;
                }

                if (self::$hasEffectiveFrom) {
                    $query->where(fn($q) => $q->whereNull('effective_from')->orWhere('effective_from', '<=', $now));
                }
                if (self::$hasEffectiveTo) {
                    $query->where(fn($q) => $q->whereNull('effective_to')->orWhere('effective_to', '>=', $now));
                }

                $groupPrice = $query->first();
            }

            if ($groupPrice) {
                return [
                    'price'     => (float) $groupPrice->price,
                    'source'    => 'group_price',
                    'source_id' => $groupPrice->id,
                ];
            }
        }

        // ---- 4. Fallback to MRP ----
        if ($variant) {
            return [
                'price'     => (float) $variant->mrp,
                'source'    => 'mrp',
                'source_id' => null,
            ];
        }

        $firstVariant = $product->variants->first();
        if ($firstVariant) {
            return [
                'price'     => (float) $firstVariant->mrp,
                'source'    => 'mrp',
                'source_id' => null,
            ];
        }

        return ['price' => null, 'source' => null, 'source_id' => null];
    }

    public function price(
        User $user,
        Product $product,
        ?ProductVariant $variant,
        int $quantity,
        ?\Illuminate\Support\Collection $preloadedGroupPrices = null
    ): ?float {
        return $this->resolve($user, $product, $variant, $quantity, $preloadedGroupPrices)['price'];
    }
}
