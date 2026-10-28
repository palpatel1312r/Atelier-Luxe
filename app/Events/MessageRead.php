<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class MessageRead implements ShouldBroadcast
{
  use SerializesModels;

  public function __construct(
    public int $readerId,
    public int $senderId
  ) {}

  public function broadcastOn(): PrivateChannel
  {
    return new PrivateChannel("chat.{$this->senderId}");
  }

  public function broadcastAs(): string
  {
    return 'message.read';
  }
}
