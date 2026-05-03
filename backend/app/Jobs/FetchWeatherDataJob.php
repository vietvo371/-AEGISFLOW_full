<?php

namespace App\Jobs;

use App\Models\District;
use App\Models\Sensor;
use App\Models\WeatherData;
use App\Services\OpenWeatherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchWeatherDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function handle(OpenWeatherService $weather): void
    {
        $coords = $weather->getDistrictCoords();
        $districts = District::whereIn('id', array_keys($coords))->get()->keyBy('id');

        $fetched = 0;

        foreach ($coords as $districtId => $info) {
            $district = $districts->get($districtId);
            if (!$district) continue;

            $data = $weather->getCurrentWeather($info['lat'], $info['lon']);
            if (!$data) continue;

            // Lưu vào weather_data
            WeatherData::create(array_merge($data, ['district_id' => $districtId]));

            // Cập nhật sensors tương ứng của quận
            $this->updateSensors($districtId, $data);

            $fetched++;
        }

        Log::info("[FetchWeatherDataJob] Fetched {$fetched} districts");
    }

    private function updateSensors(int $districtId, array $data): void
    {
        $typeMap = [
            'temperature' => $data['temperature_c'],
            'humidity'    => $data['humidity_pct'],
            'rainfall'    => $data['rainfall_mm'],
        ];

        foreach ($typeMap as $type => $value) {
            if ($value === null) continue;

            // Cập nhật sensor hiện có hoặc tạo mới
            Sensor::updateOrCreate(
                [
                    'external_id' => "OWM-{$type}-{$districtId}",
                ],
                [
                    'name'             => "OpenWeather {$type} - District {$districtId}",
                    'type'             => $type,
                    'status'           => 'active',
                    'district_id'      => $districtId,
                    'last_value'       => $value,
                    'last_reading_at'  => now(),
                    'unit'             => match($type) {
                        'temperature' => '°C',
                        'humidity'    => '%',
                        'rainfall'    => 'mm',
                        default       => '',
                    },
                ]
            );
        }
    }
}
