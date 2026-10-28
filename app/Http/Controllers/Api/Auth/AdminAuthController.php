<?php

namespace App\Http\Controllers\Api\Auth;

use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminAuthController extends Controller
{
    // POST /api/admin/login  { email, password, remember }
    public function login(Request $request)
    {
        $v = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
            'remember' => 'sometimes|boolean',
        ]);
        if ($v->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $v->errors()], 422);
        }

        $user = User::where('email', $request->email)->whereHas('role', function ($q) {
            $q->whereIn('name', Roles::ADMIN_ROLES);
        })->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if ($user->is_blocked) {
            return response()->json(['message' => 'Account blocked.'], 403);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'This account has been deactivated. Contact the platform owner.'], 403);
        }

        // "Remember Me" -> long-lived token; otherwise a short-lived one.
        $expiresAt = $request->boolean('remember')
            ? now()->addDays(30)
            : now()->addHours(12);

        $token = $user->createToken('admin-token', ['*'], $expiresAt)->plainTextToken;

        $user->update(['last_login_at' => now()]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'expires_at' => $expiresAt,
            'user' => $user->load('role'),
        ]);
    }

    // POST /api/logout (shared with dealer)
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out.']);
    }

    // POST /api/admin/forgot-password { email }
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            // Don't reveal whether the email exists — standard security practice.
            return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
        }

        $token = str()->random(64);
        \Illuminate\Support\Facades\DB::table('password_resets')->updateOrInsert(
            ['email' => $request->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        // NOTE: password-reset email delivery is not yet wired to a mail driver.
        // Wire this once SMTP/SES credentials are available:
        // Mail::to($user)->send(new ResetPasswordMail($token));

        return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
    }

    // POST /api/admin/reset-password { email, token, password }
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = \Illuminate\Support\Facades\DB::table('password_resets')->where('email', $request->email)->first();
        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'Invalid or expired reset token.'], 422);
        }
        if (now()->diffInMinutes($record->created_at) > 60) {
            return response()->json(['message' => 'Reset link expired.'], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => Hash::make($request->password)]);
        \Illuminate\Support\Facades\DB::table('password_resets')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successful.']);
    }

    // ✅ NEW: PUT /api/admin/profile/password  { current_password, password, password_confirmation }
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // Check if current password matches
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Optionally revoke other tokens (keep current one active)
        // $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
