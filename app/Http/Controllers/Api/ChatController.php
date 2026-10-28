<?php

namespace App\Http\Controllers\Api;

use App\Events\NewChatMessage;
use App\Events\MessageRead;
use App\Events\TypingStarted;
use App\Events\TypingStopped;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatAttachment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{

    public function send(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'message_text' => 'nullable|string|max:2000',
            'attachments' => 'nullable|array',
            'attachments.*.file_path' => 'required|string',
            'attachments.*.file_type' => 'nullable|string',
        ]);

        $sender = $request->user();

        if (!$this->canChatWith($sender, (int) $request->receiver_id)) {
            return response()->json(['message' => 'You can only chat with admin support.'], 403);
        }

        // Validate at least one field is present
        if (!$request->message_text && empty($request->attachments)) {
            return response()->json(['message' => 'Message cannot be empty.'], 422);
        }

        DB::beginTransaction();
        try {
            $chat = Chat::create([
                'sender_id' => $sender->id,
                'receiver_id' => $request->receiver_id,
                'message_text' => $request->message_text,
                'is_read' => false,
                'status' => 'sent',
            ]);

            if ($request->attachments) {
                foreach ($request->attachments as $att) {
                    ChatAttachment::create([
                        'chat_id' => $chat->id,
                        'file_path' => $att['file_path'],
                        'file_type' => $att['file_type'] ?? 'image',
                    ]);
                }
            }

            DB::commit();

            // Load relationships and broadcast
            $chat->load(['attachments', 'sender']);
            broadcast(new NewChatMessage($chat))->toOthers();

            return response()->json([
                'message' => 'Sent.',
                'data' => $chat,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to send message.'], 500);
        }
    }

    public function markDelivered(Request $request, int $chatId)
    {
        $chat = Chat::findOrFail($chatId);

        if ($chat->receiver_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (!$chat->delivered_at) {
            $chat->update([
                'delivered_at' => now(),
                'status' => $chat->is_read ? 'read' : 'delivered',
            ]);
        }

        return response()->json(['message' => 'Delivered.', 'data' => $chat]);
    }

    public function typing(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'is_typing' => 'required|boolean',
        ]);

        $user = $request->user();

        if (!$this->canChatWith($user, (int) $request->receiver_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($request->is_typing) {
            event(new TypingStarted($user->id, $request->receiver_id));
        } else {
            event(new TypingStopped($user->id, $request->receiver_id));
        }

        return response()->json(['message' => 'OK']);
    }

    private function canChatWith(User $user, int $otherUserId): bool
    {
        if ($user->id === $otherUserId) return false;

        $other = User::with('role')->find($otherUserId);
        if (!$other) return false;

        if ($user->isDealer()) {
            return $other->isSuperAdmin() || $other->isSaasAdmin();
        }

        if ($user->isSuperAdmin() || $user->isSaasAdmin()) {
            return $other->isDealer();
        }

        return false;
    }
    
    public function thread(Request $request, int $otherUserId)
    {
        $user = $request->user();

        if (!$this->canChatWith($user, $otherUserId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $messages = Chat::conversation($user->id, $otherUserId)
            ->with(['attachments', 'sender'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        // Mark as read
        Chat::where('sender_id', $otherUserId)
            ->where('receiver_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'status' => 'read',
            ]);

        // Broadcast read event
        event(new MessageRead($user->id, $otherUserId));

        return response()->json([
            'data' => $messages,
            'meta' => [
                'total' => $messages->count(),
                'has_more' => false,
            ],
        ]);
    }

    public function getContact(Request $request)
    {
        // Find the first available Super Admin or SaaS Admin
        // If you have a specific "Support" user, you can query for them specifically here.
        $admin = User::whereHas('role', function ($q) {
            $q->whereIn('name', ['super_admin', 'saas_admin']);
        })->first(['id', 'name', 'email']);

        if (!$admin) {
            return response()->json(['message' => 'No admin available to chat right now.'], 404);
        }

        return response()->json([
            'data' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
            ]
        ]);
    }
}
