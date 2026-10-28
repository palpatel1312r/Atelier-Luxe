<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotifyMeRequest extends Model
{
    protected $table = 'notify_me_requests';
    protected $fillable = ['user_id', 'product_id', 'variant_id', 'is_notified'];
    protected $casts = ['is_notified' => 'boolean'];
    public function user() { return $this->belongsTo(User::class); }
    public function product() { return $this->belongsTo(Product::class); }
}
