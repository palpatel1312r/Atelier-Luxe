<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;

/**
 * Minimal Msg91 SMS channel stub. Fill in MSG91_AUTH_KEY / MSG91_SENDER_ID /
 * MSG91_TEMPLATE_ID in .env, then this "just works" once Notification::via()
 * includes 'msg91' (see OtpNotification::via()).
 *
 * Swap the http() call for Twilio's SDK instead if you prefer Twilio —
 * same channel interface either way, nothing else in the app needs to change.
 */
class Msg91Channel
{
    public function send($notifiable, Notification $notification): void
    {
        if (!method_exists($notification, 'toMsg91')) {
            return;
        }

        $data = $notification->toMsg91($notifiable);

        \Illuminate\Support\Facades\Http::withHeaders(['authkey' => config('services.msg91.auth_key')])
            ->post('https://control.msg91.com/api/v5/flow/', [
                'flow_id' => config('services.msg91.template_id'),
                'sender' => config('services.msg91.sender_id'),
                'mobiles' => '91' . $notifiable->phone,
                'VAR1' => $data['otp'] ?? '',
            ]);
    }
}
