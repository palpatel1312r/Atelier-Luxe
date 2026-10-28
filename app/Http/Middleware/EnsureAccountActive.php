<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * BUG FIX: EnsureRole already checked is_blocked/is_active, but that
 * middleware only runs on role-gated routes (dealer-only, admin-only).
 * The plain `auth:sanctum` route group — /dashboard, /products, /chat,
 * /notifications — had NO account-status check at all. A blocked dealer,
 * or a dealer deactivated mid-session, could still browse products, read
 * notifications, and use chat for as long as their token remained valid.
 *
 * This middleware runs on every authenticated route (see routes/api.php),
 * so account status is enforced uniformly regardless of which specific
 * role-gated group a route does or doesn't belong to. EnsureRole's own
 * is_blocked/is_active checks are left in place too — harmless duplication,
 * and it means EnsureRole still fails safe on its own if this middleware
 * is ever accidentally left off a route in the future.
 */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->is_blocked) {
            // Revoke the token being used right now so this isn't just a
            // one-request block — the account is actually logged out.
            $user->currentAccessToken()?->delete();
            return response()->json(['message' => 'Your account has been blocked. Contact admin.'], 403);
        }

        if (!$user->is_active) {
            $user->currentAccessToken()?->delete();
            return response()->json(['message' => 'Your account is not active.'], 403);
        }

        return $next($request);
    }
}
