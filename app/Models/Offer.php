<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'offer_type', 'discount_percentage',
        'flat_discount', 'coupon_code', 'start_date', 'end_date', 'is_active',
    ];
    protected $casts = ['start_date' => 'datetime', 'end_date' => 'datetime', 'is_active' => 'boolean'];
    public function products() { return $this->hasMany(OfferProduct::class); }
}
