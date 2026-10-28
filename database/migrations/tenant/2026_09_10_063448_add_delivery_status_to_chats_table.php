<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            // ✅ Add delivered tracking (in addition to existing is_read/read_at)
            $table->timestamp('delivered_at')->nullable()->after('read_at');

            // ✅ Add status column for easier querying
            $table->enum('status', ['sent', 'delivered', 'read'])
                ->default('sent')
                ->after('delivered_at');

            // ✅ Index for performance
            $table->index(['receiver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->dropIndex(['receiver_id', 'status']);
            $table->dropColumn(['delivered_at', 'status']);
        });
    }
};
