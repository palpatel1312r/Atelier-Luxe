<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_restrictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('min_order_value', 12, 2)->nullable();
            $table->decimal('max_order_value', 12, 2)->nullable();
            $table->integer('max_quantity_per_product')->nullable();
            $table->integer('max_quantity_per_order')->nullable();
            $table->boolean('credit_block')->default(false); // true = block orders if credit exceeded
            $table->json('restricted_states')->nullable(); // ["Gujarat","Maharashtra"]
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_restrictions');
    }
};
