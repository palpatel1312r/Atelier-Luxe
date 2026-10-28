<?php

namespace App\Http\Controllers\Api\Admin;

use App\Constants\Roles;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductImage;
use App\Models\ProductLabel;
use App\Models\ProductTag;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductAdminController extends Controller
{
    public function show(Product $product)
    {
        $product->load([
            'category',
            'brand',
            'images',
            'variants',
            'attributes',
            'labels',
            'groupPrices',
            'dealerPrices.user:id,name,phone',
        ]);

        // Format attributes
        $attrs = [];
        foreach ($product->attributes as $attr) {
            $attrs[$attr->attribute_name][] = $attr->attribute_value;
        }

        return response()->json([
            'data' => [
                'id'                  => $product->id,
                'name'                => $product->name,
                'slug'                => $product->slug,
                'category_id'         => $product->category_id,
                'brand_id'            => $product->brand_id,
                'description'         => $product->description,
                'is_active'           => $product->is_active,
                'is_new_arrival'      => $product->is_new_arrival,
                'moq'                 => $product->min_order_qty,
                'min_order_qty'       => $product->min_order_qty,
                'low_stock_threshold' => $product->low_stock_threshold,

                'images' => $product->images->map(function ($img) {
                    $path = $img->image_path;
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
                        'id'         => $img->id,
                        'image_path' => $url,
                        'is_primary' => $img->is_primary,
                        'variant_id' => $img->variant_id,
                    ];
                })->values(),

                'variants'            => $product->variants,
                'labels'              => $product->labels->pluck('label_name'),
                'attributes'          => $attrs,

                'group_prices' => $product->groupPrices()
                    ->get()
                    ->map(fn($gp) => [
                        'group_id'   => $gp->group_id,
                        'variant_id' => $gp->variant_id,
                        'price'      => (float) $gp->price,
                    ])->values(),

                'dealer_prices' => $product->dealerPrices()
                    ->with('user:id,name,phone')
                    ->get()
                    ->map(fn($dp) => [
                        'id'             => $dp->id,
                        'user_id'        => $dp->user_id,
                        'variant_id'     => $dp->variant_id,
                        'override_price' => (float) $dp->override_price,
                        'reason_text'    => $dp->reason_text,
                        'dealer_name'    => $dp->user?->name,
                        'dealer_phone'   => $dp->user?->phone,
                    ])->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'description' => 'nullable|string',
            'features' => 'nullable|string',
            'min_order_qty' => 'nullable|integer|min:1',
            'max_order_qty' => 'nullable|integer|min:1',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'hsn_code' => 'nullable|string',
            'gst_rate' => 'nullable|numeric|min:0|max:100',
            'attributes' => 'nullable|array',
            'variants' => 'required|array|min:1',
            'variants.*.sku' => 'required|string',
            'variants.*.mrp' => 'required|numeric|min:0',
            'variants.*.stock_quantity' => 'nullable|integer|min:0',
            'variants.*.barcode' => 'nullable|string',
            'variants.*.pack_size' => 'nullable|string',
            'labels' => 'nullable|array',
            'tags' => 'nullable|array',
            'is_new_arrival' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'notification_mode' => 'nullable|in:all,selected',
            'notification_dealer_ids' => 'exclude_unless:notification_mode,selected|required|array|min:1',
            'notification_dealer_ids.*' => 'integer|distinct|exists:users,id',
        ]);

        $notificationDealers = null;
        if (($data['notification_mode'] ?? 'all') === 'selected') {
            $selectedIds = collect($data['notification_dealer_ids'])->unique()->values();
            $notificationDealers = User::whereHas('role', fn($q) => $q->where('name', Roles::DEALER))
                ->where('is_active', true)
                ->whereIn('id', $selectedIds)
                ->get();

            if ($notificationDealers->count() !== $selectedIds->count()) {
                throw ValidationException::withMessages([
                    'notification_dealer_ids' => 'One or more selected dealers are no longer active or are not eligible.',
                ]);
            }
        }

        $product = Product::create([
            ...collect($data)->except([
                'attributes',
                'variants',
                'labels',
                'tags',
                'notification_mode',
                'notification_dealer_ids',
            ])->toArray(),
            'slug' => Str::slug($data['name']) . '-' . Str::random(5),
            'is_new_arrival' => $data['is_new_arrival'] ?? true,
            'is_featured' => $data['is_featured'] ?? false,
            'is_active' => true,
        ]);

        foreach ($data['attributes'] ?? [] as $i => $attr) {
            ProductAttribute::create([
                'product_id' => $product->id,
                'attribute_name' => $attr['name'],
                'attribute_value' => $attr['value'],
                'attribute_type' => $attr['type'] ?? 'text',
                'display_order' => $i,
            ]);
        }

        $createdVariants = [];
        foreach ($data['variants'] as $v) {
            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => $v['sku'],
                'barcode' => $v['barcode'] ?? null,
                'attributes' => $v['attributes'] ?? null,
                'stock_quantity' => $v['stock_quantity'] ?? 0,
                'mrp' => $v['mrp'],
                'cost_price' => $v['cost_price'] ?? null,
                'pack_size' => $v['pack_size'] ?? null,
            ]);
            $createdVariants[] = $variant;
        }

        foreach ($createdVariants as $variant) {
            $matchingImages = $product->images()
                ->where('image_path', 'LIKE', '%' . $variant->sku . '%')
                ->get();
            foreach ($matchingImages as $image) {
                $image->update(['variant_id' => $variant->id]);
            }
        }

        foreach ($data['labels'] ?? [] as $label) {
            ProductLabel::create(['product_id' => $product->id, 'label_name' => $label]);
        }
        foreach ($data['tags'] ?? [] as $tag) {
            ProductTag::create(['product_id' => $product->id, 'tag_name' => $tag]);
        }

        ActivityLogger::log($request->user()->id, Product::class, $product->id, 'created', [], $product->toArray());

        Log::info('STARTING NEW PRODUCT NOTIFICATIONS', [
            'product_id' => $product->id,
            'product_name' => $product->name,
        ]);

        try {
            // ✅ Move Schema check OUTSIDE the loop
            $hasProductIdColumn = Schema::hasColumn('notifications', 'product_id');

            $dealers = $notificationDealers ?? User::whereHas('role', fn($q) => $q->where('name', Roles::DEALER))
                ->where('is_active', true)
                ->get();

            Log::info('Found dealers to notify', ['count' => $dealers->count()]);

            foreach ($dealers as $dealer) {
                $notificationData = [
                    'user_id' => $dealer->id,
                    'title'   => 'New Product: ' . $product->name,
                    'message' => $product->name . ' is now available.',
                    'type'    => 'new_product',
                    'data'    => [
                        'product_id'   => $product->id,
                        'product_name' => $product->name,
                    ],
                    'is_read' => false,
                ];

                if ($hasProductIdColumn) {
                    $notificationData['product_id'] = $product->id;
                }

                $notification = Notification::create($notificationData);
                event(new \App\Events\NewNotification($notification, $dealer->id));
            }

            Log::info('New product notifications sent', [
                'product_id' => $product->id,
                'sent'       => $dealers->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('NEW PRODUCT NOTIFICATION FAILED', [
                'product_id' => $product->id,
                'error'      => $e->getMessage(),
                'trace'      => $e->getTraceAsString(),
            ]);
        }

        // ✅ Clear dashboard cache ONCE using helper
        DashboardController::clearCache();

        return response()->json([
            'message' => 'Product created.',
            'data' => $product->load(['variants', 'attributes', 'labels']),
        ], 201);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name'            => 'sometimes|string',
            'category_id'     => 'sometimes|exists:categories,id',
            'brand_id'        => 'nullable|exists:brands,id',
            'description'     => 'nullable|string',
            'is_active'       => 'sometimes|boolean',
            'is_new_arrival'  => 'sometimes|boolean',
            'labels'          => 'nullable|array',
            'labels.*'        => 'string',
            'attributes'      => 'nullable|array',
            'attributes.*.name'  => 'required_with:attributes|string',
            'attributes.*.value' => 'nullable|string',
            'min_order_qty' => 'sometimes|integer|min:1',
            'low_stock_threshold' => 'sometimes|integer|min:0',
            'variants'        => 'nullable|array',
            'variants.*.sku'  => 'required_with:variants|string',
            'variants.*.mrp'  => 'required_with:variants|numeric|min:0',
            'variants.*.stock_quantity' => 'nullable|integer|min:0',
            'variants.*.barcode' => 'nullable|string',
            'variants.*.pack_size' => 'nullable|string',
            'group_prices'    => 'nullable|array',
            'group_prices.*.group_id' => 'required|integer|exists:groups,id',
            'group_prices.*.price'    => 'required|numeric|min:0',
            'group_prices.*.variant_id' => 'nullable|integer|exists:product_variants,id',
        ]);

        $product->update(collect($data)->except(['labels', 'attributes', 'variants', 'group_prices'])->toArray());

        if ($request->has('group_prices')) {
            $incoming = collect($request->input('group_prices', []));

            if ($incoming->isNotEmpty()) {
                \App\Models\GroupPrice::where('product_id', $product->id)->delete();

                foreach ($incoming as $gp) {
                    if (isset($gp['price']) && $gp['price'] !== '' && !empty($gp['group_id'])) {
                        \App\Models\GroupPrice::create([
                            'product_id' => $product->id,
                            'variant_id' => $gp['variant_id'] ?? null,
                            'group_id'   => $gp['group_id'],
                            'price'      => $gp['price'],
                        ]);
                    }
                }
            }
        }

        if ($request->has('labels')) {
            $product->labels()->delete();
            foreach ($request->input('labels', []) as $labelName) {
                if ($labelName) {
                    $product->labels()->create(['label_name' => $labelName]);
                }
            }
        }

        if ($request->has('attributes')) {
            $product->attributes()->delete();
            foreach ($request->input('attributes', []) as $i => $attr) {
                if (!empty($attr['name'])) {
                    ProductAttribute::create([
                        'product_id' => $product->id,
                        'attribute_name' => $attr['name'],
                        'attribute_value' => $attr['value'] ?? '',
                        'display_order' => $i,
                    ]);
                }
            }
        }

        if ($request->has('variants')) {
            $incomingIds = collect($request->input('variants'))->pluck('id')->filter();
            $product->variants()->whereNotIn('id', $incomingIds)->delete();

            foreach ($request->input('variants', []) as $vData) {
                if (isset($vData['id'])) {
                    $variant = $product->variants()->find($vData['id']);
                    if ($variant) {
                        $variant->update([
                            'sku' => $vData['sku'],
                            'mrp' => $vData['mrp'],
                            'stock_quantity' => $vData['stock_quantity'] ?? 0,
                            'barcode' => $vData['barcode'] ?? null,
                            'pack_size' => $vData['pack_size'] ?? null,
                        ]);
                    }
                } else {
                    $product->variants()->create([
                        'sku' => $vData['sku'],
                        'mrp' => $vData['mrp'],
                        'stock_quantity' => $vData['stock_quantity'] ?? 0,
                        'barcode' => $vData['barcode'] ?? null,
                        'pack_size' => $vData['pack_size'] ?? null,
                    ]);
                }
            }
        }

        DashboardController::clearCache();
        return response()->json([
            'message' => 'Product updated',
            'data'    => $product->load(['labels', 'groupPrices']),
        ]);
    }

    public function destroy(Request $request, Product $product)
    {
        $product->delete();
        ActivityLogger::log($request->user()->id, Product::class, $product->id, 'deleted');

        DashboardController::clearCache();
        return response()->json(['message' => 'Product deleted.']);
    }

    public function updateStock(Request $request, Product $product)
    {
        $request->validate([
            'variant_id' => 'required|exists:product_variants,id',
            'stock_quantity' => 'required|integer|min:0'
        ]);

        $variant = $product->variants()->findOrFail($request->variant_id);
        $old = $variant->stock_quantity;
        $variant->update(['stock_quantity' => $request->stock_quantity]);

        ActivityLogger::log(
            $request->user()->id,
            ProductVariant::class,
            $variant->id,
            'stock_updated',
            ['stock_quantity' => $old],
            ['stock_quantity' => $request->stock_quantity]
        );

        if ($old <= 0 && $request->stock_quantity > 0) {
            \App\Http\Controllers\Api\NotificationController::notifyBackInStock($product->id, $variant->id);
        }

        if ($request->stock_quantity > 0 && $request->stock_quantity <= $product->low_stock_threshold) {
            \App\Models\Notification::create([
                'user_id' => null,
                'title' => 'Low Stock Warning',
                'message' => "{$product->name} ({$variant->sku}) is low on stock: {$request->stock_quantity} left.",
                'type' => 'low_stock_warning',
                'data' => [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'stock_quantity' => $request->stock_quantity,
                ],
            ]);
        }

        DashboardController::clearCache();
        return response()->json(['message' => 'Stock updated.', 'data' => $variant]);
    }

    public function bulkAction(Request $request)
    {
        $request->validate([
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'exists:products,id',
            'action' => 'required|in:activate,deactivate,delete,change_category,change_brand,change_group_price,mark_in_stock,mark_out_of_stock',
        ]);

        $products = Product::whereIn('id', $request->product_ids);

        switch ($request->action) {
            case 'activate':
                $products->update(['is_active' => true]);
                break;
            case 'deactivate':
                $products->update(['is_active' => false]);
                break;
            case 'delete':
                $products->get()->each->delete();
                break;
            case 'change_category':
                $request->validate(['category_id' => 'required|exists:categories,id']);
                $products->update(['category_id' => $request->category_id]);
                break;
            case 'change_brand':
                $request->validate(['brand_id' => 'required|exists:brands,id']);
                $products->update(['brand_id' => $request->brand_id]);
                break;
            case 'change_group_price':
                $request->validate(['group_id' => 'required|exists:groups,id', 'price' => 'required|numeric|min:0']);
                foreach ($products->get() as $product) {
                    \App\Models\GroupPrice::updateOrCreate(
                        ['product_id' => $product->id, 'variant_id' => null, 'group_id' => $request->group_id],
                        ['price' => $request->price]
                    );
                }
                break;
            case 'mark_in_stock':
                foreach ($products->get() as $product) {
                    foreach ($product->variants as $variant) {
                        $variant->update(['stock_quantity' => 10]);
                    }
                }
                break;
            case 'mark_out_of_stock':
                foreach ($products->get() as $product) {
                    foreach ($product->variants as $variant) {
                        $variant->update(['stock_quantity' => 0]);
                    }
                }
                break;
        }

        ActivityLogger::log(
            $request->user()->id,
            Product::class,
            0,
            'bulk_' . $request->action,
            [],
            ['product_ids' => $request->product_ids]
        );

        return response()->json(['message' => 'Bulk action applied to ' . count($request->product_ids) . ' products.']);
    }

    public function attachImage(Request $request, Product $product)
    {
        $data = $request->validate([
            'image_path' => 'required|string',
            'variant_id' => 'nullable|exists:product_variants,id',
            'is_primary' => 'nullable|boolean',
        ]);

        if ($request->boolean('is_primary')) {
            $product->images()->update(['is_primary' => false]);
        }

        $image = $product->images()->create([
            'variant_id' => $data['variant_id'] ?? null,
            'image_path' => $data['image_path'],
            'is_primary' => $request->boolean('is_primary'),
            'display_order' => $product->images()->count(),
        ]);

        return response()->json(['message' => 'Image added.', 'data' => $image], 201);
    }

    public function removeImage(Request $request, Product $product, ProductImage $image)
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }
        $image->delete();
        return response()->json(['message' => 'Image removed']);
    }

    public function updateVariant(Request $request, Product $product, int $variantId)
    {
        $variant = $product->variants()->findOrFail($variantId);
        $data = $request->validate([
            'mrp' => 'sometimes|numeric|min:0',
            'barcode' => 'sometimes|nullable|string',
            'pack_size' => 'sometimes|nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);
        $old = $variant->only(array_keys($data));
        $variant->update($data);
        ActivityLogger::log(
            $request->user()->id,
            ProductVariant::class,
            $variant->id,
            'variant_updated',
            $old,
            $data
        );
        return response()->json(['message' => 'Variant updated.', 'data' => $variant]);
    }

    public function addVariant(Request $request, Product $product)
    {
        $data = $request->validate([
            'sku' => 'required|string|unique:product_variants,sku',
            'barcode' => 'nullable|string',
            'attributes' => 'nullable|array',
            'stock_quantity' => 'nullable|integer|min:0',
            'mrp' => 'required|numeric|min:0',
            'pack_size' => 'nullable|string',
        ]);
        $variant = $product->variants()->create($data);
        return response()->json(['message' => 'Variant added.', 'data' => $variant], 201);
    }

    public function updateLabels(Request $request, Product $product)
    {
        $data = $request->validate([
            'labels' => 'required|array',
            'labels.*' => 'string|max:255',
        ]);

        $product->labels()->delete();

        foreach ($data['labels'] as $label) {
            if (!empty(trim($label))) {
                ProductLabel::create([
                    'product_id' => $product->id,
                    'label_name' => trim($label),
                ]);
            }
        }

        ActivityLogger::log(
            $request->user()->id,
            Product::class,
            $product->id,
            'labels_updated',
            [],
            ['labels' => $data['labels']]
        );

        return response()->json([
            'message' => 'Labels updated successfully.',
            'data' => $product->labels()->pluck('label_name')
        ]);
    }

    public function updateTags(Request $request, Product $product)
    {
        $data = $request->validate([
            'tags' => 'required|array',
            'tags.*' => 'string|max:255',
        ]);

        $product->tags_relation()->delete();

        foreach ($data['tags'] as $tag) {
            if (!empty(trim($tag))) {
                ProductTag::create([
                    'product_id' => $product->id,
                    'tag_name' => trim($tag),
                ]);
            }
        }

        ActivityLogger::log(
            $request->user()->id,
            Product::class,
            $product->id,
            'tags_updated',
            [],
            ['tags' => $data['tags']]
        );

        return response()->json([
            'message' => 'Tags updated successfully.',
            'data' => $product->tags_relation()->pluck('tag_name')
        ]);
    }

    public function removeVariant(Product $product, int $variant)
    {
        $variantModel = $product->variants()->findOrFail($variant);
        $variantModel->delete();
        return response()->json(['message' => 'Variant deleted.']);
    }
}
