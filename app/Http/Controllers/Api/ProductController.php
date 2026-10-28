<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
// use App\Models\RecentlyViewed;
use App\Services\PricingEngine;
use Illuminate\Http\Request;
// use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function __construct(protected PricingEngine $pricingEngine) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = (int) $request->input('per_page', 20);
        $perPage = in_array($perPage, [10, 20, 50, 100]) ? $perPage : 20;

        $query = Product::query()
            ->with(['category', 'brand', 'images', 'variants', 'labels', 'tags_relation']);

        // Only filter active by default; admin can pass include_inactive=1
        if (!$request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        // if ($search = $request->input('q')) {
        //     $query->where(function ($q) use ($search) {
        //         $q->whereFullText(['name', 'description'], $search)
        //             ->orWhere('name', 'like', "%{$search}%")
        //             ->orWhereHas('variants', function ($vq) use ($search) {
        //                 $vq->where('sku', 'like', "%{$search}%")
        //                     ->orWhere('barcode', 'like', "%{$search}%");
        //             })
        //             ->orWhereHas('brand', fn($bq) => $bq->where('name', 'like', "%{$search}%"));
        //     });
        // }

        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                // ✅ Search exact product name OR close match
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('variants', function ($variantQuery) use ($search) {
                        $variantQuery->where('sku', 'like', "%{$search}%")
                            ->orWhere('barcode', 'like', "%{$search}%");
                    })
                    ->orWhereHas('category', fn($categoryQuery) => $categoryQuery->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('brand', fn($brandQuery) => $brandQuery->where('name', 'like', "%{$search}%"));
            });
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }
        if ($brandId = $request->input('brand_id')) {
            $query->where('brand_id', $brandId);
        }
        if ($gender = $request->input('gender')) {
            $query->whereHas('attributes', fn($q) => $q->where('attribute_name', 'gender')->where('attribute_value', $gender));
        }
        if ($color = $request->input('color')) {
            $query->whereHas('attributes', fn($q) => $q->where('attribute_name', 'color')->where('attribute_value', $color));
        }
        if ($size = $request->input('size')) {
            $query->whereHas('attributes', fn($q) => $q->where('attribute_name', 'size')->where('attribute_value', $size));
        }
        if ($type = $request->input('type')) {
            $query->whereHas('attributes', fn($q) => $q->where('attribute_name', 'type')->where('attribute_value', $type));
        }
        if ($request->boolean('new_arrivals')) {
            $query->where('is_new_arrival', true);
        }
        if ($tag = $request->input('tag')) {
            $query->whereHas('tags_relation', fn($q) => $q->where('tag_name', $tag));
        }
        if ($label = $request->input('label')) {
            $query->whereHas('labels', fn($q) => $q->where('label_name', $label));
        }
        if ($request->filled('under_price')) {
            $query->whereHas('variants', fn($q) => $q->where('mrp', '<=', $request->input('under_price')));
        }
        if ($request->filled('price_min') || $request->filled('price_max')) {
            $min = $request->input('price_min', 0);
            $max = $request->input('price_max', PHP_INT_MAX);
            $query->whereHas('variants', fn($q) => $q->whereBetween('mrp', [$min, $max]));
        }
        if ($request->has('in_stock')) {
            $inStock = $request->boolean('in_stock');
            $query->whereHas('variants', function ($q) use ($inStock) {
                $inStock
                    ? $q->whereColumn('stock_quantity', '>', 'reserved_quantity')
                    : $q->whereColumn('stock_quantity', '<=', 'reserved_quantity');
            });
        }

        switch ($request->input('sort')) {
            case 'newest':
                $query->orderByDesc('created_at');
                break;
            case 'name_asc':
                $query->orderBy('name');
                break;
            case 'name_desc':
                $query->orderByDesc('name');
                break;
            case 'best_selling':
                $query->withCount(['reviews'])->orderByDesc('reviews_count');
                break;
            case 'price_low':
            case 'price_high':
                break;
            default:
                $query->orderByDesc('is_featured')->orderByDesc('created_at');
        }

        $products = $query->paginate($perPage);

        $data = $products->getCollection()->map(function (Product $product) use ($user) {
            return $this->transformProduct($product, $user);
        });

        if (in_array($request->input('sort'), ['price_low', 'price_high'])) {
            $data = $request->input('sort') === 'price_low'
                ? $data->sortBy('your_price')->values()
                : $data->sortByDesc('your_price')->values();
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page'    => $products->lastPage(),
                'per_page'     => $products->perPage(),
                'total'        => $products->total(),
            ],
        ]);
    }

    public function show(Request $request, Product $product)
    {
        $user = $request->user();

        $product->load([
            'category',
            'brand',
            'images',
            'variants.images',
            'variants',
            'groupPrices',
            'attributes',
            'labels',
            'tags_relation',
            'dealerPrices',
            'quantitySlabs',
            'reviews' => fn($q) => $q->where('is_approved', true),
        ]);

        if ($user && $user->isDealer()) {
            DB::table('recently_viewed')->updateOrInsert(
                ['user_id' => $user->id, 'product_id' => $product->id],
                ['viewed_at' => now(), 'updated_at' => now()]
            );
        }

        return response()->json([
            'data' => $this->transformProduct($product, $user, true),
        ]);
    }
    public function livePrice(Request $request, Product $product)
    {
        $request->validate([
            'quantity'   => 'required|integer|min:1',
            'variant_id' => 'nullable|integer',
        ]);

        $user    = $request->user();
        $variant = $request->variant_id
            ? $product->variants()->find($request->variant_id)
            : null;

        $resolved = $this->pricingEngine->resolve(
            $user,
            $product,
            $variant,
            (int) $request->quantity
        );

        // ✅ FALLBACK: Use MRP if no pricing found
        if ($resolved['price'] === null && $variant) {
            $resolved = [
                'price' => $variant->mrp,
                'source' => 'mrp'
            ];
        }

        return response()->json([
            'price'  => $resolved['price'],
            'source' => $resolved['source'],
            'total'  => $resolved['price']
                ? $resolved['price'] * $request->quantity
                : null,
        ]);
    }

    public function transformProduct(Product $product, $user, bool $detailed = false): array
    {
        $defaultVariant = $product->variants->first();

        $priceInfo = $defaultVariant
            ? $this->pricingEngine->resolve(
                $user,
                $product,
                $defaultVariant,
                $product->min_order_qty ?: 1
            )
            : ['price' => null, 'source' => null];

        // ✅ FALLBACK: If no pricing found (new user without group), use MRP
        if ($priceInfo['price'] === null && $defaultVariant) {
            $priceInfo = [
                'price' => $defaultVariant->mrp,
                'source' => 'mrp'
            ];
        }

        $availableStock = $product->totalAvailableStock();

        $base = [
            'id'                  => $product->id,
            'sku'                 => $defaultVariant?->sku,
            'name'                => $product->name,
            'slug'                => $product->slug,
            'category'            => $product->category?->name,
            'category_id'         => $product->category_id,
            'brand'               => $product->brand?->name,
            'brand_id'            => $product->brand_id,
            'is_active'           => $product->is_active,
            'low_stock_threshold' => $product->low_stock_threshold,

            'images' => $product->images
                ->sortBy([
                    ['is_primary', 'desc'],
                    ['display_order', 'asc'],
                    ['id', 'asc'],
                ])
                ->map(fn($img) => $this->transformImage($img))
                ->values(),

            'labels'         => $product->labels->pluck('label_name'),
            'tags'           => $product->tags_relation->pluck('tag_name'),
            'mrp'            => $defaultVariant?->mrp,
            'your_price'     => $priceInfo['price'],
            'price_source'   => $priceInfo['source'],
            'moq'            => $product->min_order_qty,
            'pack_size'      => $defaultVariant?->pack_size,
            'stock_status'   => $product->stockStatus(),
            'available_stock' => $availableStock,
        ];

        if ($detailed) {
            $base['description'] = $product->description;
            $base['features']    = $product->features;

            $base['attributes'] = $product->attributes
                ->groupBy('attribute_name')
                ->map(fn($g) => $g->pluck('attribute_value'));

            $base['variants'] = $product->variants->map(function ($v) use ($user, $product) {
                $p = $this->pricingEngine->resolve(
                    $user,
                    $product,
                    $v,
                    $product->min_order_qty ?: 1
                );

                // ✅ FALLBACK: Use MRP if no pricing found for this variant
                if ($p['price'] === null) {
                    $p = [
                        'price' => $v->mrp,
                        'source' => 'mrp'
                    ];
                }

                $variantImages = $v->images
                    ->sortBy([
                        ['is_primary', 'desc'],
                        ['display_order', 'asc'],
                        ['id', 'asc'],
                    ])
                    ->map(fn($img) => $this->transformImage($img))
                    ->values();

                return [
                    'id'              => $v->id,
                    'sku'             => $v->sku,
                    'barcode'         => $v->barcode,
                    'attributes'      => $v->attributes,
                    'mrp'             => $v->mrp,
                    'your_price'      => $p['price'],
                    'available_stock' => $v->availableStock(),
                    'pack_size'       => $v->pack_size,
                    'image_url'       => $variantImages->first()['image_path'] ?? null,
                    'images'          => $variantImages,
                ];
            });

            // ✅ Return ALL group prices (both with variant_id and null)
            $base['group_prices'] = $product->groupPrices()
                ->get(['group_id', 'variant_id', 'price'])
                ->map(fn($gp) => [
                    'group_id'   => $gp->group_id,
                    'variant_id' => $gp->variant_id,
                    'price'      => $gp->price,
                ]);

            // ✅ Return dealer-specific prices
            $base['dealer_prices'] = $product->dealerPrices()
                ->get(['user_id', 'variant_id', 'override_price', 'reason_text'])
                ->map(fn($dp) => [
                    'user_id'        => $dp->user_id,
                    'variant_id'     => $dp->variant_id,
                    'override_price' => $dp->override_price,
                    'reason_text'    => $dp->reason_text,
                ]);

            // ✅ Return ALL quantity slabs (both with variant_id and null)
            $base['quantity_slabs'] = $product->quantitySlabs()
                ->orderBy('min_qty')
                ->get(['min_qty', 'max_qty', 'price', 'variant_id']);

            $base['expected_restock_date'] = $product->expected_restock_date;

            $base['reviews'] = $product->reviews->map(fn($r) => [
                'rating' => $r->rating,
                'text'   => $r->review_text,
                'user'   => $r->user->name ?? null,
            ]);
        }

        return $base;
    }

    private function transformImage($image): array
    {
        $path = $image->image_path;
        $url = null;

        if ($path) {
            if (str_starts_with($path, 'http')) {
                $url = $path;
            } else {
                $clean = preg_replace('#^storage/#', '', ltrim($path, '/'));
                $url = asset('storage/' . $clean);
            }
        }

        return [
            'id'            => $image->id,
            'image_path'    => $url,
            'is_primary'    => (bool) $image->is_primary,
            'variant_id'    => $image->variant_id,
            'display_order' => $image->display_order,
        ];
    }
}
