<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuantitySlab extends Model
{
    protected $fillable = ['product_id', 'variant_id', 'min_qty', 'max_qty', 'price'];

    public function product() { return $this->belongsTo(Product::class); }
    public function variant() { return $this->belongsTo(ProductVariant::class, 'variant_id'); }
}
