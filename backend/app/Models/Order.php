<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use HasFactory;

    /**
     * Mass-assignable attributes.
     */
    protected $fillable = [
        'user_id',
        'items',
        'total',
        'status',
        'customer_name',
        'customer_email',
        'shipping_address',
    ];

    /**
     * Attribute casting.
     * - `items` is stored as JSON in the DB, cast to/from a PHP array.
     * - `total` is returned as a float, not a string (MySQL DECIMAL → string).
     */
    protected $casts = [
        'items' => 'array',
        'total' => 'float',
    ];

    /**
     * Allowed status values — use for validation or dropdowns in the admin UI.
     */
    public const STATUSES = [
        'pending',
        'processing',
        'shipped',
        'completed',
        'cancelled',
    ];

    /**
     * The customer who placed this order (nullable for guest checkout).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Convenience accessor: number of items in the order.
     *   $order->item_count
     */
    public function getItemCountAttribute(): int
    {
        return collect($this->items ?? [])->sum('qty');
    }

    /**
     * Scope: only orders matching a given status.
     *   Order::status('pending')->get();
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
