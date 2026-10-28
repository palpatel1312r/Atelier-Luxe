<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| This backend is API-only — the React app (frontend/) talks to it purely
| through routes/api.php. This file exists only because bootstrap/app.php's
| withRouting() expects it; a single health-check-style root route is all
| it needs to do. bootstrap/app.php also registers '/up' automatically as
| a dedicated health-check endpoint (Laravel 11 default).
*/

Route::get('/', function () {
    return response()->json(['status' => 'ok', 'service' => 'B2B Wholesale API']);
});
