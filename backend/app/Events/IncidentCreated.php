<?php

namespace App\Events;

use App\Models\Incident;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Incident $incident
    ) {}

    public function broadcastOn(): array
    {
        return ['flood'];
    }

    public function broadcastAs(): string
    {
        return 'incident.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'title' => $this->incident->title,
            'type' => $this->incident->type,
            'severity' => $this->incident->severity,
            'status' => $this->incident->status,
            'address' => $this->incident->address,
            'water_level_m' => $this->incident->water_level_m,
            'district_id' => $this->incident->district_id,
            'created_at' => $this->incident->created_at?->toIso8601String(),
        ];
    }
}
