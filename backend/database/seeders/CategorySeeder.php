<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'T-Shirts',  'slug' => 'tshirts',  'sort_order' => 1, 'active' => true],
            ['name' => 'Shirts',    'slug' => 'shirts',   'sort_order' => 2, 'active' => true],
            ['name' => 'Trousers',  'slug' => 'trousers', 'sort_order' => 3, 'active' => true],
            ['name' => 'Outerwear', 'slug' => 'outerwear', 'sort_order' => 4, 'active' => true],
            ['name' => 'Knitwear',  'slug' => 'knitwear', 'sort_order' => 5, 'active' => true],
            ['name' => 'Accessories', 'slug' => 'accessories', 'sort_order' => 6, 'active' => true],
        ];

        foreach ($categories as $c) {
            Category::updateOrCreate(['slug' => $c['slug']], $c);
        }
    }
}
