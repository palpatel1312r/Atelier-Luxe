<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpVerification extends Model
{
    protected $fillable = ['user_id', 'phone', 'otp_code', 'is_verified', 'expires_at', 'attempts_count'];
    protected $casts = ['is_verified' => 'boolean', 'expires_at' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}
