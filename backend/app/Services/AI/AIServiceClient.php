<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIServiceClient
{
    private string $baseUrl;

    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ai.url', env('AI_SERVICE_URL', 'http://localhost:5005'));
        $this->timeout = config('services.ai.timeout', env('AI_PREDICTION_TIMEOUT', 30));
    }

    /**
     * Gửi yêu cầu dự báo rủi ro ngập lụt
     */
    public function predictFloodRisk(
        float $waterLevel,
        float $rainfall,
        int $hours,
        float $tide = 0.0,
        float $history = 0.0,
        ?string $predictionTime = null,
        bool $seasonalityEnabled = true
    ): ?array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/predict-risk", [
                    'water_level_m' => $waterLevel,
                    'rainfall_mm' => $rainfall,
                    'hours_rain' => $hours,
                    'tide_level' => $tide,
                    'historical_score' => $history,
                    'prediction_time' => $predictionTime ?? now()->toIso8601String(),
                    'seasonality_enabled' => $seasonalityEnabled,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('AI Service Error (predict-risk)', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('AI Service Connection Failed (predict-risk)', ['message' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Tính toán ưu tiên cho yêu cầu cứu hộ
     */
    public function calculateRescuePriority(string $urgency, array $vulnerableGroups, int $peopleCount, ?float $waterLevel, string $createdAtIso, bool $hasIncident = false): ?array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/calculate-priority", [
                    'urgency' => $urgency,
                    'vulnerable_groups' => $vulnerableGroups,
                    'people_count' => $peopleCount,
                    'water_level_m' => $waterLevel,
                    'created_at_iso' => $createdAtIso,
                    'has_incident' => $hasIncident,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('AI Service Error (calculate-priority)', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('AI Service Connection Failed (calculate-priority)', ['message' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Chấm điểm mức độ phù hợp của shelter
     */
    public function scoreShelter(array $data): ?array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/score-shelter", $data);

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('AI Service Connection Failed (score-shelter)', ['message' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Tìm đường sơ tán an toàn
     */
    public function optimizeRoute(float $startLat, float $startLon, float $endLat, float $endLon, ?array $floodedAreas = null): ?array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/optimize-route", [
                    'start_lat' => $startLat,
                    'start_lon' => $startLon,
                    'end_lat' => $endLat,
                    'end_lon' => $endLon,
                    'flooded_areas' => $floodedAreas,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('AI Service Connection Failed (optimize-route)', ['message' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Lấy GeoJSON heatmap nguy cơ ngập nền (Flood Susceptibility, tĩnh) — proxy AI service.
     * Trả RAW body (chuỗi geo+json) để controller cache + passthrough, tránh decode→re-encode ~1.9MB mỗi request.
     */
    public function getSusceptibilityGridRaw(): ?string
    {
        try {
            $response = Http::timeout($this->timeout)->get("{$this->baseUrl}/api/susceptibility/grid");

            if ($response->successful()) {
                return $response->body();
            }

            Log::error('AI Service Error (susceptibility/grid)', ['status' => $response->status()]);

            return null;
        } catch (\Exception $e) {
            Log::error('AI Service Connection Failed (susceptibility/grid)', ['message' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Lấy GeoJSON rủi ro ĐỘNG realtime (susceptibility × mưa/nước live) — proxy AI service.
     * $simRainMm: giả lập mưa 24h (mm) cho demo; $minRisk: chỉ trả ô có rủi ro >= ngưỡng.
     */
    public function getRiskLiveGrid(?float $simRainMm = null, float $minRisk = 0.0): ?array
    {
        try {
            $query = ['min_risk' => $minRisk];
            if ($simRainMm !== null) {
                $query['sim_rain_mm'] = $simRainMm;
            }

            $response = Http::timeout($this->timeout)->get("{$this->baseUrl}/api/risk/live/grid", $query);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('AI Service Error (risk/live/grid)', ['status' => $response->status()]);

            return null;
        } catch (\Exception $e) {
            Log::error('AI Service Connection Failed (risk/live/grid)', ['message' => $e->getMessage()]);

            return null;
        }
    }
}
