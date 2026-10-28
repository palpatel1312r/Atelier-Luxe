<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $items = Wishlist::with([
            'product.images',
            'product.variants',
            'variant.images',
        ])
            ->where('user_id', $user->id)
            ->whereHas('product')
            ->latest()
            ->get()
            ->map(function ($w) {
                $imageUrl = null;
                $imgPath = $w->variant?->images?->first()?->image_path
                    ?? $w->product?->images?->first()?->image_path;

                if ($imgPath) {
                    if (str_starts_with($imgPath, 'http')) {
                        $imageUrl = $imgPath;
                    } else {
                        $clean = preg_replace('#^storage/#', '', ltrim($imgPath, '/'));
                        $imageUrl = asset('storage/' . $clean);
                    }
                }

                return [
                    'id'         => $w->id,
                    'product_id' => $w->product_id,
                    'variant_id' => $w->variant_id,
                    // ✅ Nested product object — matches frontend expectations
                    'product'    => $w->product ? [
                        'id'         => $w->product->id,
                        'name'       => $w->product->name,
                        'slug'       => $w->product->slug,
                        'mrp'        => $w->product->mrp ?? null,
                        'image_url'  => $imageUrl,
                        'images'     => $w->product->images->map(fn($img) => [
                            'id'         => $img->id,
                            'image_path' => asset('storage/' . preg_replace('#^storage/#', '', ltrim($img->image_path, '/'))),
                        ])->values(),
                        'variants'   => $w->product->variants->map(fn($v) => [
                            'id'         => $v->id,
                            'sku'        => $v->sku,
                            'attributes' => $v->attributes,
                            'mrp'        => $v->mrp,
                            'available_stock' => $v->availableStock() ?? 0,
                        ])->values(),
                    ] : null,
                    'variant'    => $w->variant ? [
                        'id'         => $w->variant->id,
                        'sku'        => $w->variant->sku,
                        'attributes' => $w->variant->attributes,
                    ] : null,
                ];
            });

        return response()->json(['data' => $items]);
    }
    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
        ]);

        $user = $request->user();

        // Prevent duplicates
        $existing = Wishlist::where('user_id', $user->id)
            ->where('product_id', $data['product_id'])
            ->where('variant_id', $data['variant_id'] ?? null)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already in wishlist.', 'data' => $existing]);
        }

        $wishlist = Wishlist::create([
            'user_id'    => $user->id,
            'product_id' => $data['product_id'],
            'variant_id' => $data['variant_id'] ?? null,
        ]);

        return response()->json(['message' => 'Added to wishlist.', 'data' => $wishlist], 201);
    }

    public function destroy(Request $request, Product $product)
    {
        $user = $request->user();
        $variantId = $request->query('variant_id');

        $query = Wishlist::where('user_id', $user->id)
            ->where('product_id', $product->id);

        // Treat null / empty / "null" string all as "no variant"
        if ($variantId === null || $variantId === '' || $variantId === 'null') {
            $query->whereNull('variant_id');
        } else {
            $query->where('variant_id', $variantId);
        }

        $deleted = $query->delete();

        if ($deleted === 0) {
            return response()->json(['message' => 'Not in wishlist.'], 404);
        }

        return response()->json(['message' => 'Removed from wishlist.']);
    }
    public function check(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
        ]);

        $user = $request->user();

        $exists = Wishlist::where('user_id', $user->id)
            ->where('product_id', $data['product_id'])
            ->when(
                !empty($data['variant_id']),
                fn($q) => $q->where('variant_id', $data['variant_id']),
                fn($q) => $q->whereNull('variant_id'),
            )
            ->exists();

        return response()->json(['data' => ['in_wishlist' => $exists]]);
    }
}
