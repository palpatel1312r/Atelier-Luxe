<?php

use App\Console\Commands\ReleaseExpiredReservations;
use Illuminate\Support\Facades\Schedule;

// Laravel 11 style scheduling. If your app still uses app/Console/Kernel.php
// (Laravel 10 and earlier), move this into the schedule() method there instead.
Schedule::command('orders:release-expired')->everyFifteenMinutes();
