<?php

namespace App\Jobs;

use App\Events\PredictionReceived;
use App\Models\FloodZone;
use App\Models\Incident;
use App\Models\Prediction;
use App\Models\Sensor;
use App\Services\RecommendationGenerator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CallAIPrediction implements ShouldQueue
{
    use Dispatchable, Queueable;

    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(
        public ?int $incidentId = null,
        public ?int $floodZoneId = null,
        public int $horizonMinutes = 60
    ) {}

    public function handle(RecommendationGenerator $generator): void
    {
        $startTime = microtime(true);

        // Tìm các cạnh/vùng cần dự báo
        $targets = $this->getPredictionTargets();

        if ($targets->isEmpty()) {
            Log::warning('CallAIPrediction: No targets found');
            return;
        }

        // Chuẩn bị dữ liệu đầu vào
        $inputData = $this->prepareInputData($targets);

        // Gọi AI service
        try {
            $response = $this->callAIService($inputData);
        } catch (\Exception $e) {
            Log::error('CallAIPrediction: AI service error', [
                'error' => $e->getMessage(),
                'incident_id' => $this->incidentId,
            ]);

            throw $e;
        }

        $processingTimeMs = (int) ((microtime(true) - $startTime) * 1000);

        // Tạo prediction record
        $prediction = $this->createPrediction($response, $processingTimeMs, $inputData);

        // Tạo prediction details cho từng vùng
        $this->createPredictionDetails($prediction, $response);

        // Broadcast event
        broadcast(new PredictionReceived($prediction))->toOthers();

        // Sinh recommendations
        $generator->generate($prediction);

        Log::info('CallAIPrediction: Prediction created', [
            'prediction_id' => $prediction->id,
            'incident_id' => $this->incidentId,
        ]);
    }

    protected function getPredictionTargets(): \Illuminate\Support\Collection
    {
        // Ưu tiên theo flood zone
        if ($this->floodZoneId) {
            return FloodZone::active()->where('id', $this->floodZoneId)->get();
        }

        // Hoặc theo incident
        if ($this->incidentId) {
            $incident = Incident::with('floodZone')->find($this->incidentId);

            if ($incident?->floodZone) {
                return collect([$incident->floodZone]);
            }

            // Lấy tất cả flood zones nếu incident không có zone cụ thể
            return FloodZone::active()->get();
        }

        return FloodZone::active()->get();
    }

    protected function prepareInputData($targets): array
    {
        $data = [];

        foreach ($targets as $target) {
            // Lấy dữ liệu sensor readings gần đây
            $recentReadings = Sensor::where('flood_zone_id', $target->id)
                ->with(['latestReadings' => fn ($q) => $q->recent(24)])
                ->get()
                ->flatMap(fn ($s) => $s->latestReadings)
                ->values();

            $latestReading = $recentReadings->sortByDesc('recorded_at')->first();

            // Lấy weather data
            $weather = \App\Models\WeatherData::where('district_id', $target->district_id)
                ->orderByDesc('recorded_at')
                ->first();

            $data[] = [
                'zone_id' => $target->id,
                'zone_name' => $target->name,
                'current_water_level_m' => $latestReading?->value ?? $target->current_water_level_m,
                'recent_readings' => $recentReadings->take(10)->map(fn ($r) => [
                    'value' => $r->value,
                    'recorded_at' => $r->recorded_at?->toIso8601String(),
                ]),
                'weather' => $weather ? [
                    'rainfall_mm' => $weather->rainfall_mm,
                    'temperature_c' => $weather->temperature_c,
                    'humidity_pct' => $weather->humidity_pct,
                ] : null,
            ];
        }

        return $data;
    }

    protected function callAIService(array $inputData): array
    {
        $url = config('services.ai.url').config('services.ai.endpoints.predict_flood');
        $timeout = config('services.ai.timeout', 30);

        $response = Http::timeout($timeout)
            ->withHeaders([
                'X-API-Key' => config('services.ai.key', ''),
                'Content-Type' => 'application/json',
            ])
            ->post($url, [
                'input_data' => $inputData,
                'horizon_minutes' => $this->horizonMinutes,
            ]);

        if (! $response->successful()) {
            throw new \Exception('AI service returned: '.$response->status());
        }

        return $response->json();
    }

    protected function createPrediction(array $aiResponse, int $processingTimeMs, array $inputData): Prediction
    {
        $model = \App\Models\AIModel::production()->first();

        $primaryResult = $aiResponse['results'][0] ?? [];

        return Prediction::create([
            'model_id' => $model?->id,
            'model_version' => $model?->version,
            'prediction_type' => $primaryResult['type'] ?? 'flood_probability',
            'flood_zone_id' => $this->floodZoneId ?? ($inputData[0]['zone_id'] ?? null),
            'district_id' => FloodZone::find($inputData[0]['zone_id'] ?? null)?->district_id,
            'incident_id' => $this->incidentId,
            'prediction_for' => now()->addMinutes($this->horizonMinutes),
            'horizon_minutes' => $this->horizonMinutes,
            'predicted_value' => $primaryResult['predicted_value'] ?? null,
            'confidence' => $primaryResult['confidence'] ?? null,
            'probability' => $primaryResult['probability'] ?? null,
            'severity' => $this->classifySeverity($primaryResult['probability'] ?? 0),
            'input_data' => $inputData,
            'processing_time_ms' => $processingTimeMs,
            'status' => 'generated',
        ]);
    }

    protected function createPredictionDetails(Prediction $prediction, array $aiResponse): void
    {
        foreach ($aiResponse['results'] ?? [] as $result) {
            \App\Models\PredictionDetail::create([
                'prediction_id' => $prediction->id,
                'entity_type' => 'flood_zone',
                'entity_id' => $result['zone_id'] ?? 0,
                'predicted_value' => $result['predicted_value'] ?? null,
                'confidence' => $result['confidence'] ?? null,
                'probability' => $result['probability'] ?? null,
                'severity' => $this->classifySeverity($result['probability'] ?? 0),
                'risk_factors' => $result['risk_factors'] ?? [],
            ]);
        }
    }

    protected function classifySeverity(float $probability): string
    {
        return match (true) {
            $probability >= 0.8 => 'critical',
            $probability >= 0.6 => 'high',
            $probability >= 0.4 => 'medium',
            default => 'low',
        };
    }
}
