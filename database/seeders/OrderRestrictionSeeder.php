<?php

namespace Database\Seeders;

use App\Models\OrderRestriction;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Gives two dealers real restriction rows so OrderRestrictionTest-style
 * scenarios can also be poked at manually through the UI: try placing a
 * ₹100 order as Suresh (below his ₹2,000 minimum) or a 500-unit order as
 * Mahesh (above his 100-unit per-product cap) and watch the 422 come back.
 */
class OrderRestrictionSeeder extends Seeder
{
    public function run(): void
    {
        $suresh = User::where('phone', '9111100005')->first(); // Group D, new dealer -> tight limits
        $mahesh = User::where('phone', '9111100002')->first();

        if ($suresh) {
            OrderRestriction::updateOrCreate(['user_id' => $suresh->id], [
                'min_order_value' => 2000,
                'max_order_value' => 20000,
                'max_quantity_per_product' => 50,
                'credit_block' => true,
            ]);
        }

        if ($mahesh) {
            OrderRestriction::updateOrCreate(['user_id' => $mahesh->id], [
                'max_quantity_per_product' => 100,
                'restricted_states' => ['Kerala'], // arbitrary example state restriction
            ]);
        }
    }
}
