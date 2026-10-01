<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $fillable = [
        'name', 'description', 'details', 'price', 'color',
        'category', 'category_id', 'sizes',
        'image', 'images', 'is_active',
        'stock', 'featured',
    ];

    protected $casts = [
        'details'   => 'array',
        'sizes'     => 'array',
        'images'    => 'array',
        'featured'  => 'boolean',
        'is_active' => 'boolean',
        'price'     => 'decimal:2',
    ];

    /**
     * The FK relation to categories.
     * Named `categoryRef` because `category` is also a string column.
     */
    public function categoryRef(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Accessor: `$product->category` returns the category name.
     * Prefers the relation if loaded, otherwise falls back to the
     * denormalized `category` column.
     */
    public function getCategoryAttribute(): ?string
    {
        if ($this->relationLoaded('categoryRef') && $this->categoryRef) {
            return $this->categoryRef->name;
        }
        return $this->attributes['category'] ?? null;
    }

    /**
     * Keep `category` (string) in sync when the FK is set.
     * Also append the raw column when serializing.
     */
    protected $appends = [];
}