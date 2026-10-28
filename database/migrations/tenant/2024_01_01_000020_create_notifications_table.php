<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete(); // null if broadcast
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable()->after('message');
            $table->foreignId('product_id')->nullable()->after('data')->constrained('products')->nullOnDelete();
            $table->enum('type', [
                'stock_updated',
                'price_updated',
                'new_product',
                'offer',
                'back_in_stock',
                'low_stock_warning',
                'order_update',
                'broadcast',
                'general'
            ])->default('general');
            $table->boolean('is_read')->default(false);
            $table->boolean('is_broadcast')->default(false);
            $table->foreignId('target_group_id')->nullable()->constrained('groups')->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index('target_group_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
