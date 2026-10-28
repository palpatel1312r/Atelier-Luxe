<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            'Apparel' => ['Shirts', 'T-Shirts', 'Pants', 'Track Pants'],
            'Footwear' => ['Sports Shoes', 'Sandals'],
            'Electronics Accessories' => ['Mobile Accessories', 'Cables & Chargers'],
            'Home & Kitchen' => ['Cookware', 'Storage'],
        ];

        foreach ($tree as $parentName => $children) {
            $parent = Category::updateOrCreate(
                ['slug' => Str::slug($parentName)],
                ['name' => $parentName, 'is_active' => true]
            );

            foreach ($children as $childName) {
                Category::updateOrCreate(
                    ['slug' => Str::slug($parentName . '-' . $childName)],
                    ['name' => $childName, 'parent_id' => $parent->id, 'is_active' => true]
                );
            }
        }
    }
}
