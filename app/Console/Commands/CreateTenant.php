<?php

namespace App\Console\Commands;

use App\Constants\Roles;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\Domain;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Provisions a brand-new tenant (a new wholesale company on your SaaS):
 *   1. Creates the tenants + domains rows in the CENTRAL DB
 *   2. stancl/tenancy auto-creates the physical MySQL database
 *   3. Runs every migration in database/migrations/tenant/ against it
 *   4. Seeds the default super_admin login for that company
 *
 * Usage:
 *   php artisan tenant:create "ABC Traders" abctraders admin@abctraders.com Passw0rd!
 */
class CreateTenant extends Command
{
    protected $signature = 'tenant:create
        {company_name : e.g. "ABC Traders"}
        {subdomain : e.g. "abctraders" -> becomes abctraders.yourapp.com}
        {admin_email : first Super Admin login email}
        {admin_password : first Super Admin login password}';

    protected $description = 'Provision a new tenant: central record + isolated DB + admin login';

    public function handle(): int
    {
        $companyName = $this->argument('company_name');
        $subdomain = Str::slug($this->argument('subdomain'));
        $tenantId = $subdomain;

        $tenant = Tenant::create([
            'id' => $tenantId,
            'company_name' => $companyName,
            'database_name' => 'tenant_' . str_replace('-', '_', $subdomain),
            'plan' => 'standard',
            'is_active' => true,
        ]);

        Domain::create([
            'domain' => $subdomain . '.' . config('app.central_domain', 'yourapp.com'),
            'tenant_id' => $tenant->id,
        ]);

        $this->info("Tenant record created: {$tenant->id}");
        $this->info('Running tenant migrations against the new database...');

        // stancl/tenancy: running inside tenant context auto-switches the DB connection
        $tenant->run(function () {
            $this->call('migrate', ['--path' => 'database/migrations/tenant', '--force' => true]);

            $adminRole = Role::where('name', Roles::SUPER_ADMIN)->first();
            \App\Models\User::create([
                'name' => 'Admin',
                'email' => $this->argument('admin_email'),
                'password' => Hash::make($this->argument('admin_password')),
                'phone' => '0000000000', // should be updated by the admin post-provisioning
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]);
        });

        $this->info("✅ Tenant '{$companyName}' is live at: https://{$subdomain}." . config('app.central_domain', 'yourapp.com'));
        $this->info("   Admin login: {$this->argument('admin_email')}");

        return self::SUCCESS;
    }
}
