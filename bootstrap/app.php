<?php

use App\Http\Middleware\EnsureAccountActive;
use App\Http\Middleware\EnsureRole;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
  ->withRouting(
    web: __DIR__ . '/../routes/web.php',
    api: __DIR__ . '/../routes/api.php',
    commands: __DIR__ . '/../routes/console.php',
    health: '/up',
  )
  ->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
      'role' => EnsureRole::class,
      'account.active' => EnsureAccountActive::class,
    ]);

    $middleware->api(prepend: [
      \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    ]);

    // We define the rate limiters inside ->booting() below
    $middleware->throttleApi();
  })
  ->withExceptions(function (Exceptions $exceptions) {
    $exceptions->shouldRenderJsonWhen(function ($request, \Throwable $e) {
      return $request->is('api/*') || $request->expectsJson();
    });

    // 🔥 Force detailed JSON errors in local environment
    if (env('APP_ENV') === 'local') {
      $exceptions->render(function (\Throwable $e, $request) {
        if ($request->is('api/*') || $request->expectsJson()) {
          return response()->json([
            'error' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
          ], 500);
        }
      });
    }

    // 🔥 CRITICAL FIX: Stop Laravel from redirecting to a non-existent 'login' route
    $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
      if ($request->is('api/*') || $request->expectsJson()) {
        return response()->json(['message' => 'Unauthenticated. Please log in again.'], 401);
      }
    });
  })
  ->booting(function () {
    // 🟢 Development-friendly API limit (1000 per minute prevents 429 errors)
    RateLimiter::for('api', function (Request $request) {
      return Limit::perMinute(1000)->by($request->user()?->id ?: $request->ip());
    });

    // 🔵 Generous login limit (60 per minute so you don't get locked out while testing)
    RateLimiter::for('login', function (Request $request) {
      return Limit::perMinute(60)->by(
        strtolower($request->input('email') ?: $request->input('phone') ?: '') . '|' . $request->ip()
      );
    });
  })
  ->create();
