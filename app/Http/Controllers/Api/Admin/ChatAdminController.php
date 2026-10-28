<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use App\Constants\Roles;
use Illuminate\Http\Request;

class ChatAdminController extends Controller
{
    public function conversations(Request $request)
    {
        // 1. Get all users who have the 'dealer' role
        $dealers = User::whereHas('role', function ($q) {
            $q->where('name', Roles::DEALER);
        })->get(['id', 'name', 'company_name', 'email', 'phone']);

        if ($dealers->isEmpty()) {
            return response()->json(['data' => []]);
        }

        // 2. Map through dealers to get their chat stats
        $conversations = $dealers->map(function ($dealer) {
            // Get the LAST message involving this dealer
            $last = Chat::where(function ($q) use ($dealer) {
                $q->where('sender_id', $dealer->id)
                    ->orWhere('receiver_id', $dealer->id);
            })
                ->with(['sender', 'attachments'])
                ->latest()
                ->first();

            // If the dealer has never sent or received a message, don't show them in the inbox
            if (!$last) {
                return null;
            }

            // Count unread messages FROM this dealer TO any admin
            $unread = Chat::where('sender_id', $dealer->id)
                ->whereHas('receiver', function ($q) {
                    $q->whereHas('role', function ($r) {
                        $r->whereIn('name', [Roles::SUPER_ADMIN, Roles::SAAS_ADMIN]);
                    });
                })
                ->where('is_read', false)
                ->count();

            return [
                'dealer_id'         => $dealer->id,
                'dealer_name'       => $dealer->name,
                'company_name'      => $dealer->company_name,
                'dealer_email'      => $dealer->email,
                'dealer_phone'      => $dealer->phone,
                'last_message'      => $last->message_text,
                'last_message_at'   => $last->created_at?->toISOString(),
                'last_message_type' => $last->attachments && $last->attachments->count() > 0 ? 'attachment' : 'text',
                'unread_count'      => $unread,
            ];
        })
            ->filter() // Remove nulls (dealers with no chats)
            ->sortByDesc('last_message_at')
            ->values();

        return response()->json(['data' => $conversations]);
    }
}
