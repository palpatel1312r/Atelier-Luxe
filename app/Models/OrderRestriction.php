<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderRestriction extends Model
{
    protected $fillable = [
        'user_id', 'min_order_value', 'max_order_value', 'max_quantity_per_product',
        'max_quantity_per_order', 'credit_block', 'restricted_states',
    ];
    protected $casts = ['credit_block' => 'boolean', 'restricted_states' => 'array'];
    public function user() { return $this->belongsTo(User::class); }
}
