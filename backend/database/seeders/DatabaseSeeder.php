<?php

namespace Database\Seeders;

use Database\Seeders\WishlistSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CategorySeeder::class,
            ProductSeeder::class,
            ContactSeeder::class,
            OrderSeeder::class,
            WishlistSeeder::class,
        ]);
    }
}
