<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $customer = User::where('email', 'demo@ledgerly.test')->first();
        $admin    = User::where('email', 'admin@atelierluxe.com')->first();

        $whiteTee = Product::where('name', 'Classic White Tee')->first();
        $blackTee = Product::where('name', 'Essential Black Tee')->first();

        if (! $whiteTee || ! $blackTee) {
            return; // products must exist first
        }

        // Order 1 — pending
        Order::create([
            'user_id'          => $customer?->id,
            'items'            => [
                [
                    'product_id' => $whiteTee->id,
                    'name'       => $whiteTee->name,
                    'price'      => $whiteTee->price,
                    'qty'        => 2,
                ],
            ],
            'total'            => $whiteTee->price * 2,
            'status'           => 'pending',
            'customer_name'    => 'Demo Customer',
            'customer_email'   => 'demo@ledgerly.test',
            'shipping_address' => "12 Rue Saint-Honoré\n75001 Paris\nFrance",
        ]);

        // Order 2 — completed
        Order::create([
            'user_id'          => $customer?->id,
            'items'            => [
                [
                    'product_id' => $blackTee->id,
                    'name'       => $blackTee->name,
                    'price'      => $blackTee->price,
                    'qty'        => 1,
                ],
                [
                    'product_id' => $whiteTee->id,
                    'name'       => $whiteTee->name,
                    'price'      => $whiteTee->price,
                    'qty'        => 1,
                ],
            ],
            'total'            => $blackTee->price + $whiteTee->price,
            'status'           => 'completed',
            'customer_name'    => 'Demo Customer',
            'customer_email'   => 'demo@ledgerly.test',
            'shipping_address' => "12 Rue Saint-Honoré\n75001 Paris\nFrance",
        ]);

        // Order 3 — guest, shipped
        Order::create([
            'user_id'          => null,
            'items'            => [
                [
                    'product_id' => $blackTee->id,
                    'name'       => $blackTee->name,
                    'price'      => $blackTee->price,
                    'qty'        => 3,
                ],
            ],
            'total'            => $blackTee->price * 3,
            'status'           => 'shipped',
            'customer_name'    => 'James Whitfield',
            'customer_email'   => 'james@example.com',
            'shipping_address' => "42 Baker Street\nLondon W1U 7DF\nUnited Kingdom",
        ]);
    }
}
