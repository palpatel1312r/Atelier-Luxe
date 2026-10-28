<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'barcode',
        'attributes',
        'stock_quantity',
        'reserved_quantity',
        'mrp',
        'cost_price',
        'pack_size',
        'is_active',
    ];

    protected $casts = [
        'attributes' => 'array',
        'is_active' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function images()
    {
        return $this->hasMany(ProductImage::class, 'variant_id');
    }
    public function groupPrices()
    {
        return $this->hasMany(GroupPrice::class, 'variant_id');
    }
    public function dealerPrices()
    {
        return $this->hasMany(DealerSpecificPrice::class, 'variant_id');
    }
    public function quantitySlabs()
    {
        return $this->hasMany(QuantitySlab::class, 'variant_id');
    }

    public function availableStock(): int
    {
        return (int) $this->stock_quantity - (int) $this->reserved_quantity;
    }
}
