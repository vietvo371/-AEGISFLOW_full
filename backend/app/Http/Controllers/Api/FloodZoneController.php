<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Enums\FloodZoneRiskEnum;
use App\Enums\FloodZoneStatusEnum;
use App\Helpers\ApiResponse;
use App\Models\FloodZone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FloodZoneController extends Controller
{
    /**
     * Danh sách vùng ngập
     * GET /api/flood-zones
     */
    public function index(Request $request)
    {
        $query = FloodZone::with('district', 'sensors')
            ->active()
            ->orderBy('risk_level', 'desc');

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->district_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('risk_level')) {
            $query->where('risk_level', $request->risk_level);
        }

        $zones = $query->paginate($request->get('per_page', 20));

        $data = $zones->map(function ($zone) {
            return $this->formatZone($zone);
        });

        return ApiResponse::paginate($zones->setCollection($data));
    }

    /**
     * Chi tiết vùng ngập
     * GET /api/flood-zones/{id}
     */
    public function show(int $id)
    {
        $zone = FloodZone::with(['district', 'sensors', 'incidents', 'evacuationRoutes'])
            ->find($id);

        if (! $zone) {
            return ApiResponse::notFound('Không tìm thấy vùng ngập');
        }

        return ApiResponse::success($this->formatZone($zone, true));
    }

    /**
     * Tạo vùng ngập mới
     * POST /api/flood-zones
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|unique:flood_zones,slug',
            'description' => 'nullable|string',
            'geometry' => 'nullable|string', // GeoJSON string hoặc WKT
            'district_id' => 'nullable|exists:districts,id',
            'ward_ids' => 'nullable|array',
            'ward_ids.*' => 'exists:wards,id',
            'risk_level' => 'required|in:'.implode(',', FloodZoneRiskEnum::values()),
            'alert_threshold_m' => 'nullable|numeric|min:0',
            'danger_threshold_m' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|max:7',
            'opacity' => 'nullable|numeric|min:0|max:1',
        ]);

        $zone = FloodZone::create([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'description' => $data['description'] ?? null,
            'district_id' => $data['district_id'] ?? null,
            'ward_ids' => $data['ward_ids'] ?? null,
            'risk_level' => $data['risk_level'],
            'alert_threshold_m' => $data['alert_threshold_m'] ?? 1.5,
            'danger_threshold_m' => $data['danger_threshold_m'] ?? 3.0,
            'color' => $data['color'] ?? '#f79009',
            'opacity' => $data['opacity'] ?? 0.3,
            'is_active' => true,
            'status' => FloodZoneStatusEnum::MONITORING->value,
        ]);

        // Lưu geometry PostGIS
        if (! empty($data['geometry']) && DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                "UPDATE flood_zones SET geometry = ST_GeomFromText(?, 4326) WHERE id = ?",
                [$data['geometry'], $zone->id]
            );
        }

        return ApiResponse::created($this->formatZone($zone->fresh()));
    }

    /**
     * Cập nhật vùng ngập
     * PUT /api/flood-zones/{id}
     */
    public function update(Request $request, int $id)
    {
        $zone = FloodZone::find($id);

        if (! $zone) {
            return ApiResponse::notFound('Không tìm thấy vùng ngập');
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'geometry' => 'nullable|string',
            'district_id' => 'nullable|exists:districts,id',
            'ward_ids' => 'nullable|array',
            'risk_level' => 'nullable|in:'.implode(',', FloodZoneRiskEnum::values()),
            'current_water_level_m' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:'.implode(',', FloodZoneStatusEnum::values()),
            'alert_threshold_m' => 'nullable|numeric|min:0',
            'danger_threshold_m' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|max:7',
            'opacity' => 'nullable|numeric|min:0|max:1',
            'is_active' => 'nullable|boolean',
        ]);

        $zone->update($data);

        if (! empty($data['geometry']) && DB::connection()->getDriverName() === 'pgsql') {
            DB::statement(
                "UPDATE flood_zones SET geometry = ST_GeomFromText(?, 4326) WHERE id = ?",
                [$data['geometry'], $zone->id]
            );
        }

        return ApiResponse::success($this->formatZone($zone->fresh()), 'Cập nhật thành công');
    }

    /**
     * Xóa vùng ngập (soft delete)
     * DELETE /api/flood-zones/{id}
     */
    public function destroy(int $id)
    {
        $zone = FloodZone::find($id);

        if (! $zone) {
            return ApiResponse::notFound('Không tìm thấy vùng ngập');
        }

        $zone->delete();

        return ApiResponse::deleted('Xóa vùng ngập thành công');
    }

    /**
     * GeoJSON tất cả vùng ngập
     * GET /api/flood-zones/geojson
     */
    public function geojson(Request $request)
    {
        $query = FloodZone::active();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $zones = $query->get();

        $features = $zones->map(fn ($zone) => $zone->toGeoJson());

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }

    /**
     * Format zone response
     */
    protected function formatZone(FloodZone $zone, bool $detailed = false): array
    {
        $data = [
            'id' => $zone->id,
            'name' => $zone->name,
            'slug' => $zone->slug,
            'description' => $zone->description,
            'risk_level' => $zone->risk_level,
            'risk_level_label' => $zone->translated('risk_level'),
            'status' => $zone->status,
            'status_label' => $zone->translated('status'),
            'current_water_level_m' => $zone->current_water_level_m,
            'alert_threshold_m' => $zone->alert_threshold_m,
            'danger_threshold_m' => $zone->danger_threshold_m,
            'color' => $zone->color,
            'opacity' => $zone->opacity,
            'is_active' => $zone->is_active,
            'district' => $zone->district ? [
                'id' => $zone->district->id,
                'name' => $zone->district->name,
            ] : null,
            'sensor_count' => $zone->sensors->count(),
            'online_sensor_count' => $zone->sensors->where('status', 'online')->count(),
            'created_at' => $zone->created_at?->toIso8601String(),
            'updated_at' => $zone->updated_at?->toIso8601String(),
        ];

        // Chi tiết thêm
        if ($detailed) {
            $data['area_km2'] = $zone->area_km2;
            $data['population_affected'] = $zone->population_affected;
            $data['centroid'] = $zone->centroid_array;
            $data['sensors'] = $zone->sensors->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'type' => $s->type,
                'status' => $s->status,
                'last_value' => $s->last_value,
                'last_reading_at' => $s->last_reading_at?->toIso8601String(),
            ]);
            $data['incidents'] = $zone->incidents->map(fn ($i) => [
                'id' => $i->id,
                'title' => $i->title,
                'severity' => $i->severity,
                'status' => $i->status,
                'created_at' => $i->created_at?->toIso8601String(),
            ]);
            $data['evacuation_routes'] = $zone->evacuationRoutes->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'distance_m' => $r->distance_m,
                'is_safe' => $r->is_safe,
                'status' => $r->status,
            ]);
        }

        return $data;
    }
}
