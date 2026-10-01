<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'name'        => 'Classic White Tee',
                'description' => 'Crafted from long-staple Egyptian cotton, this tee drapes beautifully and holds its shape wash after wash.',
                'details'     => [
                    '100% Egyptian cotton',
                    'Pre-shrunk and garment-dyed',
                    'Made in Portugal',
                ],
                'price'       => 49.00,
                'category'    => 'tshirts',
                'color'       => 'White',
                'sizes'       => ['S', 'M', 'L', 'XL'],
                'stock'       => 25,
                'featured'    => true,
                'image'       => 'https://i.pinimg.com/736x/01/d6/17/01d61719d4fc1decd6902c72dc83bee9.jpg',
            ],
            [
                'name'        => 'Essential Black Tee',
                'description' => 'The perfect black tee — deep, matte, and endlessly versatile. Cut for a relaxed but considered fit.',
                'details'     => [
                    '100% organic cotton',
                    'Relaxed but considered fit',
                    'Made in Portugal',
                ],
                'price'       => 49.00,
                'category'    => 'tshirts',
                'color'       => 'Black',
                'sizes'       => ['S', 'M', 'L', 'XL'],
                'stock'       => 30,
                'featured'    => true,
                'image'       => 'https://i.pinimg.com/1200x/51/4a/5c/514a5cbf686ae9d2b76addd595707f99.jpg',
            ],
            [
                'name'        => 'Heritage Stripe Tee',
                'description' => 'A modern take on a classic Breton stripe. Midweight cotton with a soft hand-feel.',
                'details'     => [
                    '100% cotton',
                    'Yarn-dyed stripes',
                    'Made in Portugal',
                ],
                'price'       => 59.00,
                'category'    => 'tshirts',
                'color'       => 'Navy / White',
                'sizes'       => ['S', 'M', 'L', 'XL'],
                'stock'       => 18,
                'featured'    => false,
                'image'       => 'https://i.pinimg.com/1200x/27/04/64/270464e0f0755532b2e8d1cffad91a4c.jpg',
            ],
            [
                'name'        => 'Everyday Crew Tee',
                'description' => 'Your new daily uniform. Pre-shrunk, garment-dyed, and built to last.',
                'details'     => [
                    '100% cotton',
                    'Garment-dyed',
                    'Made in Portugal',
                ],
                'price'       => 45.00,
                'category'    => 'tshirts',
                'color'       => 'Stone',
                'sizes'       => ['S', 'M', 'L', 'XL'],
                'stock'       => 40,
                'featured'    => false,
                'image'       => 'https://i.pinimg.com/736x/39/37/b7/3937b7a8cca92b69cc81e46ac1e6af5b.jpg',
            ],
        ];
        foreach ($products as $p) {
            $category = \App\Models\Category::where('slug', $p['category'])->first();
            $p['category_id'] = $category?->id;

            Product::updateOrCreate(['name' => $p['name']], $p);
        }
    }
}
