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
            $table->foreignId('user_id')->constrained('users');
            $table->string('order_number')->unique();
            $table->decimal('total_amount', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2);
            $table->string('payment_method')->default('credit'); // credit, cod, online
            $table->enum('payment_status', ['pending', 'paid', 'partial', 'failed'])->default('pending');
            $table->enum('order_status', [
                'pending',
                'approved',
                'rejected',
                'packing',
                'dispatched',
                'delivered',
                'cancelled'
            ])->default('pending');
            $table->text('shipping_address');
            $table->text('billing_address')->nullable();
            $table->string('gst_invoice_number')->nullable();
            $table->string('gst_invoice_url')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('shipping_partner')->nullable();
            $table->dateTime('reserved_until')->nullable(); // stock hold expiry before approval
            $table->text('notes')->nullable();

            // ✅ ADD THESE COLUMNS
            $table->timestamp('cancelled_at')->nullable()->after('reserved_until');
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('cancelled_at');
            $table->foreign('cancelled_by')->references('id')->on('users')->nullOnDelete();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'order_status']);
            $table->index('order_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
