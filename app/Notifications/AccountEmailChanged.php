<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Warns the previous verified address that the sign-in email changed, so an
 * unexpected change is noticed even though recovery now goes to the new address.
 */
class AccountEmailChanged extends Notification
{
    use Queueable;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your Workbine sign-in email was changed'))
            ->line(__('The email address used to sign in to your Workbine account was just changed. This notice was sent to the previous address.'))
            ->line(__('If you made this change, no action is needed.'))
            ->line(__('If you did not, contact hello@workbine.com right away so the account can be secured.'));
    }
}
