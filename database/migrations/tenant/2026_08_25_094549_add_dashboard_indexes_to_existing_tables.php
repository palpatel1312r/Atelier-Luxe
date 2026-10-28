<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // helps: available_products, new_arrivals counts
            $table->index(['is_active', 'is_new_arrival'], 'products_active_new_idx');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            // helps: out_of_stock / low_stock existence checks
            $table->index(
                ['product_id', 'stock_quantity', 'reserved_quantity'],
                'pv_product_stock_reserved_idx'
            );
        });

        Schema::table('orders', function (Blueprint $table) {
            // helps: today's orders / revenue by date + status
            $table->index(['created_at', 'order_status'], 'orders_created_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_active_new_idx');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropIndex('pv_product_stock_reserved_idx');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_created_status_idx');
        });
    }
};
