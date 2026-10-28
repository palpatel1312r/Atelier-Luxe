<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sends the OTP over BOTH SMS and Email per your spec ("OTP via SMS + Email both").
 * Email works out of the box with any Laravel mail driver. SMS requires one
 * more step: implement app/Channels/Msg91Channel.php (or Twilio's official
 * Laravel package) and add 'msg91' to the via() array below — left as a stub
 * because it needs your actual account credentials to test against.
 */
class OtpNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected string $otpCode) {}

    public function via($notifiable): array
    {
        $channels = [];
        if ($notifiable->email) $channels[] = 'mail';
        // $channels[] = 'msg91'; // uncomment once app/Channels/Msg91Channel.php is implemented
        return $channels;
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Login OTP')
            ->greeting("Hi {$notifiable->name},")
            ->line("Your OTP is: **{$this->otpCode}**")
            ->line('This code expires in 5 minutes.')
            ->line('If you did not request this, you can safely ignore this email.');
    }

    public function toMsg91($notifiable): array
    {
        return ['otp' => $this->otpCode];
    }
}
