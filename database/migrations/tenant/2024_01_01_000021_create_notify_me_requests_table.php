<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notify_me_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->boolean('is_notified')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'product_id', 'variant_id'], 'uniq_notify_request');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notify_me_requests');
    }
};
