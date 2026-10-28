<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->is_blocked) {
            return response()->json(['message' => 'Your account has been blocked. Contact admin.'], 403);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Your account is inactive.'], 403);
        }

        // 🔥 CRITICAL FIX: Flatten roles passed as comma-separated string
        $normalizedRoles = [];
        foreach ($roles as $role) {
            foreach (explode(',', $role) as $singleRole) {
                $normalizedRoles[] = trim(strtolower($singleRole));
            }
        }
        // Normalize the user's role
        $userRoleName = $user->role?->name ?? '';
        $userRoleName = trim(strtolower($userRoleName));

        // 🔥 NORMALIZED STRICT CHECK
        if (empty($userRoleName) || !in_array($userRoleName, $normalizedRoles, true)) {
            return response()->json([
                'message' => 'Forbidden. Role mismatch.',
                'your_role' => $userRoleName,
                'required_roles' => $normalizedRoles,
            ], 403);
        }

        return $next($request);
    }
}
