<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('tag_name'); // Best Seller, Trending, Hot, Premium, Fast Moving
            $table->timestamps();

            $table->index(['product_id', 'tag_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_tags');
    }
};
