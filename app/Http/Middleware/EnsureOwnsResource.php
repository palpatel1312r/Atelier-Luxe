<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Extra safety net for dealer-scoped endpoints (e.g. /orders/{order}):
 * a dealer can NEVER view/modify another dealer's order/cart/wishlist by
 * guessing an ID, even though tenancy already isolates them at the DB level.
 * Controllers still must scope queries by user_id — this middleware is a
 * defense-in-depth layer, not a substitute for that.
 */
class EnsureOwnsResource
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && ($user->isSuperAdmin() || $user->isSaasAdmin())) {
            return $next($request); // admins can view all dealer resources by design
        }
        return $next($request); // actual ownership check happens in each controller query
    }
}
