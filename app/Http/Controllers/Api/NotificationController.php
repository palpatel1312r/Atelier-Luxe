<?php

namespace App\Http\Controllers\Api;

use App\Constants\Roles;
use App\Events\NewNotification;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotifyMeRequest;
use App\Models\User;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // For admin, show all notifications
        if ($user->role?->name === Roles::SUPER_ADMIN || $user->role?->name === Roles::SAAS_ADMIN) {
            $items = Notification::with('user')
                ->latest()
                ->limit(50)
                ->get()
                ->map(function ($notification) {
                    return $this->formatNotification($notification);
                });

            return response()->json([
                'data' => $items,
                'unread_count' => 0 // Admins don't have unread counts
            ]);
        }

        // For dealers, show their notifications
        $items = Notification::where('user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(function ($notification) {
                return $this->formatNotification($notification);
            });

        return response()->json([
            'data' => $items,
            'unread_count' => $items->where('is_read', false)->count()
        ]);
    }

    private function formatNotification($notification)
    {
        // Decode data if it's a string
        $data = $notification->data;
        if (is_string($data)) {
            $data = json_decode($data, true);
        }

        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'is_read' => (bool) $notification->is_read,
            'is_broadcast' => (bool) $notification->is_broadcast,
            'data' => $data,
            'product_id' => $notification->product_id,
            'created_at' => $notification->created_at->diffForHumans(),
            'created_at_raw' => $notification->created_at->toISOString(),
        ];
    }
    public function markRead(Request $request, Notification $notification)
    {
        // BUG FIX (IDOR): previously any authenticated user could mark ANY
        // notification as read just by guessing/incrementing the ID — there
        // was no ownership check at all. Now that broadcast() creates one row
        // per recipient dealer (see the fix there), every notification always
        // belongs to exactly one user, so a plain ownership check is both
        // correct and sufficient — no need to special-case broadcasts anymore.
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $notification->update(['is_read' => true, 'read_at' => now()]);
        return response()->json(['message' => 'Marked as read.']);
    }

    // PATCH /api/notifications/read-all
    public function markAllRead(Request $request)
    {
        $user = $request->user();
        // Mark all unread notifications as read
        Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    // DELETE /api/notifications/clear-all
    public function clearAll(Request $request)
    {
        $user = $request->user();
        // Delete all notifications for this user
        Notification::where('user_id', $user->id)->delete();

        return response()->json(['message' => 'All notifications cleared.']);
    }

    public function broadcast(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'message' => 'required|string',
            'type' => 'nullable|string',
            'target_group_id' => 'nullable|exists:groups,id',
            'product_id' => 'nullable|exists:products,id',
            'order_id' => 'nullable|exists:orders,id',
        ]);

        $targetDealers = User::whereHas('role', fn($q) => $q->where('name', Roles::DEALER))
            ->when($request->target_group_id, fn($q) => $q->where('group_id', $request->target_group_id))
            ->pluck('id');

        foreach ($targetDealers as $dealerId) {
            $notification = Notification::create([
                'user_id' => $dealerId,
                'title' => $request->title,
                'message' => $request->message,
                'type' => $request->type ?? 'broadcast',
                'is_broadcast' => true,
                'target_group_id' => $request->target_group_id,
                'data' => [
                    'product_id' => $request->product_id,
                    'order_id' => $request->order_id,
                ],
                'product_id' => $request->product_id,
                'is_read' => false,
            ]);

            // Broadcast to the dealer's private channel
            broadcast(new NewNotification($notification, $dealerId));
        }

        return response()->json([
            'message' => "Broadcast sent to {$targetDealers->count()} dealer(s).",
            'data' => ['recipients' => $targetDealers->count()],
        ]);
    }


    public static function notifyBackInStock(int $productId, ?int $variantId = null): void
    {
        $requests = NotifyMeRequest::where('product_id', $productId)
            ->when($variantId, fn($q) => $q->where('variant_id', $variantId))
            ->where('is_notified', false)
            ->get();

        foreach ($requests as $req) {
            $notification = Notification::create([
                'user_id' => $req->user_id,
                'title' => 'Back in Stock',
                'message' => 'An item on your notify list is back in stock.',
                'type' => 'back_in_stock',
                'data' => ['product_id' => $productId],
                'product_id' => $productId,
                'is_read' => false,
            ]);

            broadcast(new NewNotification($notification, $req->user_id));
            $req->update(['is_notified' => true]);
        }
    }
}
