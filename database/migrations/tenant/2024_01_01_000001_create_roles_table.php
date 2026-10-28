<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // super_admin, saas_admin, dealer
            $table->timestamps();
        });

        // Seed default roles immediately so FK references never fail
        \Illuminate\Support\Facades\DB::table('roles')->insert([
            ['id' => 1, 'name' => 'saas_admin', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'super_admin', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'name' => 'dealer', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
