<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dealer_specific_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // the dealer
            $table->decimal('override_price', 10, 2);
            $table->text('reason_text')->nullable(); // "bulk loyal customer"
            $table->timestamp('effective_from')->nullable();
            $table->timestamp('effective_to')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'variant_id', 'user_id'], 'uniq_dealer_price');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dealer_specific_prices');
    }
};
