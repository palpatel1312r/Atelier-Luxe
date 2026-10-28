<?php

namespace Database\Seeders;

use App\Models\Group;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $nilesh = User::where('phone', '9111100001')->first();
        $groupA = Group::where('slug', 'group-a')->first();

        if ($nilesh) {
            Notification::create([
                'user_id' => $nilesh->id, 'title' => 'Special Price Applied',
                'message' => 'You now have a special price on Cotton Formal Shirt.',
                'type' => 'price_updated',
            ]);
        }

        if ($groupA) {
            Notification::create([
                'user_id' => null, 'title' => 'Monsoon Sale Live Now',
                'message' => '10% off on select apparel this week — use code MONSOON10.',
                'type' => 'offer', 'is_broadcast' => true, 'target_group_id' => $groupA->id,
            ]);
        }

        Notification::create([
            'user_id' => null, 'title' => 'New Products Added',
            'message' => 'Check out our latest additions to the catalog.',
            'type' => 'new_product', 'is_broadcast' => true, 'target_group_id' => null,
        ]);
    }
}
