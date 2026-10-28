<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatAttachment extends Model
{
    const UPDATED_AT = null;
    protected $fillable = ['chat_id', 'file_path', 'file_type'];
    public function chat() { return $this->belongsTo(Chat::class); }
}
