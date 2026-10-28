<?php

namespace App\Http\Controllers\Api\Auth;

use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class DealerAuthController extends Controller
{
    public function __construct(protected OtpService $otpService) {}

    // POST /api/dealer/register
    public function register(Request $request)
    {
        $v = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|regex:/^[0-9]{10}$/',
            'email' => 'nullable|email|unique:users,email',
            'company_name' => 'nullable|string|max:255',
            'gst_number' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'pincode' => 'nullable|string|max:6|regex:/^[0-9]{6}$/',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($v->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $v->errors()
            ], 422);
        }

        // ✅ CHECK: If phone already exists in DB, block registration
        if (User::where('phone', $request->phone)->exists()) {
            return response()->json([
                'message' => 'This phone number is already registered. Please login.',
                'errors' => ['phone' => ['This phone number is already registered. Please login.']]
            ], 422);
        }

        $dealerRole = Role::where('name', Roles::DEALER)->firstOrFail();

        // ✅ Create user with is_active = false (pending verification)
        $user = User::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'company_name' => $request->company_name,
            'gst_number' => $request->gst_number,
            'address' => $request->address,
            'city' => $request->city,
            'state' => $request->state,
            'pincode' => $request->pincode,
            'password' => Hash::make($request->password),
            'role_id' => $dealerRole->id,
            'is_active' => false, // ✅ User is pending until OTP verification
        ]);

        // ✅ Send OTP using the user's ID (this will work!)
        try {
            $otp = $this->otpService->generate($request->phone, $user->id);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        return response()->json([
            'message' => 'Registration successful. Please verify OTP to activate your account.',
            'user_id' => $user->id,
            'otp_expires_in_seconds' => 300,
            'debug_otp' => app()->environment('local') ? $otp->otp_code : null,
        ], 201);
    }
    // POST /api/dealer/send-otp
    public function sendOtp(Request $request)
    {
        $request->validate(['phone' => 'required|string|regex:/^[0-9]{10}$/']);

        $user = User::where('phone', $request->phone)->first();
        if (!$user) {
            return response()->json(['message' => 'No account found with this number. Please register.'], 404);
        }
        if ($user->is_blocked) {
            return response()->json(['message' => 'Your account has been blocked. Contact admin.'], 403);
        }

        try {
            $otp = $this->otpService->generate($request->phone, $user->id);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 429);
        }

        return response()->json([
            'message' => 'OTP sent.',
            'otp_expires_in_seconds' => 300,
            'debug_otp' => app()->environment('local') ? $otp->otp_code : null,
        ]);
    }
    // POST /api/dealer/verify-otp
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|regex:/^[0-9]{10}$/',
            'otp' => 'required|string',
            'remember' => 'sometimes|boolean',
        ]);

        try {
            $this->otpService->verify($request->phone, $request->otp);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $user = User::where('phone', $request->phone)->first();

        if (!$user) {
            return response()->json(['message' => 'No account found with this number.'], 404);
        }

        if ($user->is_blocked) {
            return response()->json(['message' => 'Your account has been blocked. Contact admin.'], 403);
        }

        // ✅ Activate the user (whether new registration or existing)
        if (!$user->is_active) {
            $user->update(['is_active' => true]);
        }

        $expiresAt = $request->boolean('remember') ? now()->addDays(30) : now()->addHours(12);
        $token = $user->createToken('dealer-token', ['*'], $expiresAt)->plainTextToken;
        $user->update(['last_login_at' => now()]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'expires_at' => $expiresAt,
            'user' => $user->load(['role', 'group']),
        ]);
    }
    // POST /api/dealer/login-password { email, password }
    public function loginWithPassword(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required|string']);

        $user = User::where('email', $request->email)->whereHas('role', fn($q) => $q->where('name', Roles::DEALER))->first();

        if (!$user || !$user->password || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }
        if ($user->is_blocked) {
            return response()->json(['message' => 'Account blocked.'], 403);
        }
        if (!$user->is_active) {
            return response()->json(['message' => 'Your account is not active yet. Please verify via OTP first or contact admin.'], 403);
        }

        $token = $user->createToken('dealer-token', ['*'], now()->addHours(12))->plainTextToken;
        $user->update(['last_login_at' => now()]);

        return response()->json(['message' => 'Login successful', 'token' => $token, 'user' => $user->load(['role', 'group'])]);
    }
}
