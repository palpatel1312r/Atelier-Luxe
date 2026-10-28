<?php

namespace App\Constants;

/**
 * Companion to OrderStatus — kept as a separate class because payment_status
 * and order_status are independent lifecycles on the same Order row (e.g. an
 * order can be 'approved' while payment_status is still 'pending' on a
 * credit-term order). Conflating them into one enum would make a valid state
 * like "delivered but not yet paid" (common for credit-term dealers) harder
 * to represent cleanly.
 */
final class PaymentStatus
{
    public const PENDING = 'pending';
    public const PAID = 'paid';
    public const PARTIAL = 'partial';
    public const FAILED = 'failed';

    private function __construct() {}
}
