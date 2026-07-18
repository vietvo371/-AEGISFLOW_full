<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AI\AIServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Proxy GeoJSON lớp bản đồ nguy cơ ngập từ AI service (Flood Susceptibility + realtime).
 * Giữ kiến trúc client → Laravel(:8000) → AI(:5005), không để mobile gọi thẳng AI.
 */
class SusceptibilityController extends Controller
{
    public function __construct(private AIServiceClient $ai) {}

    /**
     * Heatmap nguy cơ ngập NỀN (tĩnh, theo địa hình/thuỷ văn).
     * Grid là file precompute tĩnh (~1.9MB/11.5k điểm) → cache RAW body 10 phút + passthrough
     * (KHÔNG decode→re-encode) để không giữ worker PHP đồng bộ và không phụ thuộc AI mỗi request.
     */
    public function grid(): Response
    {
        $body = Cache::get('susceptibility_grid_geojson');
        if ($body === null) {
            $body = $this->ai->getSusceptibilityGridRaw();
            if ($body !== null) {
                Cache::put('susceptibility_grid_geojson', $body, now()->addMinutes(10));
            }
        }

        if ($body === null) {
            return response()->json(
                ['type' => 'FeatureCollection', 'features' => [], 'error' => 'AI service unavailable'],
                503
            );
        }

        return response($body, 200)->header('Content-Type', 'application/geo+json');
    }

    /** Heatmap rủi ro ĐỘNG (susceptibility × mưa/nước live). Query: sim_rain_mm?, min_risk? */
    public function riskLive(Request $request): JsonResponse
    {
        // Validate ngay tại proxy: input xấu → 422 (không còn giả làm "AI service unavailable" 503).
        // Chuỗi rỗng được ConvertEmptyStringsToNull đưa về null → dùng snapshot live thay vì ép mưa 0mm.
        $validated = $request->validate([
            'sim_rain_mm' => 'nullable|numeric|between:0,500',
            'min_risk' => 'nullable|numeric|between:0,1',
        ]);

        $simRain = ($validated['sim_rain_mm'] ?? null) !== null ? (float) $validated['sim_rain_mm'] : null;
        $minRisk = ($validated['min_risk'] ?? null) !== null ? (float) $validated['min_risk'] : 0.0;

        $data = $this->ai->getRiskLiveGrid($simRain, $minRisk);
        if ($data === null) {
            return response()->json(
                ['type' => 'FeatureCollection', 'features' => [], 'error' => 'AI service unavailable'],
                503
            );
        }

        return response()->json($data);
    }
}
