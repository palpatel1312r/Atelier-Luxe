<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    protected $fillable = ['id', 'company_name', 'database_name', 'db_username', 'db_password', 'plan', 'is_active', 'data'];

    public static function getCustomColumns(): array
    {
        return ['id', 'company_name', 'database_name', 'db_username', 'db_password', 'plan', 'is_active'];
    }
}
