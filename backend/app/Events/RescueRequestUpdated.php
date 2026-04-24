<?php

namespace App\Events;

use App\Models\RescueRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RescueRequestUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public RescueRequest $rescueRequest
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('flood')
        ];
    }

    public function broadcastAs(): string
    {
        return 'RescueRequestUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->rescueRequest->id,
            'urgency' => $this->rescueRequest->urgency,
            'status' => $this->rescueRequest->status,
            'people_count' => $this->rescueRequest->people_count,
            'address' => $this->rescueRequest->address,
            'assigned_team_id' => $this->rescueRequest->assigned_team_id,
            'updated_at' => $this->rescueRequest->updated_at?->toIso8601String(),
        ];
    }
}
