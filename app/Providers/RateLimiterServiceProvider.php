<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;

class RateLimiterServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // ✅ Disable rate limiting in local/development
        if (app()->environment('local', 'staging')) {
            RateLimiter::for('login', fn() => Limit::none());
            RateLimiter::for('otp', fn() => Limit::none());
            return;
        }

        // Production limits
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('otp', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip() . $request->phone);
        });
    }
}
