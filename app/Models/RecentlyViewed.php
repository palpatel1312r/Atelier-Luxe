<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class RecentlyViewed extends Model
{
    use BelongsToTenant;  // ✅ This is the magic trait!

    // ✅ Tell Laravel the exact table name (singular, no 's')
    protected $table = 'recently_viewed';

    protected $fillable = ['user_id', 'product_id', 'viewed_at'];

    protected $casts = ['viewed_at' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
