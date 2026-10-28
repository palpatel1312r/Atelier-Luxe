<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained('carts')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2); // resolved price at time of add (group/override/slab)
            $table->decimal('total_price', 10, 2);
            $table->boolean('slab_applied')->default(false);
            $table->decimal('slab_price_applied', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['cart_id', 'product_id', 'variant_id'], 'uniq_cart_item');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
