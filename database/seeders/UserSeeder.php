<?php

namespace Database\Seeders;

use App\Constants\Roles;
use App\Models\Group;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Every login path and role/status edge case gets at least one seeded
 * account, so QA/SonarQube reviewers can exercise the full auth matrix
 * without creating test data by hand:
 *   - saas_admin (admin management only)
 *   - super_admin (full admin panel)
 *   - active dealers spread across all 5 groups
 *   - 'Nilesh' specifically, matching your spec's pricing-override example
 *   - one blocked dealer (tests the block/unblock flow)
 *   - one not-yet-activated dealer (tests the OTP-verification-activates-account flow)
 * Default password for every seeded account: Password@123
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $pw = Hash::make('Password@123');
        $saasAdminRole = Role::where('name', Roles::SAAS_ADMIN)->firstOrFail();
        $superAdminRole = Role::where('name', Roles::SUPER_ADMIN)->firstOrFail();
        $dealerRole = Role::where('name', Roles::DEALER)->firstOrFail();

        $groupA = Group::where('slug', 'group-a')->firstOrFail();
        $groupB = Group::where('slug', 'group-b')->firstOrFail();
        $groupC = Group::where('slug', 'group-c')->firstOrFail();
        $groupD = Group::where('slug', 'group-d')->firstOrFail();
        $vip = Group::where('slug', 'vip')->firstOrFail();

        User::updateOrCreate(['email' => 'saasadmin@example.com'], [
            'name' => 'Platform Owner', 'phone' => '9000000001', 'password' => $pw,
            'role_id' => $saasAdminRole->id, 'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'admin@example.com'], [
            'name' => 'Store Admin', 'phone' => '9000000002', 'password' => $pw,
            'role_id' => $superAdminRole->id, 'is_active' => true,
        ]);

        // The exact dealer from your spec's pricing example — used by ProductSeeder
        // to attach a ₹410 dealer-specific override while the rest of Group A sees ₹420.
        User::updateOrCreate(['phone' => '9111100001'], [
            'name' => 'Nilesh', 'email' => 'nilesh@example.com', 'password' => $pw,
            'company_name' => 'Nilesh Garments', 'gst_number' => '24AAAAA0000A1Z5',
            'address' => '12 MG Road', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'pincode' => '380001',
            'role_id' => $dealerRole->id, 'group_id' => $groupA->id, 'is_active' => true,
            'credit_limit' => 100000, 'outstanding_amount' => 15000,
        ]);

        User::updateOrCreate(['phone' => '9111100002'], [
            'name' => 'Mahesh', 'email' => 'mahesh@example.com', 'password' => $pw,
            'company_name' => 'Mahesh Traders', 'city' => 'Ahmedabad', 'state' => 'Gujarat',
            'role_id' => $dealerRole->id, 'group_id' => $groupA->id, 'is_active' => true,
            'credit_limit' => 50000, 'outstanding_amount' => 5000,
        ]);

        User::updateOrCreate(['phone' => '9111100003'], [
            'name' => 'Priya Sharma', 'email' => 'priya@example.com', 'password' => $pw,
            'company_name' => 'Priya Wholesale', 'city' => 'Surat', 'state' => 'Gujarat',
            'role_id' => $dealerRole->id, 'group_id' => $groupB->id, 'is_active' => true,
            'credit_limit' => 75000, 'outstanding_amount' => 0,
        ]);

        User::updateOrCreate(['phone' => '9111100004'], [
            'name' => 'Ramesh Distributors', 'email' => 'ramesh@example.com', 'password' => $pw,
            'company_name' => 'Ramesh & Sons', 'city' => 'Rajkot', 'state' => 'Gujarat',
            'role_id' => $dealerRole->id, 'group_id' => $groupC->id, 'is_active' => true,
            'credit_limit' => 150000, 'outstanding_amount' => 20000,
        ]);

        User::updateOrCreate(['phone' => '9111100005'], [
            'name' => 'Suresh New Dealer', 'email' => 'suresh@example.com', 'password' => $pw,
            'company_name' => 'Suresh Enterprises', 'city' => 'Vadodara', 'state' => 'Gujarat',
            'role_id' => $dealerRole->id, 'group_id' => $groupD->id, 'is_active' => true,
            'credit_limit' => 20000, 'outstanding_amount' => 0,
        ]);

        User::updateOrCreate(['phone' => '9111100006'], [
            'name' => 'Kavita VIP', 'email' => 'kavita@example.com', 'password' => $pw,
            'company_name' => 'Kavita Retail Chain', 'city' => 'Mumbai', 'state' => 'Maharashtra',
            'role_id' => $dealerRole->id, 'group_id' => $vip->id, 'is_active' => true,
            'credit_limit' => 500000, 'outstanding_amount' => 80000,
        ]);

        // Tests the block/unblock admin action + the "blocked user cannot log in" path
        User::updateOrCreate(['phone' => '9111100007'], [
            'name' => 'Blocked Test Dealer', 'email' => 'blocked@example.com', 'password' => $pw,
            'company_name' => 'Defaulted Traders', 'city' => 'Delhi', 'state' => 'Delhi',
            'role_id' => $dealerRole->id, 'group_id' => $groupA->id,
            'is_active' => true, 'is_blocked' => true,
            'credit_limit' => 30000, 'outstanding_amount' => 30000,
        ]);

        // Tests the register -> OTP verify -> auto-activate flow end to end
        User::updateOrCreate(['phone' => '9111100008'], [
            'name' => 'Pending Verification Dealer', 'email' => 'pending@example.com', 'password' => $pw,
            'company_name' => 'New Signup Co', 'city' => 'Pune', 'state' => 'Maharashtra',
            'role_id' => $dealerRole->id, 'group_id' => $groupB->id, 'is_active' => false,
        ]);
    }
}
