<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\WishlistController;
use App\Http\Controllers\CategoryController;
use Illuminate\Support\Facades\Route;

// ---------- Public ----------
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::post('/auth/register',    [AuthController::class, 'register']);
Route::post('/auth/login',       [AuthController::class, 'login']);

Route::post('/contact',          [ContactController::class, 'store']);
Route::post('/orders',           [AdminController::class, 'storeOrder']);

// ---------- Authenticated ----------
Route::middleware('auth:sanctum')->group(function () {
  Route::get('/auth/me',       [AuthController::class, 'me']);
  Route::post('/auth/logout',  [AuthController::class, 'logout']);

  // Wishlist — two shapes accepted
  Route::get('/wishlist',              [WishlistController::class, 'index']);
  Route::post('/wishlist',             [WishlistController::class, 'store']);     // body {product_id}
  Route::post('/wishlist/{product}',   [WishlistController::class, 'storeById']); // path param
  Route::delete('/wishlist/{product}', [WishlistController::class, 'destroy']);
  Route::post('/wishlist/merge',       [WishlistController::class, 'merge']);     // 👈 ADD

  Route::post('/upload',               [UploadController::class, 'store']);
});

// ---------- Admin ----------
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/stats',     [AdminController::class, 'dashboard']);

    // Products
    Route::get('/products',          [AdminController::class, 'products']);
    Route::get('/products/{id}',     [AdminController::class, 'showProduct']);
    Route::post('/products',         [AdminController::class, 'createProduct']);
    Route::put('/products/{id}',     [AdminController::class, 'updateProduct']);
    Route::patch('/products/{id}',   [AdminController::class, 'updateProduct']); // toggle is_active
    Route::delete('/products/{id}',  [AdminController::class, 'deleteProduct']);

    // Messages
    Route::get('/messages',                  [AdminController::class, 'messages']);
    Route::patch('/messages/{contact}/read', [AdminController::class, 'markMessageRead']);
    Route::put('/messages/{contact}/read',   [AdminController::class, 'markMessageRead']);
    Route::delete('/messages/{contact}',     [AdminController::class, 'deleteMessage']);

    // Orders
    Route::get('/orders',                    [AdminController::class, 'orders']);
    Route::patch('/orders/{order}',          [AdminController::class, 'updateOrder']);
    Route::patch('/orders/{order}/status',   [AdminController::class, 'updateOrder']);

    // Categories
    Route::get('/categories',                [CategoryController::class, 'index']);
    Route::post('/categories',               [CategoryController::class, 'store']);
    Route::get('/categories/{category}',     [CategoryController::class, 'show']);
    Route::put('/categories/{category}',     [CategoryController::class, 'update']);
    Route::delete('/categories/{category}',  [CategoryController::class, 'destroy']);
});