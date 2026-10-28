<?php

namespace App\Constants;

/**
 * Centralizes role-name string literals. Previously these were repeated as
 * raw strings ('super_admin', 'saas_admin', 'dealer') across ~10 files —
 * a single typo in any one of them would silently fail an authorization
 * check rather than throw. Using these constants means a typo becomes a
 * compile-time-visible IDE/static-analysis error instead.
 */
final class Roles
{
    public const SAAS_ADMIN = 'saas_admin';
    public const SUPER_ADMIN = 'super_admin';
    public const DEALER = 'dealer';

    public const ADMIN_ROLES = [self::SUPER_ADMIN, self::SAAS_ADMIN];

    private function __construct() {} // static-only class, never instantiated
}
