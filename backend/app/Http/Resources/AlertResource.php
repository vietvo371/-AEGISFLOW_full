<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class AlertResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Extract coordinates from PostGIS geometry
        $geometry = null;
        if (DB::connection()->getDriverName() === 'pgsql') {
            $result = DB::selectOne(
                "SELECT ST_AsGeoJSON(geometry) as geojson FROM alerts WHERE id = ?",
                [$this->id]
            );
            if ($result?->geojson) {
                $geometry = json_decode($result->geojson, true);
            }
        }

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
            'geometry' => $geometry,
            'issuer' => $this->issuer ? [
                'id' => $this->issuer->id,
                'name' => $this->issuer->name
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
