<?php

namespace Database\Seeders;

use App\Models\Group;
use Illuminate\Database\Seeder;

class GroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'Group A', 'slug' => 'group-a', 'description' => 'Standard retail dealers', 'discount_percentage' => 0],
            ['name' => 'Group B', 'slug' => 'group-b', 'description' => 'Mid-volume dealers', 'discount_percentage' => 5],
            ['name' => 'Group C', 'slug' => 'group-c', 'description' => 'Regional distributors', 'discount_percentage' => 8],
            ['name' => 'Group D', 'slug' => 'group-d', 'description' => 'New/unverified dealers — highest price tier', 'discount_percentage' => 0],
            ['name' => 'VIP', 'slug' => 'vip', 'description' => 'Top-volume loyalty dealers', 'discount_percentage' => 15],
        ];

        foreach ($groups as $group) {
            Group::updateOrCreate(['slug' => $group['slug']], $group);
        }
    }
}
