<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. "abc-traders"
            $table->string('company_name');
            $table->string('database_name')->unique(); // physical DB name e.g. tenant_abc_traders
            $table->string('db_username')->nullable();
            $table->string('db_password')->nullable();
            $table->string('plan')->default('standard'); // future SaaS billing plans
            $table->boolean('is_active')->default(true);
            $table->json('data')->nullable(); // extra tenant settings (logo, theme, etc.)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
