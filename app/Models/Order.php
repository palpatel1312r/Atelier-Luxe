<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'order_number',
        'total_amount',
        'discount_amount',
        'tax_amount',
        'grand_total',
        'payment_method',
        'payment_status',
        'order_status',
        'shipping_address',
        'billing_address',
        'gst_invoice_number',
        'gst_invoice_url',
        'tracking_number',
        'shipping_partner',
        'reserved_until',
        'notes',
        'cancelled_at',
        'cancelled_by',
    ];

    protected $casts = ['reserved_until' => 'datetime', 'cancelled_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
    public function statusHistory()
    {
        return $this->hasMany(OrderStatusHistory::class);
    }
}
