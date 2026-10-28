<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductReview;
use Illuminate\Http\Request;

class ReviewAdminController extends Controller
{
    // GET /api/admin/reviews?approved=0 — moderation queue
    public function index(Request $request)
    {
        $reviews = ProductReview::with(['user:id,name', 'product:id,name'])
            ->when($request->has('approved'), fn ($q) => $q->where('is_approved', $request->boolean('approved')))
            ->latest()
            ->paginate(20);

        return response()->json($reviews);
    }

    // PATCH /api/admin/reviews/{review}/approve
    public function approve(ProductReview $review)
    {
        $review->update(['is_approved' => true]);
        return response()->json(['message' => 'Review approved.', 'data' => $review]);
    }

    public function destroy(ProductReview $review)
    {
        $review->delete();
        return response()->json(['message' => 'Review deleted.']);
    }
}
