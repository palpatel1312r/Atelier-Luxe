<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku')->unique();
            $table->string('barcode')->nullable()->unique();
            $table->json('attributes')->nullable(); // {"color":"Red","size":"M"}
            $table->integer('stock_quantity')->default(0);
            $table->integer('reserved_quantity')->default(0); // held by unconfirmed orders
            $table->decimal('mrp', 10, 2);
            $table->decimal('cost_price', 10, 2)->nullable();
            $table->string('pack_size')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('product_id');
            $table->index('stock_quantity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
