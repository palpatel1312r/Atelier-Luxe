<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\ProductReview;
use Illuminate\Http\Request;

/**
 * Was in the DB schema (PRODUCT_REVIEWS table, and Product::show() already
 * reads approved reviews) but had no submission endpoint — this closes that gap.
 */
class ReviewController extends Controller
{
    // POST /api/products/{product}/reviews { rating, review_text? }
    // Only dealers who have actually ordered the product can review it —
    // prevents review-bombing from dealers who never bought the item.
    public function store(Request $request, int $productId)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'review_text' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        $hasPurchased = OrderItem::where('product_id', $productId)
            ->whereHas('order', fn ($q) => $q->where('user_id', $user->id))
            ->exists();

        if (!$hasPurchased) {
            return response()->json(['message' => 'You can only review products you have ordered.'], 422);
        }

        $review = ProductReview::updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $productId],
            ['rating' => $request->rating, 'review_text' => $request->review_text, 'is_approved' => false]
        );

        return response()->json(['message' => 'Review submitted, pending approval.', 'data' => $review]);
    }
}
