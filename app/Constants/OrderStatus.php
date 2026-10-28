<?php

namespace App\Constants;

/**
 * Centralizes order-status string literals used across OrderController,
 * ReportController, DashboardController, and the auto-release scheduled
 * job. Also documents the valid forward-transition sequence in one place
 * instead of it being implicit in whichever controller happens to check it.
 */
final class OrderStatus
{
    public const PENDING = 'pending';
    public const APPROVED = 'approved';
    public const PACKING = 'packing';
    public const DISPATCHED = 'dispatched';
    public const DELIVERED = 'delivered';
    public const REJECTED = 'rejected';
    public const CANCELLED = 'cancelled';

    /** Forward-only happy-path sequence; used to build "move to next status" options. */
    public const FLOW = [self::PENDING, self::APPROVED, self::PACKING, self::DISPATCHED, self::DELIVERED];

    /** Statuses that count as a completed sale for revenue/report queries. */
    public const REVENUE_COUNTING = [self::APPROVED, self::PACKING, self::DISPATCHED, self::DELIVERED];

    /** Statuses where stock was reserved but should now be released back. */
    public const STOCK_RELEASING = [self::REJECTED, self::CANCELLED];

    private function __construct() {}
}
