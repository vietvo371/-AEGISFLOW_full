<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Helpers\ApiResponse;
use App\Models\Shelter;
use Illuminate\Http\Request;

class ShelterController extends Controller
{
    /**
     * Danh sách điểm trú ẩn
     * GET /api/shelters
     */
    public function index(Request $request)
    {
        $query = Shelter::with('district')
            ->orderBy('status')
            ->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->district_id);
        }

        if ($request->boolean('available_only')) {
            $query->open()->hasCapacity();
        }

        $shelters = $query->paginate($request->get('per_page', 20));

        $data = $shelters->map(fn ($s) => $this->formatShelter($s));

        return ApiResponse::paginate($shelters->setCollection($data));
    }

    /**
     * Chi tiết điểm trú ẩn
     * GET /api/shelters/{id}
     */
    public function show(int $id)
    {
        $shelter = Shelter::with(['district', 'district', 'supplyStocks.supply'])
            ->find($id);

        if (! $shelter) {
            return ApiResponse::notFound('Không tìm thấy điểm trú ẩn');
        }

        return ApiResponse::success($this->formatShelter($shelter, true));
    }

    /**
     * Format shelter response
     */
    protected function formatShelter(Shelter $shelter, bool $detailed = false): array
    {
        $data = [
            'id' => $shelter->id,
            'name' => $shelter->name,
            'code' => $shelter->code,
            'address' => $shelter->address,
            'location' => $shelter->location,
            'shelter_type' => $shelter->shelter_type,
            'capacity' => $shelter->capacity,
            'current_occupancy' => $shelter->current_occupancy,
            'available_beds' => $shelter->available_beds,
            'occupancy_percent' => $shelter->occupancy_percent,
            'status' => $shelter->status,
            'status_label' => $shelter->translated('status'),
            'facilities' => $shelter->facilities ?? [],
            'is_flood_safe' => $shelter->is_flood_safe,
            'district' => $shelter->district ? ['id' => $shelter->district->id, 'name' => $shelter->district->name] : null,
        ];

        if ($detailed) {
            $data['contact_phone'] = $shelter->contact_phone;
            $data['contact_name'] = $shelter->contact_name;
            $data['flood_depth_tolerance_m'] = $shelter->flood_depth_tolerance_m;
            $data['opening_hours'] = $shelter->opening_hours;
            $data['supply_stocks'] = $shelter->supplyStocks->map(fn ($stock) => [
                'supply' => [
                    'id' => $stock->supply->id,
                    'name' => $stock->supply->name,
                    'category' => $stock->supply->category,
                    'unit' => $stock->supply->unit,
                ],
                'quantity' => $stock->quantity,
                'available_quantity' => $stock->available_quantity,
            ]);
        }

        return $data;
    }
}
