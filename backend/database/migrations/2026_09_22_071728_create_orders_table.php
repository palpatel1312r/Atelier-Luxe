<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->json('items');                                   // [{product_id, name, price, qty}]
            $table->decimal('total', 10, 2);
            $table->string('status')->default('pending')->index();   // pending|processing|shipped|completed|cancelled
            $table->string('customer_name');
            $table->string('customer_email');
            $table->text('shipping_address');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
