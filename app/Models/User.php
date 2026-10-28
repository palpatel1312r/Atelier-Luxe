<?php

namespace App\Models;

use App\Constants\Roles;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $with = ['role'];

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'company_name',
        'gst_number',
        'address',
        'city',
        'state',
        'pincode',
        'country',
        'role_id',
        'group_id',
        'credit_limit',
        'outstanding_amount',
        'is_active',
        'is_blocked',
        'last_login_at',
        'last_order_at',
        'monthly_purchase',
        'return_percentage',
        'activity_score',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'password' => 'hashed',
        'is_active' => 'boolean',
        'is_blocked' => 'boolean',
        'last_login_at' => 'datetime',
        'last_order_at' => 'datetime',
    ];

    // ---- Relationships ----
    public function role()
    {
        return $this->belongsTo(Role::class);
    }
    public function group()
    {
        return $this->belongsTo(Group::class);
    }
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
    public function addresses()
    {
        return $this->hasMany(UserAddress::class);
    }
    public function cart()
    {
        return $this->hasOne(Cart::class);
    }
    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }
    public function recentlyViewed()
    {
        return $this->hasMany(RecentlyViewed::class);
    }
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }
    public function dealerPrices()
    {
        return $this->hasMany(DealerSpecificPrice::class);
    }
    public function orderRestriction()
    {
        return $this->hasOne(OrderRestriction::class);
    }

    // ---- Role helpers (used everywhere for authorization) ----
    public function isSaasAdmin(): bool
    {
        return $this->role?->name === Roles::SAAS_ADMIN;
    }
    public function isSuperAdmin(): bool
    {
        return $this->role?->name === Roles::SUPER_ADMIN;
    }
    public function isDealer(): bool
    {
        return $this->role?->name === Roles::DEALER;
    }

    // ---- Available credit (used by order restriction checks) ----
    public function availableCredit(): float
    {
        return (float) $this->credit_limit - (float) $this->outstanding_amount;
    }
}
