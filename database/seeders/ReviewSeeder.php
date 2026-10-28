<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $nilesh = User::where('phone', '9111100001')->first();
        $mahesh = User::where('phone', '9111100002')->first();
        $shirt = Product::where('slug', 'cotton-formal-shirt')->first();

        if ($nilesh && $shirt) {
            ProductReview::updateOrCreate(
                ['user_id' => $nilesh->id, 'product_id' => $shirt->id],
                ['rating' => 5, 'review_text' => 'Consistent quality, my regular order every month.', 'is_approved' => true]
            );
        }
        if ($mahesh && $shirt) {
            // Left pending on purpose — gives the admin moderation queue (ReviewAdminController) something to approve.
            ProductReview::updateOrCreate(
                ['user_id' => $mahesh->id, 'product_id' => $shirt->id],
                ['rating' => 4, 'review_text' => 'Good fabric, sizing runs slightly large.', 'is_approved' => false]
            );
        }
    }
}
