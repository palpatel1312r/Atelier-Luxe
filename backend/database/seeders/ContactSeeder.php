<?php

namespace Database\Seeders;

use App\Models\Contact;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        $messages = [
            [
                'name'    => 'Sophie Laurent',
                'email'   => 'sophie@example.com',
                'message' => 'Do you ship internationally to France? I\'d love to order the Classic White Tee.',
                'read'    => false,
            ],
            [
                'name'    => 'James Whitfield',
                'email'   => 'james@example.com',
                'message' => 'Is the Essential Black Tee restocking in size M soon?',
                'read'    => false,
            ],
            [
                'name'    => 'Amelia Ross',
                'email'   => 'amelia@example.com',
                'message' => 'Beautiful website. Just wanted to say the quality of your garments is exceptional.',
                'read'    => true,
            ],
        ];

        foreach ($messages as $m) {
            Contact::create($m);
        }
    }
}
