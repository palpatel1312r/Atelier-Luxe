<?php

namespace App\Events;

use App\Models\Chat;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcasts instantly to the receiver's private channel the moment a chat
 * message is sent — this is what replaces the 10s polling in Chat.jsx once
 * Laravel Reverb (or Pusher) is wired up (see README Phase 5 setup).
 */
class NewChatMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Chat $chat) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.' . $this->chat->receiver_id)];
    }

    public function broadcastAs(): string
    {
        return 'new-message';
    }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->chat->id,
            'sender_id'    => $this->chat->sender_id,
            'receiver_id'  => $this->chat->receiver_id,
            'message_text' => $this->chat->message_text,
            'created_at'   => $this->chat->created_at,
            'status'       => $this->chat->status ?? 'sent',
            'tick'         => $this->chat->tick ?? 'sent', // ✅
        ];
    }
}
