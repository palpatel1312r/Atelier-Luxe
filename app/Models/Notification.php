<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',
        'is_read',
        'is_broadcast',
        'target_group_id',
        'data',        // ✅ Add this
        'product_id',
        'read_at',
    ];
    protected $casts = ['is_read' => 'boolean', 'is_broadcast' => 'boolean', 'read_at' => 'datetime', 'data' => 'array'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function targetGroup()
    {
        return $this->belongsTo(Group::class, 'target_group_id');
    }
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
