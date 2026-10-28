<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class TypingStarted implements ShouldBroadcast
{
  use SerializesModels;

  public function __construct(
    public int $userId,
    public int $receiverId
  ) {}

  public function broadcastOn(): PrivateChannel
  {
    return new PrivateChannel("chat.{$this->receiverId}");
  }

  public function broadcastAs(): string
  {
    return 'typing.started';
  }
}
