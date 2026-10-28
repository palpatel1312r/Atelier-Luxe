<?php

namespace App\Services;

use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

/**
 * Central place for every stock mutation so overselling is impossible.
 * Uses row-level locking (lockForUpdate) inside a transaction — critical
 * for a B2B app where multiple dealers can hit "place order" on the last
 * few units at the same moment.
 */
class StockService
{
    /**
     * Reserve stock when an order is placed (order_status = pending).
     * Throws if not enough available stock.
     */
    public function reserve(int $variantId, int $quantity): void
    {
        DB::transaction(function () use ($variantId, $quantity) {
            $variant = ProductVariant::where('id', $variantId)->lockForUpdate()->first();

            if (!$variant) {
                throw new \RuntimeException('Product variant not found.');
            }

            $available = $variant->stock_quantity - $variant->reserved_quantity;
            if ($available < $quantity) {
                throw new \RuntimeException("Only {$available} units available for SKU {$variant->sku}.");
            }

            $variant->increment('reserved_quantity', $quantity);
        });
    }

    /**
     * Release a reservation (order rejected / cancelled / reservation expired).
     */
    public function release(int $variantId, int $quantity): void
    {
        DB::transaction(function () use ($variantId, $quantity) {
            $variant = ProductVariant::where('id', $variantId)->lockForUpdate()->first();
            if (!$variant) return;
            $variant->decrement('reserved_quantity', min($quantity, $variant->reserved_quantity));
        });
    }

    /**
     * Convert a reservation into an actual stock decrease (order approved / dispatched).
     */
    public function commit(int $variantId, int $quantity): void
    {
        DB::transaction(function () use ($variantId, $quantity) {
            $variant = ProductVariant::where('id', $variantId)->lockForUpdate()->first();
            if (!$variant) return;
            $variant->decrement('stock_quantity', $quantity);
            $variant->decrement('reserved_quantity', min($quantity, $variant->reserved_quantity));
        });
    }

    public function availableStock(int $variantId): int
    {
        $variant = ProductVariant::find($variantId);
        return $variant ? ($variant->stock_quantity - $variant->reserved_quantity) : 0;
    }
}
