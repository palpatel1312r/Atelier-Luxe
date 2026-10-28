<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use SoftDeletes;
    protected $fillable = ['name', 'slug', 'logo', 'description', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];
    public function products() { return $this->hasMany(Product::class); }
}
