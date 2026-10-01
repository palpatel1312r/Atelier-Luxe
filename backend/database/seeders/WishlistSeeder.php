<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Database\Seeder;

class WishlistSeeder extends Seeder
{
  public function run(): void
  {
    $customer = User::where('email', 'demo@ledgerly.test')->first();
    if (! $customer) return;

    $featured = Product::where('featured', true)->get();

    foreach ($featured as $product) {
      Wishlist::firstOrCreate([
        'user_id'    => $customer->id,
        'product_id' => $product->id,
      ]);
    }
  }
}
