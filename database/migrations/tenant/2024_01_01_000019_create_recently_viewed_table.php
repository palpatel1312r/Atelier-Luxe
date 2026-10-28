<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class RecentlyViewed extends Model
{
    use BelongsToTenant;

    // ✅ CRITICAL FIX: Match the exact table name from your migration
    protected $table = 'recently_viewed';

    protected $fillable = ['user_id', 'product_id', 'variant_id', 'viewed_at'];

    protected $casts = ['viewed_at' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
