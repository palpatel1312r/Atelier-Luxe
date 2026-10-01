<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        User::updateOrCreate(
            ['email' => 'admin@atelierluxe.com'],
            [
                'name'     => 'Admin',
                'password' => Hash::make('admin123'),
                'is_admin' => true,
            ]
        );

        // Demo customer
        User::updateOrCreate(
            ['email' => 'demo@ledgerly.test'],
            [
                'name'     => 'Demo Customer',
                'password' => Hash::make('password123'),
                'is_admin' => false,
            ]
        );
    }
}
