<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chat extends Model
{
    protected $fillable = [
        'sender_id',
        'receiver_id',
        'message_text',
        'is_read',
        'read_at',
        'delivered_at',
        'status',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    protected $appends = ['tick', 'time_ago'];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ChatAttachment::class);
    }

    public function getTickAttribute(): string
    {
        if ($this->status === 'read' || $this->is_read) {
            return 'read';
        }
        if ($this->status === 'delivered' || $this->delivered_at) {
            return 'delivered';
        }
        return 'sent';
    }

    public function getTimeAgoAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }

    // Scope for conversation queries
    public function scopeConversation($query, int $userId, int $otherUserId)
    {
        return $query->where(function ($q) use ($userId, $otherUserId) {
            $q->where(function ($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $userId)->where('receiver_id', $otherUserId);
            })->orWhere(function ($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $otherUserId)->where('receiver_id', $userId);
            });
        });
    }
}
