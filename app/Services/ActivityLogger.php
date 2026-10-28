<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Request;

/**
 * Every price change, stock change, order status change must be traceable
 * per your spec (Activity Log: who changed it, effective date, old rate, new rate).
 */
class ActivityLogger
{
    public static function log(?int $userId, string $modelType, int $modelId, string $action, array $old = [], array $new = []): void
    {
        ActivityLog::create([
            'user_id' => $userId,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'action' => $action,
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::header('User-Agent'), 0, 255),
        ]);
    }
}
