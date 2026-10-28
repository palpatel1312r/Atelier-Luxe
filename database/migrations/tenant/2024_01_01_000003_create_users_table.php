<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique()->nullable();
            $table->string('password')->nullable(); // nullable because dealers can login via OTP only
            $table->string('phone')->unique();
            $table->string('company_name')->nullable();
            
            $table->string('gst_number')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode')->nullable();
            $table->string('country')->default('India');

            $table->foreignId('role_id')->constrained('roles');
            $table->foreignId('group_id')->nullable()->constrained('groups')->nullOnDelete();

            $table->decimal('credit_limit', 12, 2)->default(0);
            $table->decimal('outstanding_amount', 12, 2)->default(0);

            $table->boolean('is_active')->default(true);
            $table->boolean('is_blocked')->default(false);

            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('last_order_at')->nullable();
            $table->decimal('monthly_purchase', 12, 2)->default(0);
            $table->decimal('return_percentage', 5, 2)->default(0);
            $table->integer('activity_score')->default(0);

            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['role_id', 'is_active']);
            $table->index('group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
