<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Order matters here — each seeder assumes the ones before it already ran
 * (ProductSeeder needs Groups+Categories+Brands+Nilesh from UserSeeder,
 * OrderSeeder needs Products+Users, etc.). Run with:
 *   php artisan db:seed              (inside a tenant context)
 *   php artisan tenant:seed {id}     (convenience wrapper, see CreateTenant.php sibling command)
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            GroupSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            UserSeeder::class,
            ProductSeeder::class,
            OfferSeeder::class,
            OrderSeeder::class,
            OrderRestrictionSeeder::class,
            ReviewSeeder::class,
            NotificationSeeder::class,
        ]);

        $this->command->info('');
        $this->command->info('✅ Seeding complete. Test logins (password: Password@123):');
        $this->command->table(['Role', 'Login', 'Notes'], [
            ['saas_admin', 'saasadmin@example.com', 'Can only manage admin accounts'],
            ['super_admin', 'admin@example.com', 'Full admin panel access'],
            ['dealer (Group A)', 'Phone 9111100001 (Nilesh)', 'Has a ₹410 dealer-specific override — try it against the ₹420 Group A price'],
            ['dealer (Group A)', 'Phone 9111100002 (Mahesh)', 'Has order restrictions: max 100 qty/product'],
            ['dealer (Group B)', 'Phone 9111100003 (Priya)', 'Clean account, no restrictions'],
            ['dealer (Group C)', 'Phone 9111100004 (Ramesh)', ''],
            ['dealer (Group D)', 'Phone 9111100005 (Suresh)', 'Has order restrictions: ₹2,000 min order, credit-blocked'],
            ['dealer (VIP)', 'Phone 9111100006 (Kavita)', 'Highest discount tier'],
            ['dealer (blocked)', 'Phone 9111100007', 'Login should be rejected — tests the block flow'],
            ['dealer (pending)', 'Phone 9111100008', 'is_active=false — tests OTP-verify-activates-account'],
        ]);
        $this->command->info('OTP for any phone login: check debug_otp in the API response (APP_ENV=local only).');
    }
}
