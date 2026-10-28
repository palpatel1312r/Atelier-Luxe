<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BulkUploadLog extends Model
{
    protected $fillable = [
        'user_id', 'file_name', 'file_path', 'total_rows',
        'success_rows', 'failed_rows', 'errors', 'status',
    ];
    protected $casts = ['errors' => 'array'];
    public function user() { return $this->belongsTo(User::class); }
}
