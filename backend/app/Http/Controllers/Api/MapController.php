<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Helpers\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MapController extends Controller
{
    /**
     * Incidents dạng GeoJSON cho map
     * GET /api/map/incidents
     */
    public function incidents(Request $request)
    {
        $query = \App\Models\Incident::active()
            ->orderBy('severity', 'desc');

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->district_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $incidents = $query->limit(200)->get();

        $features = $incidents->map(fn ($i) => $i->toGeoJson());

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    /**
     * Vùng ngập dạng GeoJSON
     * GET /api/map/flood-zones
     */
    public function floodZones(Request $request)
    {
        $query = \App\Models\FloodZone::active();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $zones = $query->get();

        $features = $zones->map(fn ($z) => $z->toGeoJson());

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    /**
     * Đội cứu hộ dạng GeoJSON
     * GET /api/map/rescue-teams
     */
    public function rescueTeams()
    {
        $teams = \App\Models\RescueTeam::whereNotNull('current_latitude')
            ->whereNotNull('current_longitude')
            ->get();

        $features = $teams->map(function ($team) {
            return [
                'type' => 'Feature',
                'id' => $team->id,
                'properties' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'status' => $team->status,
                    'team_type' => $team->team_type,
                ],
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [$team->current_longitude, $team->current_latitude],
                ],
            ];
        });

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    /**
     * Điểm trú ẩn dạng GeoJSON
     * GET /api/map/shelters
     */
    public function shelters()
    {
        $shelters = \App\Models\Shelter::open()->get();

        $features = [];
        foreach ($shelters as $shelter) {
            $location = $shelter->location;
            if ($location) {
                $features[] = [
                    'type' => 'Feature',
                    'id' => $shelter->id,
                    'properties' => [
                        'id' => $shelter->id,
                        'name' => $shelter->name,
                        'capacity' => $shelter->capacity,
                        'available_beds' => $shelter->available_beds,
                        'facilities' => $shelter->facilities ?? [],
                        'status' => $shelter->status,
                    ],
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [$location['lng'], $location['lat']],
                    ],
                ];
            }
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    /**
     * Tất cả dữ liệu map cùng lúc
     * GET /api/map/all
     */
    public function all(Request $request)
    {
        return ApiResponse::success([
            'incidents' => $this->incidents($request)->getData(),
            'flood_zones' => $this->floodZones($request)->getData(),
            'rescue_teams' => $this->rescueTeams()->getData(),
            'shelters' => $this->shelters()->getData(),
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
