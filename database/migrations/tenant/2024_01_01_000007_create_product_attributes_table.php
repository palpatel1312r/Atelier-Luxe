<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('attribute_name'); // Color, Size, Material, Waterproof
            $table->string('attribute_value'); // Red, XL, Cotton, Yes
            $table->string('attribute_type')->default('text'); // text, boolean, number, color
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'attribute_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attributes');
    }
};
