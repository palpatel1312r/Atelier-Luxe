<?php

namespace App\Models;

use App\Models\Wishlist;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'is_admin'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['is_admin' => 'boolean'];

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
