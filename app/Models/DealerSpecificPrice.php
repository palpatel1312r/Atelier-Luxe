<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DealerSpecificPrice extends Model
{
    protected $fillable = [
        'product_id',
        'variant_id',
        'user_id',
        'override_price',
        'reason_text',
        'effective_from',
        'effective_to',
    ];
    protected $casts = ['effective_from' => 'datetime', 'effective_to' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
