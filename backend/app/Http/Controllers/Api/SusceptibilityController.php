<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AI\AIServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Proxy GeoJSON lớp bản đồ nguy cơ ngập từ AI service (Flood Susceptibility + realtime).
 * Giữ kiến trúc client → Laravel(:8000) → AI(:5005), không để mobile gọi thẳng AI.
 */
class SusceptibilityController extends Controller
{
    public function __construct(private AIServiceClient $ai) {}

    /** Heatmap nguy cơ ngập NỀN (tĩnh, theo địa hình/thuỷ văn). */
    public function grid(): JsonResponse
    {
        $data = $this->ai->getSusceptibilityGrid();
        if ($data === null) {
            return response()->json(
                ['type' => 'FeatureCollection', 'features' => [], 'error' => 'AI service unavailable'],
                503
            );
        }

        return response()->json($data);
    }

    /** Heatmap rủi ro ĐỘNG (susceptibility × mưa/nước live). Query: sim_rain_mm?, min_risk? */
    public function riskLive(Request $request): JsonResponse
    {
        $simRain = $request->query('sim_rain_mm');
        $minRisk = (float) $request->query('min_risk', 0.0);

        $data = $this->ai->getRiskLiveGrid(
            $simRain !== null ? (float) $simRain : null,
            $minRisk
        );
        if ($data === null) {
            return response()->json(
                ['type' => 'FeatureCollection', 'features' => [], 'error' => 'AI service unavailable'],
                503
            );
        }

        return response()->json($data);
    }
}
