<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlertResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'alert_number' => $this->alert_number,
            'title' => $this->title,
            'description' => $this->description,
            'alert_type' => $this->alert_type,
            'alert_type_label' => $this->translated('alert_type'),
            'severity' => $this->severity,
            'severity_label' => $this->translated('severity'),
            'status' => $this->status,
            'status_label' => $this->translated('status'),
            'affected_districts' => $this->affected_districts ?? [],
            'effective_from' => $this->effective_from?->toIso8601String(),
            'effective_until' => $this->effective_until?->toIso8601String(),
            'issuer' => $this->issuer ? [
                'id' => $this->issuer->id,
                'name' => $this->issuer->name
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
