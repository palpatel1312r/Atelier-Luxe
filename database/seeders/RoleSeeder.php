<?php

namespace Database\Seeders;

use App\Constants\Roles;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Idempotent on purpose (updateOrCreate, not create) — the tenant migration
 * for `roles` already inserts these 3 rows with fixed IDs so every other
 * seeder/controller can safely assume role_id 1/2/3 exist. Running this
 * seeder again (e.g. after a db:seed re-run) must not duplicate or error.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        Role::updateOrCreate(['id' => 1], ['name' => Roles::SAAS_ADMIN]);
        Role::updateOrCreate(['id' => 2], ['name' => Roles::SUPER_ADMIN]);
        Role::updateOrCreate(['id' => 3], ['name' => Roles::DEALER]);
    }
}
