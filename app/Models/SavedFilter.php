<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavedFilter extends Model
{
    protected $fillable = ['user_id', 'filter_name', 'filter_conditions'];
    protected $casts = ['filter_conditions' => 'array'];
    public function user() { return $this->belongsTo(User::class); }
}
