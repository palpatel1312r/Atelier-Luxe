<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAddress extends Model
{
    protected $fillable = [
        'user_id', 'label', 'recipient_name', 'phone', 'address_line',
        'city', 'state', 'pincode', 'country', 'is_default',
    ];

    protected $casts = ['is_default' => 'boolean'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function formatted(): string
    {
        return implode(', ', array_filter([
            $this->recipient_name,
            $this->address_line,
            $this->city,
            $this->state,
            $this->pincode,
            $this->country,
            $this->phone ? 'Phone: ' . $this->phone : null,
        ]));
    }
}
