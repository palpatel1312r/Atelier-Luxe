<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'category_id',
        'brand_id',
        'description',
        'features',
        'tags',
        'min_order_qty',
        'max_order_qty',
        'low_stock_threshold',
        'expected_restock_date',
        'weight',
        'length',
        'width',
        'height',
        'is_active',
        'is_featured',
        'is_new_arrival',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'hsn_code',
        'gst_rate',
        'warehouse_id',
        'product_id',
        'group_id',
        'variant_id',
        'price',
    ];

    protected $casts = [
        'price' => 'float',
        'tags' => 'array',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'is_new_arrival' => 'boolean',
        'expected_restock_date' => 'date',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }
    public function attributes()
    {
        return $this->hasMany(ProductAttribute::class);
    }
    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }
    public function groupPrices()
    {
        return $this->hasMany(GroupPrice::class);
    }
    public function dealerPrices()
    {
        return $this->hasMany(DealerSpecificPrice::class);
    }
    public function quantitySlabs()
    {
        return $this->hasMany(QuantitySlab::class);
    }
    public function tags_relation()
    {
        return $this->hasMany(ProductTag::class, 'product_id');
    }
    public function labels()
    {
        return $this->hasMany(ProductLabel::class);
    }
    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }

    public function totalAvailableStock(): int
    {
        return (int) $this->variants()->sum('stock_quantity') - (int) $this->variants()->sum('reserved_quantity');
    }

    public function stockStatus(): string
    {
        $available = max(0, $this->totalAvailableStock());

        if ($available <= 0) return 'out_of_stock';
        if ($available <= $this->low_stock_threshold) return 'low_stock';
        return 'in_stock';
    }
}
