<?php

namespace App\Console\Commands;

use App\Constants\OrderStatus;
use App\Models\Order;
use App\Services\ActivityLogger;
use App\Services\StockService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Auto-cancels orders admin never approved within the reservation window
 * (orders.reserved_until) and releases the held stock back to availability.
 * Prevents stock being locked forever by an order nobody looked at.
 *
 * Schedule this in routes/console.php (Laravel 11) or app/Console/Kernel.php:
 *   Schedule::command('orders:release-expired')->everyFifteenMinutes();
 */
class ReleaseExpiredReservations extends Command
{
    protected $signature = 'orders:release-expired';
    protected $description = 'Cancel pending orders past their reservation window and release held stock';

    public function handle(StockService $stockService): int
    {
        $expired = Order::where('order_status', OrderStatus::PENDING)
            ->whereNotNull('reserved_until')
            ->where('reserved_until', '<', now())
            ->with('items')
            ->get();

        foreach ($expired as $order) {
            DB::transaction(function () use ($order, $stockService) {
                foreach ($order->items as $item) {
                    $stockService->release($item->variant_id, $item->quantity);
                }

                $order->update([
                    'order_status' => OrderStatus::CANCELLED,
                    'cancelled_at' => now(),
                    'cancelled_by' => null,
                ]);
                $order->statusHistory()->create([
                    'status_from' => OrderStatus::PENDING,
                    'status_to' => OrderStatus::CANCELLED,
                    'changed_by' => $order->user_id,
                    'reason_text' => 'Auto-cancelled: reservation window expired without admin action.',
                ]);

                ActivityLogger::log(null, Order::class, $order->id, 'auto_cancelled_expired_reservation');
            });
        }

        $this->info("Released {$expired->count()} expired order reservation(s).");
        return self::SUCCESS;
    }
}
