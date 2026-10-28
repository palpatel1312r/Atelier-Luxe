<?php

namespace Database\Seeders;

use App\Models\Offer;
use App\Models\OfferProduct;
use App\Models\Product;
use Illuminate\Database\Seeder;

class OfferSeeder extends Seeder
{
    public function run(): void
    {
        $offer = Offer::updateOrCreate(['slug' => 'monsoon-sale'], [
            'name' => 'Monsoon Wholesale Sale',
            'description' => '10% off on select apparel, valid this week only.',
            'offer_type' => 'percentage',
            'discount_percentage' => 10,
            'coupon_code' => 'MONSOON10',
            'start_date' => now()->subDays(2),
            'end_date' => now()->addDays(5),
            'is_active' => true,
        ]);

        $storageOffer = Offer::updateOrCreate(['slug' => 'storage-clearance'], [
            'name' => 'Storage Container Clearance',
            'description' => 'Flat ₹40 off per unit, limited stock.',
            'offer_type' => 'flat',
            'flat_discount' => 40,
            'start_date' => now()->subDay(),
            'end_date' => now()->addDays(10),
            'is_active' => true,
        ]);

        $shirt = Product::where('slug', 'cotton-formal-shirt')->first();
        $tshirt = Product::where('slug', 'round-neck-t-shirt')->first();
        $storage = Product::where('slug', 'storage-container-set')->first();

        if ($shirt) OfferProduct::updateOrCreate(['offer_id' => $offer->id, 'product_id' => $shirt->id], ['discount_percentage' => 10]);
        if ($tshirt) OfferProduct::updateOrCreate(['offer_id' => $offer->id, 'product_id' => $tshirt->id], ['discount_percentage' => 10]);
        if ($storage) OfferProduct::updateOrCreate(['offer_id' => $storageOffer->id, 'product_id' => $storage->id], ['offer_price' => 310]);
    }
}
