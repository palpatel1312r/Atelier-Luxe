<?php

namespace App\Http\Controllers\Api;

use App\Constants\OrderStatus;
use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\Order;
use App\Models\Product;
use App\Models\RecentlyViewed;
use App\Models\User;
use App\Services\PricingEngine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(protected PricingEngine $pricingEngine) {}

    private function getRecentlyViewedFresh(User $user): array
    {
        $rows = RecentlyViewed::where('user_id', $user->id)
            ->orderByDesc('viewed_at')
            ->limit(10)
            ->get(['product_id']);

        if ($rows->isEmpty()) return [];

        $products = Product::whereIn('id', $rows->pluck('product_id'))
            ->with(['images', 'variants', 'labels', 'category', 'brand', 'groupPrices'])
            ->get()
            ->keyBy('id');

        $result = [];
        foreach ($rows as $row) {
            if ($product = $products->get($row->product_id)) {
                $result[] = $this->formatProduct($product, $user);
            }
        }
        return $result;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;
        $v = Cache::get('dashboard_cache_invalidated', 0);
        $cacheKey = "dash:full:{$userId}:{$v}";

        $payload = Cache::remember($cacheKey, 300, function () use ($user) {
            return $user->isDealer()
                ? $this->dealerDashboard($user)
                : $this->adminDashboard($user);
        });

        // Cache recently viewed separately (2 min)
        if ($user->isDealer()) {
            $payload['recently_viewed'] = Cache::remember(
                "dash:recent:fresh:{$userId}:{$v}",
                120,
                fn() => $this->getRecentlyViewedFresh($user)
            );
        }

        return response()->json(['data' => $payload]);
    }

    private function dealerDashboard(User $user): array
    {
        $hour = (int) now()->format('H');
        $hello = $hour < 12 ? 'Good morning' : ($hour < 17 ? 'Good afternoon' : 'Good evening');

        $availableProducts = (int) Product::where('is_active', true)->count();

        $outOfStock = (int) Product::where('is_active', true)
            ->whereDoesntHave('variants', fn($q) => $q->where('stock_quantity', '>', 0))
            ->count();

        $newArrivals = (int) Product::where('is_active', true)->where('is_new_arrival', true)->count();
        $offers = (int) Offer::where('is_active', true)->where('end_date', '>=', now())->count();

        $newProducts = Product::where('is_active', true)
            ->where('is_new_arrival', true)
            ->with(['images', 'variants', 'labels', 'groupPrices'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($p) => $this->formatProduct($p, $user))
            ->toArray();

        $popularProducts = $this->getPopularProducts($user);
        $suggestions = $this->getSuggestions($user);

        return [
            'greeting' => "{$hello}, {$user->name}",
            'cards' => [
                'available_products' => $availableProducts,
                'out_of_stock'       => $outOfStock,
                'new_arrivals'       => $newArrivals,
                'offers'             => $offers,
            ],
            'new_products'     => $newProducts,
            'popular_products' => $popularProducts,
            'suggestions'      => $suggestions,
        ];
    }

    private function adminDashboard(User $user): array
    {
        $today = now()->toDateString();

        $outOfStock = (int) Product::whereDoesntHave('variants', fn($q) => $q->where('stock_quantity', '>', 0))->count();

        $lowStock = (int) DB::table('products')
            ->join('product_variants', 'product_variants.product_id', '=', 'products.id')
            ->select('products.id')
            ->groupBy('products.id', 'products.low_stock_threshold')
            ->havingRaw('SUM(product_variants.stock_quantity) > 0')
            ->havingRaw('SUM(product_variants.stock_quantity) <= COALESCE(products.low_stock_threshold, 0)')
            ->get()
            ->count();

        $popularProducts = $this->getPopularProducts($user);
        $recentOrders = $this->getRecentOrders();

        return [
            'cards' => [
                'todays_orders'  => Order::whereDate('created_at', $today)->count(),
                'pending_orders' => Order::where('order_status', OrderStatus::PENDING)->count(),
                'total_sellers'  => User::whereHas('role', fn($q) => $q->where('name', Roles::DEALER))->count(),
                'active_sellers' => User::whereHas('role', fn($q) => $q->where('name', Roles::DEALER))->where('is_active', true)->count(),
                'out_of_stock'   => $outOfStock,
                'low_stock'      => $lowStock,
                'todays_revenue' => Order::whereDate('created_at', $today)->whereIn('order_status', OrderStatus::REVENUE_COUNTING)->sum('grand_total'),
            ],
            'top_selling_products' => DB::table('order_items')
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
                ->groupBy('products.id', 'products.name')
                ->select('products.name', DB::raw('SUM(order_items.quantity) as units_sold'))
                ->orderByDesc('units_sold')
                ->limit(10)
                ->get(),
            'recent_orders'    => $recentOrders,
            'popular_products' => $popularProducts,
        ];
    }

    private function getPopularProducts(User $user): array
    {
        $productIds = Cache::remember('dash:popular:ids', 60, function () {
            return DB::table('order_items')
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
                ->where('products.is_active', true)
                ->groupBy('products.id')
                ->orderByDesc(DB::raw('SUM(order_items.quantity)'))
                ->limit(10)
                ->pluck('products.id')
                ->toArray();
        });

        if (empty($productIds)) return [];

        $products = Product::whereIn('id', $productIds)
            ->with(['images', 'variants', 'labels', 'groupPrices'])
            ->get()
            ->keyBy('id');

        return collect($productIds)
            ->map(function ($id) use ($products, $user) {
                $product = $products->get($id);
                return $product ? $this->formatProduct($product, $user) : null;
            })
            ->filter()
            ->values()
            ->toArray();
    }

    private function getSuggestions(User $user): array
    {
        $v = Cache::get('dashboard_cache_invalidated', 0);

        return Cache::remember("dash:sugg:{$user->id}:{$v}", 60, function () use ($user) {
            $topCategories = DB::table('order_items')
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->where('orders.user_id', $user->id)
                ->groupBy('products.category_id')
                ->orderByDesc(DB::raw('SUM(order_items.quantity)'))
                ->limit(3)
                ->pluck('products.category_id');

            $query = Product::where('is_active', true)
                ->with(['images', 'variants', 'labels', 'groupPrices'])
                ->limit(15);

            $suggested = $topCategories->isEmpty()
                ? $query->latest()->get()
                : $query->whereIn('category_id', $topCategories)->inRandomOrder()->get();

            return $suggested->map(fn($product) => $this->formatProduct($product, $user))->toArray();
        });
    }

    private function formatProduct(Product $product, ?User $user = null): array
    {
        $variant = $product->variants->first();
        $resolved = ['price' => null, 'source' => 'mrp'];

        if ($user && $variant) {
            $qty = max(1, (int) ($product->min_order_qty ?: 1));
            $preloaded = $product->relationLoaded('groupPrices') ? $product->groupPrices : null;
            $resolved = $this->pricingEngine->resolve($user, $product, $variant, $qty, $preloaded);
        }

        $price = $resolved['price'] ?? $variant?->mrp;
        $source = $resolved['source'] ?? 'mrp';

        return [
            'id'           => $product->id,
            'name'         => $product->name,
            'slug'         => $product->slug,
            'images'       => $product->images->map(function ($img) {
                $path = $img->image_path;
                if (!$path) return null;
                if (str_starts_with($path, 'http')) return $path;
                $clean = preg_replace('#^storage/#', '', ltrim($path, '/'));
                return asset('storage/' . $clean);
            })->filter()->values(),
            'labels'       => $product->labels->pluck('label_name'),
            'mrp'          => $variant?->mrp,
            'your_price'   => $price,
            'price_source' => $source,
            'stock_status' => $product->stockStatus(),
        ];
    }

    private function getRecentOrders(): array
    {
        return Order::with(['user', 'items.product'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id'           => $order->id,
                    'order_number' => $order->order_number,
                    'customer'     => $order->user?->name,
                    'total'        => $order->grand_total,
                    'status'       => $order->order_status,
                    'created_at'   => $order->created_at?->toISOString(),
                ];
            })
            ->toArray();
    }

    public static function clearCache(?int $userId = null): void
    {
        Cache::forget('dash:popular:global');
        Cache::forget('dash:popular:ids');
        Cache::forget('dashboard:admin');
        Cache::forget('dashboard:dealer');
        Cache::forget('dashboard:suggestions');
        Cache::forever('dashboard_cache_invalidated', now()->timestamp);

        if ($userId) {
            Cache::forget("dash:full:{$userId}");
            Cache::forget("dash:dealer:{$userId}");
            Cache::forget("dash:sugg:{$userId}");
            Cache::forget("dash:recent:{$userId}");
        }
    }
}
