<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecentlyViewed;
use Illuminate\Http\Request;

class RecentlyViewedController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $items = RecentlyViewed::where('user_id', $user->id)
            ->with([
                'product.category',
                'product.brand',
                'product.images',
                'product.variants',
                'product.labels',
                'product.tags_relation',
            ])
            ->orderByDesc('viewed_at')
            ->limit(20)
            ->get();

        $productController = app(ProductController::class);

        $data = $items->map(function ($item) use ($user, $productController) {
            if (!$item->product) {
                return null;
            }

            return [
                'id'        => $item->id,
                'viewed_at' => $item->viewed_at,
                'product'   => $productController->transformProduct($item->product, $user),
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }
}
