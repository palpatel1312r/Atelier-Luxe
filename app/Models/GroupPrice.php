<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupPrice extends Model
{
    protected $fillable = [
        'product_id',
        'variant_id',
        'group_id',
        'price',
        'discount_percentage',
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
    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}
