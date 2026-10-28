<?php

namespace App\Http\Controllers\Api\Admin;

use App\Constants\OrderStatus;
use App\Constants\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    // GET /api/admin/reports/seller-wise-sales?from=&to=
    public function sellerWiseSales(Request $request)
    {
        $data = Order::query()
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->when($request->from, fn($q) => $q->where('orders.created_at', '>=', $request->from))
            ->when($request->to, fn($q) => $q->where('orders.created_at', '<=', $request->to))
            ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
            ->groupBy('users.id', 'users.name')
            ->select('users.id', 'users.name as seller_name', DB::raw('COUNT(orders.id) as total_orders'), DB::raw('SUM(orders.grand_total) as total_sales'))
            ->orderByDesc('total_sales')
            ->get();

        return response()->json(['data' => $data]);
    }

    // GET /api/admin/reports/city-wise-sales
    public function cityWiseSales(Request $request)
    {
        $data = Order::query()
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
            ->groupBy('users.city')
            ->select('users.city', DB::raw('SUM(orders.grand_total) as total_sales'), DB::raw('COUNT(orders.id) as total_orders'))
            ->orderByDesc('total_sales')
            ->get();

        return response()->json(['data' => $data]);
    }

    // GET /api/admin/reports/product-wise-sales
    public function productWiseSales(Request $request)
    {
        $data = OrderItem::query()
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
            ->groupBy('products.id', 'products.name')
            ->select('products.id', 'products.name', DB::raw('SUM(order_items.quantity) as units_sold'), DB::raw('SUM(order_items.total_price) as revenue'))
            ->orderByDesc('revenue')
            ->limit(50)
            ->get();

        return response()->json(['data' => $data]);
    }

    // GET /api/admin/reports/group-wise-sales
    public function groupWiseSales(Request $request)
    {
        $data = Order::query()
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->join('groups', 'groups.id', '=', 'users.group_id')
            ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
            ->groupBy('groups.id', 'groups.name')
            ->select('groups.name as group_name', DB::raw('SUM(orders.grand_total) as total_sales'))
            ->orderByDesc('total_sales')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function pendingPayments(Request $request)
    {
        $orders = Order::where('payment_status', 'pending')
            ->with('user') // Eager load the user
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'user_id' => $order->user_id,
                    'grand_total' => $order->grand_total,
                    'payment_status' => $order->payment_status,
                    'created_at' => $order->created_at->toIso8601String(),
                    // 🔥 FIX: Send just the name instead of the whole user object
                    'user' => $order->user?->name ?? '—',
                ];
            });

        return response()->json(['data' => $orders]);
    }
    // GET /api/admin/reports/top-buyers
    public function topBuyers(Request $request)
    {
        $data = Order::query()
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->whereIn('orders.order_status', OrderStatus::REVENUE_COUNTING)
            ->groupBy('users.id', 'users.name', 'users.company_name')
            ->select('users.id', 'users.name', 'users.company_name', DB::raw('SUM(orders.grand_total) as total_spent'), DB::raw('COUNT(orders.id) as order_count'))
            ->orderByDesc('total_spent')
            ->limit(20)
            ->get();

        return response()->json(['data' => $data]);
    }
}
