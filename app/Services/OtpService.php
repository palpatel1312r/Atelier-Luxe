<?php

namespace App\Services;

use App\Models\OtpVerification;
use App\Models\User;
use App\Notifications\OtpNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Handles OTP generation/verification per your spec:
 * - 5 minute expiry
 * - Resend allowed only after 60 seconds
 * - Max 5 attempts, then 30 minute block
 */
class OtpService
{
    const EXPIRY_MINUTES = 5;
    const RESEND_COOLDOWN_SECONDS = 60;
    const MAX_ATTEMPTS = 5;
    const BLOCK_MINUTES = 30;

    public function generate(string $phone, ?int $userId = null): OtpVerification
    {
        $recent = OtpVerification::where('phone', $phone)
            ->latest('id')
            ->first();

        if ($recent && $recent->created_at->diffInSeconds(now()) < self::RESEND_COOLDOWN_SECONDS) {
            $wait = self::RESEND_COOLDOWN_SECONDS - $recent->created_at->diffInSeconds(now());
            throw new \RuntimeException("Please wait {$wait}s before requesting another OTP.");
        }

        if ($recent && $recent->attempts_count >= self::MAX_ATTEMPTS
            && $recent->created_at->diffInMinutes(now()) < self::BLOCK_MINUTES) {
            throw new \RuntimeException('Too many attempts. Try again after 30 minutes.');
        }

        $code = (string) random_int(100000, 999999);

        $otp = OtpVerification::create([
            'user_id' => $userId,
            'phone' => $phone,
            'otp_code' => $code,
            'expires_at' => Carbon::now()->addMinutes(self::EXPIRY_MINUTES),
            'attempts_count' => 0,
        ]);

        if ($userId && ($user = User::find($userId))) {
            $user->notify(new OtpNotification($code));
        }

        return $otp;
    }

    public function verify(string $phone, string $code): bool
    {
        return DB::transaction(function () use ($phone, $code) {
            $otp = OtpVerification::where('phone', $phone)
                ->where('is_verified', false)
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (!$otp) {
                throw new \RuntimeException('No OTP request found. Please request a new OTP.');
            }

            if ($otp->attempts_count >= self::MAX_ATTEMPTS) {
                throw new \RuntimeException('Too many attempts. Try again after 30 minutes.');
            }

            if (Carbon::now()->greaterThan($otp->expires_at)) {
                throw new \RuntimeException('OTP expired. Please request a new one.');
            }

            if ($otp->otp_code !== $code) {
                $otp->increment('attempts_count');
                throw new \RuntimeException('Invalid OTP.');
            }

            $otp->update(['is_verified' => true]);
            return true;
        });
    }
}
