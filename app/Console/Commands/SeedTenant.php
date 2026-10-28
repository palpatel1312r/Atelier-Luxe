<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Console\Command;

/**
 * Convenience wrapper so you don't have to manually enter tenant context
 * to seed test data — this is the fastest path from "just provisioned a
 * tenant" to "have data to click through every feature with".
 *
 * Usage: php artisan tenant:seed abctraders
 */
class SeedTenant extends Command
{
    protected $signature = 'tenant:seed {tenant_id : The tenant id, e.g. "abctraders"}';
    protected $description = 'Run DatabaseSeeder inside a specific tenant\'s database';

    public function handle(): int
    {
        $tenant = Tenant::find($this->argument('tenant_id'));

        if (!$tenant) {
            $this->error('No tenant found with that id. Run `php artisan tenant:create` first.');
            return self::FAILURE;
        }

        $tenant->run(function () {
            $this->call('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true]);
        });

        return self::SUCCESS;
    }
}
