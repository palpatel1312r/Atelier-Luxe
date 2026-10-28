<?php

use App\Constants\Roles;
use App\Http\Controllers\Api\Admin\BrandAdminController;
use App\Http\Controllers\Api\Admin\BulkUploadController;
use App\Http\Controllers\Api\Admin\CategoryAdminController;
use App\Http\Controllers\Api\Admin\ChatAdminController;
use App\Http\Controllers\Api\Admin\GroupController;
use App\Http\Controllers\Api\Admin\InvoiceController;
use App\Http\Controllers\Api\Admin\OfferAdminController;
use App\Http\Controllers\Api\Admin\PricingAdminController;
use App\Http\Controllers\Api\Admin\ProductAdminController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\ReviewAdminController;
use App\Http\Controllers\Api\Admin\SellerManagementController;
use App\Http\Controllers\Api\Admin\SettingsController;
use App\Http\Controllers\Api\Auth\AdminAuthController;
use App\Http\Controllers\Api\Auth\DealerAuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotifyMeController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RecentlyViewedController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SavedFilterController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\UserAddressController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TENANT API ROUTES
|--------------------------------------------------------------------------
*/

// Remove the middleware group
Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::post('/admin/forgot-password', [AdminAuthController::class, 'forgotPassword']);
Route::post('/admin/reset-password', [AdminAuthController::class, 'resetPassword']);
Route::post('/dealer/send-otp', [DealerAuthController::class, 'sendOtp']);
Route::post('/dealer/verify-otp', [DealerAuthController::class, 'verifyOtp']);
Route::post('/dealer/login-password', [DealerAuthController::class, 'loginWithPassword']);
Route::get('/settings/logo', [SettingsController::class, 'getLogo']);
Route::middleware('throttle:101,6')->post('/dealer/register', [DealerAuthController::class, 'register']);
Route::post('/webhooks/razorpay', [PaymentController::class, 'webhook']);

// Logout works for everyone
Route::middleware('auth:sanctum')->post('/logout', [AdminAuthController::class, 'logout']);

// ---------- AUTHENTICATED (shared dealer + super_admin) ----------
Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::get('/products', [ProductController::class, 'index'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::get('/products/{product}', [ProductController::class, 'show'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::get('/products/{product}/price', [ProductController::class, 'livePrice'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::get('/categories', [CategoryController::class, 'index'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::get('/brands', [BrandController::class, 'index'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::get('/offers', [OfferController::class, 'index'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::get('/offers/validate-coupon', [OfferController::class, 'validateCoupon'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::post('/uploads', [UploadController::class, 'store'])->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::get('/chat-contact/admin', function () {
    $admin = \App\Models\User::whereHas('role', fn($q) => $q->where('name', Roles::SUPER_ADMIN))->where('is_active', true)->first();
    return response()->json(['data' => $admin ? ['id' => $admin->id, 'name' => $admin->name] : null]);
})->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::get('/chat/{otherUserId}', [ChatController::class, 'thread'])
    ->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::post('/chat', [ChatController::class, 'send'])
    ->middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::middleware(['auth:sanctum', 'account.active', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN])->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications', [NotificationController::class, 'clearAll']);
});

// ---------- DEALER-ONLY ----------
Route::get('/cart', [CartController::class, 'index'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/cart/items', [CartController::class, 'addItem'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::patch('/cart/items/{item}', [CartController::class, 'updateItem'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::delete('/cart/items/{item}', [CartController::class, 'removeItem'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/cart/buy-now', [CartController::class, 'buyNow'])
    ->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/cart/buy-now', [CartController::class, 'prepareBuyNow'])
    ->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);

Route::get('/wishlist', [WishlistController::class, 'index'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/wishlist', [WishlistController::class, 'store'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::get('/wishlist/check', [WishlistController::class, 'check'])
    ->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::delete('/wishlist/{product}', [WishlistController::class, 'destroy'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);

Route::get('/recently-viewed', [RecentlyViewedController::class, 'index'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/notify-me', [NotifyMeController::class, 'store'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/products/{product}/reviews', [ReviewController::class, 'store'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::get('/saved-filters', [SavedFilterController::class, 'index'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::post('/saved-filters', [SavedFilterController::class, 'store'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::delete('/saved-filters/{id}', [SavedFilterController::class, 'destroy'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);

Route::get('/orders', [OrderController::class, 'index'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::get('/orders/{order}', [OrderController::class, 'show'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::post('/orders', [OrderController::class, 'store'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::post('/orders/{order}/repeat', [OrderController::class, 'repeat'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::patch('/orders/{order}/cancel', [OrderController::class, 'cancel'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::post('/orders/{order}/create-payment', [PaymentController::class, 'createPayment'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::post('/orders/{order}/verify-payment', [PaymentController::class, 'verifyPayment'])->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);

Route::get('/profile', fn(\Illuminate\Http\Request $r) => response()->json(['data' => $r->user()]))
    ->middleware(['auth:sanctum', 'role:' . Roles::DEALER . ',' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN]);
Route::put('/profile', function (\Illuminate\Http\Request $r) {
    $data = $r->validate(['name' => 'sometimes|string', 'company_name' => 'sometimes|nullable|string', 'gst_number' => 'sometimes|nullable|string', 'address' => 'sometimes|nullable|string', 'email' => 'sometimes|nullable|email']);
    $r->user()->update($data);
    return response()->json(['message' => 'Profile updated.', 'data' => $r->user()]);
})->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);
Route::put('/profile/password', function (\Illuminate\Http\Request $r) {
    $r->validate(['current_password' => 'required', 'password' => 'required|min:8|confirmed']);
    if (!\Illuminate\Support\Facades\Hash::check($r->current_password, $r->user()->password)) {
        return response()->json(['message' => 'Current password is incorrect.'], 422);
    }
    $r->user()->update(['password' => \Illuminate\Support\Facades\Hash::make($r->password)]);
    return response()->json(['message' => 'Password changed.']);
})->middleware(['auth:sanctum', 'role:' . Roles::DEALER]);

Route::middleware(['auth:sanctum', 'role:' . Roles::DEALER])->group(function () {
    Route::get('/addresses', [UserAddressController::class, 'index']);
    Route::post('/addresses', [UserAddressController::class, 'store']);
    Route::put('/addresses/{address}', [UserAddressController::class, 'update']);
    Route::patch('/addresses/{address}/default', [UserAddressController::class, 'setDefault']);
    Route::delete('/addresses/{address}', [UserAddressController::class, 'destroy']);
});

// ---------- ADMIN-ONLY (super_admin) ----------
Route::prefix('admin')->middleware(['auth:sanctum', 'role:' . Roles::SUPER_ADMIN . ',' . Roles::SAAS_ADMIN])->group(function () {
    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/orders', [OrderController::class, 'store']);

    // Products
    Route::post('/products', [ProductAdminController::class, 'store']);
    Route::get('/products/{product}', [ProductAdminController::class, 'show']);
    Route::put('/products/{product}', [ProductAdminController::class, 'update']);
    Route::delete('/products/{product}', [ProductAdminController::class, 'destroy']);
    Route::patch('/products/{product}/stock', [ProductAdminController::class, 'updateStock']);
    Route::post('/products/bulk-action', [ProductAdminController::class, 'bulkAction']);
    Route::post('/products/{product}/images', [ProductAdminController::class, 'attachImage']);
    Route::delete('/products/{product}/images/{image}', [ProductAdminController::class, 'removeImage']);
    Route::post('/products/{product}/variants', [ProductAdminController::class, 'addVariant']);
    Route::patch('/products/{product}/variants/{variant}', [ProductAdminController::class, 'updateVariant']);
    Route::post('/products/{product}/labels', [ProductAdminController::class, 'updateLabels']);
    Route::post('/products/{product}/tags', [ProductAdminController::class, 'updateTags']);
    Route::delete('/products/{product}/variants/{variant}', [ProductAdminController::class, 'removeVariant']);

    // Categories
    Route::get('/categories', [CategoryAdminController::class, 'index']);
    Route::get('/categories/{category}', [CategoryAdminController::class, 'show']);
    Route::post('/categories', [CategoryAdminController::class, 'store']);
    Route::put('/categories/{category}', [CategoryAdminController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryAdminController::class, 'destroy']);

    // Brands
    Route::get('/brands', [BrandAdminController::class, 'index']);
    Route::get('/brands/{brand}', [BrandAdminController::class, 'show']);
    Route::post('/brands', [BrandAdminController::class, 'store']);
    Route::put('/brands/{brand}', [BrandAdminController::class, 'update']);
    Route::delete('/brands/{brand}', [BrandAdminController::class, 'destroy']);

    // Invoices
    Route::post('/orders/{order}/generate-invoice', [InvoiceController::class, 'generate']);

    // Offers
    Route::get('/offers', [OfferAdminController::class, 'index']);
    Route::post('/offers', [OfferAdminController::class, 'store']);
    Route::put('/offers/{offer}', [OfferAdminController::class, 'update']);
    Route::delete('/offers/{offer}', [OfferAdminController::class, 'destroy']);

    // Reviews
    Route::get('/reviews', [ReviewAdminController::class, 'index']);
    Route::patch('/reviews/{review}/approve', [ReviewAdminController::class, 'approve']);
    Route::delete('/reviews/{review}', [ReviewAdminController::class, 'destroy']);

    // Chat
    Route::get('/chat/conversations', [ChatAdminController::class, 'conversations']);

    // Pricing
    Route::post('/pricing/group-price', [PricingAdminController::class, 'setGroupPrice']);
    Route::post('/pricing/dealer-override', [PricingAdminController::class, 'setDealerOverride']);
    Route::delete('/pricing/dealer-override/{id}', [PricingAdminController::class, 'removeDealerOverride']);
    Route::post('/pricing/quantity-slabs', [PricingAdminController::class, 'setQuantitySlabs']);
    Route::get('/products/{product}/pricing', [PricingAdminController::class, 'getProductPricing']);

    // Groups
    Route::apiResource('groups', GroupController::class)->except(['show']);

    // Sellers
    Route::get('/sellers', [SellerManagementController::class, 'index']);
    Route::put('/sellers/{seller}', [SellerManagementController::class, 'update']);
    Route::patch('/sellers/{seller}/group', [SellerManagementController::class, 'moveToGroup']);
    Route::patch('/sellers/{seller}/block', [SellerManagementController::class, 'toggleBlock']);
    Route::patch('/sellers/{seller}/activate', [SellerManagementController::class, 'toggleActive']);
    Route::patch('/sellers/{seller}/password', [SellerManagementController::class, 'changePassword']);
    Route::get('/sellers/{seller}', [SellerManagementController::class, 'show']);
    Route::post('/sellers', [SellerManagementController::class, 'store']);
    Route::delete('/sellers/{seller}', [SellerManagementController::class, 'destroy']);

    // Notifications
    Route::post('/notifications/broadcast', [NotificationController::class, 'broadcast']);
    Route::put('/profile/password', [AdminAuthController::class, 'changePassword']);

    // Bulk Upload
    Route::post('/bulk-upload/products', [BulkUploadController::class, 'uploadProducts']);
    Route::get('/bulk-upload/logs', [BulkUploadController::class, 'logs']);
    Route::get('/bulk-upload/sample', [BulkUploadController::class, 'downloadSample']);

    // Reports
    Route::get('/reports/seller-wise-sales', [ReportController::class, 'sellerWiseSales']);
    Route::get('/reports/city-wise-sales', [ReportController::class, 'cityWiseSales']);
    Route::get('/reports/product-wise-sales', [ReportController::class, 'productWiseSales']);
    Route::get('/reports/group-wise-sales', [ReportController::class, 'groupWiseSales']);
    Route::get('/reports/pending-payments', [ReportController::class, 'pendingPayments']);
    Route::get('/reports/top-buyers', [ReportController::class, 'topBuyers']);

    // Settings
    Route::post('/settings/logo', [SettingsController::class, 'setLogo']);
});

// ---------- SAAS ADMIN ONLY ----------
Route::prefix('saas-admin')->middleware(['auth:sanctum', 'role:' . Roles::SAAS_ADMIN])->group(function () {
    Route::get('/', function () {
        return response()->json([
            'message' => 'SaaS Admin Dashboard',
            'data' => [
                'total_super_admins' => \App\Models\User::whereHas('role', fn($q) => $q->where('name', Roles::SUPER_ADMIN))->count(),
                'active_super_admins' => \App\Models\User::whereHas('role', fn($q) => $q->where('name', Roles::SUPER_ADMIN))
                    ->where('is_active', true)->count(),
            ]
        ]);
    });

    Route::get('/admins', function () {
        return \App\Models\User::whereHas('role', fn($q) => $q->where('name', Roles::SUPER_ADMIN))->paginate(20);
    });

    Route::post('/admins', function (\Illuminate\Http\Request $r) {
        $data = $r->validate(['name' => 'required|string', 'email' => 'required|email|unique:users,email', 'password' => 'required|string|min:8', 'phone' => 'required|string|unique:users,phone']);
        $role = \App\Models\Role::where('name', Roles::SUPER_ADMIN)->firstOrFail();
        $admin = \App\Models\User::create([...$data, 'password' => \Illuminate\Support\Facades\Hash::make($data['password']), 'role_id' => $role->id, 'is_active' => true]);
        return response()->json(['message' => 'Admin created.', 'data' => $admin], 201);
    });

    Route::put('/admins/{admin}', function (\Illuminate\Http\Request $r, \App\Models\User $admin) {
        $data = $r->validate(['name' => 'sometimes|string', 'is_active' => 'sometimes|boolean']);
        $admin->update($data);
        return response()->json(['message' => 'Admin updated.', 'data' => $admin]);
    });
});
