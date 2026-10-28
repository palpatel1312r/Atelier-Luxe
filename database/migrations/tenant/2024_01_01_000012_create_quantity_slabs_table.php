<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quantity_slabs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->integer('min_qty');
            $table->integer('max_qty')->nullable(); // null = infinite (50+)
            $table->decimal('price', 10, 2);
            $table->timestamps();

            $table->index(['product_id', 'min_qty']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quantity_slabs');
    }
};
