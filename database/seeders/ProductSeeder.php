<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\DealerSpecificPrice;
use App\Models\GroupPrice;
use App\Models\Group;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductImage;
use App\Models\ProductLabel;
use App\Models\ProductTag;
use App\Models\ProductVariant;
use App\Models\QuantitySlab;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The single most important seeder for actually testing the pricing engine —
 * every product gets a group price for all 5 groups, and the flagship
 * "Cotton Formal Shirt" recreates your spec's exact example numbers:
 *   Group A ₹420 / B ₹450 / C ₹480 / D ₹520, with Nilesh individually
 *   overridden to ₹410 on top of Group A.
 * A couple of products are deliberately seeded at 0 stock or below their
 * low_stock_threshold so the in_stock/low_stock/out_of_stock UI states,
 * the "Notify Me" button, and admin's Low Stock report all have real data
 * to show rather than an empty screen.
 */
class ProductSeeder extends Seeder
{
    private array $groupPriceCache = [];

    public function run(): void
    {
        $this->groupPriceCache = Group::pluck('id', 'slug')->toArray();

        $this->seedFlagshipShirt();
        $this->seedSimpleProduct('Round Neck T-Shirt', 'apparel-t-shirts', 'Urbanwear', 350, [
            'A' => 300,
            'B' => 315,
            'C' => 330,
            'D' => 350,
            'VIP' => 280,
        ], ['New'], ['Fast Moving'], lowStockVariant: true);

        $this->seedSimpleProduct('Track Pants', 'apparel-track-pants', 'Zenith', 600, [
            'A' => 520,
            'B' => 540,
            'C' => 560,
            'D' => 600,
            'VIP' => 490,
        ], ['Trending'], ['Recommended'], outOfStockVariant: true);

        $this->seedSimpleProduct('Formal Trousers', 'apparel-pants', 'Northline', 700, [
            'A' => 600,
            'B' => 630,
            'C' => 660,
            'D' => 700,
            'VIP' => 570,
        ], [], []);

        $this->seedSimpleProduct('Sports Shoes', 'footwear-sports-shoes', 'Zenith', 1200, [
            'A' => 1020,
            'B' => 1060,
            'C' => 1100,
            'D' => 1200,
            'VIP' => 950,
        ], ['Best Seller'], ['Heavy Demand', 'Fast Moving']);

        $this->seedSimpleProduct('Sandals', 'footwear-sandals', 'Kraft & Co', 450, [
            'A' => 390,
            'B' => 405,
            'C' => 420,
            'D' => 450,
            'VIP' => 360,
        ], [], []);

        $this->seedSimpleProduct('USB-C Fast Charging Cable', 'electronics-accessories-cables-chargers', 'Voltix', 199, [
            'A' => 160,
            'B' => 170,
            'C' => 180,
            'D' => 199,
            'VIP' => 140,
        ], ['Hot'], ['Fast Moving', 'Best Seller'], withSlabs: true);

        $this->seedSimpleProduct('Mobile Back Cover', 'electronics-accessories-mobile-accessories', 'Voltix', 149, [
            'A' => 110,
            'B' => 118,
            'C' => 126,
            'D' => 149,
            'VIP' => 95,
        ], [], ['Fast Moving']);

        $this->seedSimpleProduct('Non-stick Cookware Set', 'home-kitchen-cookware', 'Kraft & Co', 1800, [
            'A' => 1500,
            'B' => 1560,
            'C' => 1620,
            'D' => 1800,
            'VIP' => 1350,
        ], ['Premium'], []);

        $this->seedSimpleProduct('Storage Container Set', 'home-kitchen-storage', 'Kraft & Co', 350, [
            'A' => 290,
            'B' => 305,
            'C' => 320,
            'D' => 350,
            'VIP' => 260,
        ], ['Offer'], []);

        $this->seedSimpleProduct('Casual Check Shirt', 'apparel-shirts', 'Zenith', 550, [
            'A' => 470,
            'B' => 490,
            'C' => 510,
            'D' => 550,
            'VIP' => 430,
        ], ['New'], []);

        $this->seedSimpleProduct('Slim Fit Denim Jeans', 'apparel-pants', 'Urbanwear', 900, [
            'A' => 760,
            'B' => 790,
            'C' => 820,
            'D' => 900,
            'VIP' => 680,
        ], ['Trending', 'Limited Stock'], ['Fast Moving'], lowStockVariant: true);
    }

    /**
     * The flagship product: matches your spec example numbers exactly
     * (Group A ₹420, B ₹450, C ₹480, D ₹520; Nilesh override ₹410) and
     * carries the quantity-slab example numbers (450/430/410/390) on top
     * of the base variant so both pricing mechanisms are demonstrable on
     * one product — remember dealer override wins over slabs for Nilesh
     * specifically (see PricingEngineTest for the exact assertion).
     */
    private function seedFlagshipShirt(): void
    {
        $category = Category::where('slug', 'apparel-shirts')->first();
        $brand = Brand::where('slug', 'urbanwear')->first();

        $product = Product::updateOrCreate(['slug' => 'cotton-formal-shirt'], [
            'name' => 'Cotton Formal Shirt',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'description' => 'Premium cotton formal shirt, wrinkle-resistant fabric, available in multiple sizes.',
            'features' => 'Wrinkle Resistant, Machine Washable, Slim Fit',
            'min_order_qty' => 1,
            'low_stock_threshold' => 10,
            'is_active' => true,
            'is_featured' => true,
            'hsn_code' => '6205',
            'gst_rate' => 5,
        ]);

        ProductImage::updateOrCreate(
            ['product_id' => $product->id, 'display_order' => 0],
            ['image_path' => 'https://placehold.co/400x400?text=Cotton+Shirt', 'is_primary' => true]
        );

        ProductAttribute::updateOrCreate(['product_id' => $product->id, 'attribute_name' => 'Material'], ['attribute_value' => 'Cotton', 'attribute_type' => 'text']);
        ProductAttribute::updateOrCreate(['product_id' => $product->id, 'attribute_name' => 'Color'], ['attribute_value' => 'White', 'attribute_type' => 'color']);

        $sizes = ['S' => 40, 'M' => 60, 'L' => 55, 'XL' => 30];
        $variants = [];
        foreach ($sizes as $size => $stock) {
            $variants[] = ProductVariant::updateOrCreate(
                ['sku' => "SHIRT-CTN-{$size}"],
                [
                    'product_id' => $product->id,
                    'barcode' => '890' . random_int(1000000, 9999999),
                    'attributes' => ['size' => $size],
                    'stock_quantity' => $stock,
                    'mrp' => 500,
                    'cost_price' => 320,
                    'pack_size' => '1 pc',
                ]
            );
        }

        $mainVariant = $variants[0]; // Size S carries the group/slab/override pricing from your spec example

        foreach (['A' => 420, 'B' => 450, 'C' => 480, 'D' => 520, 'VIP' => 400] as $groupKey => $price) {
            $groupSlug = $groupKey === 'VIP' ? 'vip' : 'group-' . strtolower($groupKey);
            GroupPrice::updateOrCreate(
                ['product_id' => $product->id, 'variant_id' => $mainVariant->id, 'group_id' => $this->groupPriceCache[$groupSlug]],
                ['price' => $price]
            );
        }

        foreach ([[1, 9, 450], [10, 24, 430], [25, 49, 410], [50, null, 390]] as [$min, $max, $price]) {
            QuantitySlab::updateOrCreate(
                ['product_id' => $product->id, 'variant_id' => $mainVariant->id, 'min_qty' => $min],
                ['max_qty' => $max, 'price' => $price]
            );
        }

        $nilesh = User::where('phone', '9111100001')->first();
        if ($nilesh) {
            DealerSpecificPrice::updateOrCreate(
                ['product_id' => $product->id, 'variant_id' => $mainVariant->id, 'user_id' => $nilesh->id],
                ['override_price' => 410, 'reason_text' => 'Loyal bulk customer — special rate per admin discretion']
            );
        }

        ProductLabel::updateOrCreate(['product_id' => $product->id, 'label_name' => 'Best Seller'], []);
        ProductTag::updateOrCreate(['product_id' => $product->id, 'tag_name' => 'Best Seller'], []);
        ProductTag::updateOrCreate(['product_id' => $product->id, 'tag_name' => 'Fast Moving'], []);
    }

    private function seedSimpleProduct(
        string $name,
        string $categorySlug,
        string $brandName,
        float $mrp,
        array $groupPrices,
        array $labels,
        array $tags,
        bool $withSlabs = false,
        bool $lowStockVariant = false,
        bool $outOfStockVariant = false
    ): void {
        $category = Category::where('slug', $categorySlug)->first();
        $brand = Brand::where('slug', Str::slug($brandName))->first();
        $slug = Str::slug($name);

        $product = Product::updateOrCreate(['slug' => $slug], [
            'name' => $name,
            'category_id' => $category->id,
            'brand_id' => $brand?->id,
            'description' => "{$name} — quality product sourced for wholesale distribution.",
            'min_order_qty' => 1,
            'low_stock_threshold' => 10,
            'is_active' => true,
            'is_new_arrival' => in_array('New', $labels),
            'hsn_code' => '0000',
            'gst_rate' => 12,
        ]);

        ProductImage::updateOrCreate(
            ['product_id' => $product->id, 'display_order' => 0],
            ['image_path' => 'https://placehold.co/400x400?text=' . urlencode($name), 'is_primary' => true]
        );

        $stock = $outOfStockVariant ? 0 : ($lowStockVariant ? 6 : random_int(40, 120));

        // Deterministic SKU (derived from the product slug, not random) so
        // re-running the seeder updates the same variant instead of creating
        // a new one every time — matches the idempotent updateOrCreate pattern
        // used everywhere else in this seeder.
        $variant = ProductVariant::updateOrCreate(
            ['sku' => 'SKU-' . strtoupper(str_replace('-', '', $slug))],
            [
                'product_id' => $product->id,
                'stock_quantity' => $stock,
                'mrp' => $mrp,
                'cost_price' => round($mrp * 0.65, 2),
                'pack_size' => '1 pc',
            ]
        );

        foreach ($groupPrices as $slugKey => $price) {
            $groupSlug = $slugKey === 'VIP' ? 'vip' : 'group-' . strtolower($slugKey);
            if (!isset($this->groupPriceCache[$groupSlug])) continue;
            GroupPrice::updateOrCreate(
                ['product_id' => $product->id, 'variant_id' => $variant->id, 'group_id' => $this->groupPriceCache[$groupSlug]],
                ['price' => $price]
            );
        }

        if ($withSlabs) {
            $base = reset($groupPrices);
            foreach ([[1, 49, $base], [50, 199, round($base * 0.9)], [200, null, round($base * 0.8)]] as [$min, $max, $price]) {
                QuantitySlab::updateOrCreate(
                    ['product_id' => $product->id, 'variant_id' => $variant->id, 'min_qty' => $min],
                    ['max_qty' => $max, 'price' => $price]
                );
            }
        }

        foreach ($labels as $label) {
            ProductLabel::updateOrCreate(['product_id' => $product->id, 'label_name' => $label], []);
        }
        foreach ($tags as $tag) {
            ProductTag::updateOrCreate(['product_id' => $product->id, 'tag_name' => $tag], []);
        }
    }
}
