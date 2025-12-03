<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClientApprovedNotification extends Notification
{
    use Queueable;

    protected $clientName;
    protected $accountId;

    /**
     * Create a new notification instance.
     */
    public function __construct($clientName, $accountId)
    {
        $this->clientName = $clientName;
        $this->accountId = $accountId;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => "Le client \"{$this->clientName}\" a été approuvé.",
            'type' => 'client_approved',
            'client_name' => $this->clientName,
            'account_id' => $this->accountId,
            'created_at' => now(),
        ];
    }
}