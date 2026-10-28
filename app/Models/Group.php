<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'discount_percentage'];
    public function users() { return $this->hasMany(User::class); }
    public function groupPrices() { return $this->hasMany(GroupPrice::class); }
}
