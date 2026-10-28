<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class OrderStatusHistory extends Model
{
    use BelongsToTenant; // ✅ This solves the connection issue

    // ✅ Match the migration table name (singular, no 's')
    protected $table = 'order_status_history';

    protected $fillable = ['order_id', 'status_from', 'status_to', 'changed_by', 'reason_text'];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
