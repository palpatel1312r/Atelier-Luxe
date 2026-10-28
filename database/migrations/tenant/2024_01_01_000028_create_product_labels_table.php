<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_labels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('label_name'); // New, Hot, Trending, Limited Stock, Offer, Best Seller
            $table->timestamps();

            $table->index(['product_id', 'label_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_labels');
    }
};
