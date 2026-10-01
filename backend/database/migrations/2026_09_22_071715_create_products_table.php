<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Categories table (must come first — products reference it)
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // 2. Products table
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('details')->nullable();
            $table->decimal('price', 10, 2);

            // Denormalized category name (kept in sync by controllers)
            $table->string('category')->nullable()->index();

            // Foreign key to categories
            $table->foreignId('category_id')->nullable()
                ->constrained('categories')
                ->nullOnDelete();

            $table->string('color')->nullable();
            $table->json('sizes')->nullable();

            // Main image + gallery
            $table->string('image')->nullable();
            $table->json('images')->nullable();
            $table->boolean('is_active')->default(true);

            $table->integer('stock')->default(0);
            $table->boolean('featured')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};