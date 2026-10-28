<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductLabel extends Model
{
    protected $fillable = ['product_id', 'label_name'];
    public function product() { return $this->belongsTo(Product::class); }
}
