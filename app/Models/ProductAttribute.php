<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAttribute extends Model
{
    protected $fillable = ['product_id', 'attribute_name', 'attribute_value', 'attribute_type', 'display_order'];
    public function product() { return $this->belongsTo(Product::class); }
}
