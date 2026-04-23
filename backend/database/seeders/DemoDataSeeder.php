<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\District;
use App\Models\FloodZone;
use App\Models\Incident;
use App\Models\Prediction;
use App\Models\Recommendation;
use App\Models\RescueRequest;
use App\Models\RescueTeam;
use App\Models\Sensor;
use App\Models\SensorReading;
use App\Models\Shelter;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Seeding demo data for pitch video...');

        $now = Carbon::now();

        // === 1. Create demo sensors with readings ===
        $this->seedDemoSensors($now);

        // === 2. Create demo flood zones ===
        $this->seedDemoFloodZones();

        // === 3. Create demo incidents ===
        $this->seedDemoIncidents($now);

        // === 4. Create demo predictions ===
        $this->seedDemoPredictions($now);

        // === 5. Create demo rescue requests ===
        $this->seedDemoRescueRequests($now);

        // === 6. Create demo alerts ===
        $this->seedDemoAlerts($now);

        // === 7. Create demo recommendations ===
        $this->seedDemoRecommendations($now);

        $this->command->info('✅ Demo data seeded successfully!');
        $this->command->info('📊 Demo scenario: Da Nang flood event - April 23, 2026');
        $this->command->info('📊 Active flood zones: An Khê, Hòa Khánh, Túy Loan');
    }

    protected function seedDemoSensors(Carbon $now): void
    {
        $sensors = [
            ['code' => 'SENSOR-DN-001', 'name' => 'Trạm đo mực nước An Khê', 'sensor_type' => 'water_level', 'latitude' => 16.0606, 'longitude' => 108.1785, 'district_id' => 5, 'status' => 'online'],
            ['code' => 'SENSOR-DN-002', 'name' => 'Trạm đo mực nước Hòa Khánh', 'sensor_type' => 'water_level', 'latitude' => 16.0416, 'longitude' => 108.1052, 'district_id' => 1, 'status' => 'online'],
            ['code' => 'SENSOR-DN-003', 'name' => 'Trạm đo mực nước Túy Loan', 'sensor_type' => 'water_level', 'latitude' => 15.9933, 'longitude' => 108.1422, 'district_id' => 3, 'status' => 'online'],
            ['code' => 'SENSOR-DN-004', 'name' => 'Trạm đo mực nước Thanh Khê', 'sensor_type' => 'water_level', 'latitude' => 16.0681, 'longitude' => 108.1754, 'district_id' => 5, 'status' => 'online'],
            ['code' => 'SENSOR-DN-005', 'name' => 'Trạm đo mưa Hải Châu', 'sensor_type' => 'rainfall', 'latitude' => 16.0627, 'longitude' => 108.2232, 'district_id' => 4, 'status' => 'online'],
        ];

        foreach ($sensors as $sensorData) {
            $sensor = Sensor::firstOrCreate(['code' => $sensorData['code']], $sensorData);

            // Create readings for the past 6 hours
            for ($i = 6; $i >= 0; $i--) {
                $readingTime = $now->copy()->subHours($i);

                if ($sensorData['sensor_type'] === 'water_level') {
                    // Simulate rising water levels
                    $baseLevel = match ($sensorData['code']) {
                        'SENSOR-DN-001' => 1.8 + ($i <= 3 ? (3 - $i) * 0.3 : 0),  // Rising at An Khê
                        'SENSOR-DN-002' => 2.1 + ($i <= 3 ? (3 - $i) * 0.4 : 0),  // Rising at Hòa Khánh
                        'SENSOR-DN-003' => 1.5 + ($i <= 3 ? (3 - $i) * 0.2 : 0),  // Rising at Túy Loan
                        'SENSOR-DN-004' => 0.9 + ($i <= 3 ? (3 - $i) * 0.2 : 0),  // Rising at Thanh Khê
                        default => 1.0,
                    };
                    $value = $baseLevel + (rand(-10, 10) / 100);
                } else {
                    // Rainfall readings
                    $baseRain = match ($sensorData['code']) {
                        'SENSOR-DN-005' => 25.0 + ($i <= 3 ? (4 - $i) * 8 : 0),
                        default => 15.0 + ($i <= 3 ? (4 - $i) * 5 : 0),
                    };
                    $value = max(0, $baseRain + (rand(-5, 15) / 10));
                }

                SensorReading::firstOrCreate(
                    [
                        'sensor_id' => $sensor->id,
                        'recorded_at' => $readingTime,
                    ],
                    [
                        'value' => round($value, 3),
                        'unit' => $sensorData['sensor_type'] === 'water_level' ? 'm' : 'mm',
                        'quality_score' => 0.95,
                    ]
                );
            }
        }

        $this->command->info('   ✅ Sensors: ' . count($sensors) . ' sensors with readings');
    }

    protected function seedDemoFloodZones(): void
    {
        $zones = [
            [
                'name' => 'Vùng ngập An Khê',
                'code' => 'FZ-001',
                'severity_level' => 'high',
                'risk_score' => 78,
                'description' => 'Khu vực trũng thấp phường An Khê, quận Thanh Khê',
                'coordinates' => json_encode([
                    ['lat' => 16.058, 'lng' => 108.175],
                    ['lat' => 16.062, 'lng' => 108.180],
                    ['lat' => 16.065, 'lng' => 108.178],
                    ['lat' => 16.061, 'lng' => 108.172],
                ]),
                'district_id' => 5,
            ],
            [
                'name' => 'Vùng ngập Hòa Khánh',
                'code' => 'FZ-002',
                'severity_level' => 'critical',
                'risk_score' => 85,
                'description' => 'Khu vực trũng quận Liên Chiểu, gần cầu Trường Định',
                'coordinates' => json_encode([
                    ['lat' => 16.040, 'lng' => 108.100],
                    ['lat' => 16.048, 'lng' => 108.108],
                    ['lat' => 16.052, 'lng' => 108.105],
                    ['lat' => 16.044, 'lng' => 108.098],
                ]),
                'district_id' => 1,
            ],
            [
                'name' => 'Vùng ngập Túy Loan',
                'code' => 'FZ-003',
                'severity_level' => 'medium',
                'risk_score' => 55,
                'description' => 'Khu vực nông thôn xã Hòa Phong, huyện Hòa Vang',
                'coordinates' => json_encode([
                    ['lat' => 15.990, 'lng' => 108.138],
                    ['lat' => 15.997, 'lng' => 108.145],
                    ['lat' => 16.001, 'lng' => 108.142],
                    ['lat' => 15.994, 'lng' => 108.136],
                ]),
                'district_id' => 3,
            ],
        ];

        foreach ($zones as $zoneData) {
            FloodZone::firstOrCreate(['code' => $zoneData['code']], array_merge($zoneData, [
                'status' => 'active',
                'is_active' => true,
            ]));
        }

        $this->command->info('   ✅ Flood Zones: ' . count($zones) . ' active zones');
    }

    protected function seedDemoIncidents(Carbon $now): void
    {
        $incidents = [
            [
                'title' => 'Mực nước vượt ngưỡng cảnh báo tại An Khê',
                'type' => 'flood',
                'severity' => 'high',
                'status' => 'responding',
                'source' => 'sensor',
                'address' => 'Khu vực An Khê, Thanh Khê, Đà Nẵng',
                'district_id' => 5,
                'description' => 'Mực nước đo được 1.8m, vượt ngưỡng cảnh báo 1.5m. Đang có xu hướng tăng.',
            ],
            [
                'title' => 'Ngập nặng đường Nguyễn Lương Bằng - Hòa Khánh',
                'type' => 'flood',
                'severity' => 'critical',
                'status' => 'responding',
                'source' => 'citizen',
                'address' => '123 Nguyễn Lương Bằng, Liên Chiểu, Đà Nẵng',
                'district_id' => 1,
                'description' => 'Nhiều hộ dân bị ngập, nước dâng cao 0.6m trên mặt đường. Có người mắc kẹt tầng trệt.',
            ],
            [
                'title' => 'Cảnh báo sớm Túy Loan - mưa lớn kéo dài',
                'type' => 'heavy_rain',
                'severity' => 'medium',
                'status' => 'verified',
                'source' => 'operator',
                'address' => 'Khu vực Túy Loan, Hòa Vang, Đà Nẵng',
                'district_id' => 3,
                'description' => 'Lượng mưa tích lũy 120mm/6h. Ngưỡng cảnh báo 100mm/6h. Cần theo dõi.',
            ],
        ];

        foreach ($incidents as $index => $incData) {
            Incident::firstOrCreate(
                ['title' => $incData['title']],
                array_merge($incData, [
                    'created_at' => $now->copy()->subMinutes(45 + ($index * 15)),
                ])
            );
        }

        $this->command->info('   ✅ Incidents: ' . count($incidents) . ' active incidents');
    }

    protected function seedDemoPredictions(Carbon $now): void
    {
        $aiModel = \App\Models\AIModel::firstOrCreate(
            ['slug' => 'flood-risk-rf-v1'],
            [
                'name' => 'RandomForest Flood Risk Classifier',
                'model_type' => 'random_forest',
                'version' => 'v1.0.0',
                'framework' => 'scikit-learn',
                'output_type' => 'flood_risk',
                'is_production' => true,
                'is_active' => true,
            ]
        );

        $predictions = [
            [
                'title' => 'Dự báo ngập CRITICAL - Hòa Khánh',
                'prediction_type' => 'flood_risk',
                'severity' => 'critical',
                'predicted_value' => 82,
                'probability' => 0.85,
                'confidence' => 0.87,
                'risk_level' => 'critical',
                'flood_zone_id' => FloodZone::where('code', 'FZ-002')->first()?->id,
                'district_id' => 1,
                'input_data' => json_encode(['water_level_m' => 2.1, 'rainfall_mm' => 95.5, 'hours_rain' => 6]),
            ],
            [
                'title' => 'Dự báo ngập HIGH - An Khê',
                'prediction_type' => 'flood_risk',
                'severity' => 'high',
                'predicted_value' => 68,
                'probability' => 0.72,
                'confidence' => 0.82,
                'risk_level' => 'high',
                'flood_zone_id' => FloodZone::where('code', 'FZ-001')->first()?->id,
                'district_id' => 5,
                'input_data' => json_encode(['water_level_m' => 1.8, 'rainfall_mm' => 75.0, 'hours_rain' => 5]),
            ],
            [
                'title' => 'Dự báo ngập MEDIUM - Túy Loan',
                'prediction_type' => 'flood_risk',
                'severity' => 'medium',
                'predicted_value' => 45,
                'probability' => 0.55,
                'confidence' => 0.78,
                'risk_level' => 'medium',
                'flood_zone_id' => FloodZone::where('code', 'FZ-003')->first()?->id,
                'district_id' => 3,
                'input_data' => json_encode(['water_level_m' => 1.2, 'rainfall_mm' => 55.0, 'hours_rain' => 4]),
            ],
        ];

        foreach ($predictions as $index => $predData) {
            Prediction::firstOrCreate(
                ['title' => $predData['title']],
                array_merge($predData, [
                    'ai_model_id' => $aiModel->id,
                    'model_version' => 'v1.0.0',
                    'status' => 'issued',
                    'horizon_minutes' => 60,
                    'prediction_for' => $now->copy()->addMinutes(60),
                    'issued_at' => $now->copy()->subMinutes(5),
                    'created_at' => $now->copy()->subMinutes(5 + ($index * 2)),
                ])
            );
        }

        $this->command->info('   ✅ Predictions: ' . count($predictions) . ' AI predictions');
    }

    protected function seedDemoRescueRequests(Carbon $now): void
    {
        $teams = RescueTeam::whereIn('code', ['RESCUE-001', 'RESCUE-002'])->get();

        $requests = [
            [
                'caller_name' => 'Nguyễn Thị Mai',
                'caller_phone' => '0901234567',
                'urgency' => 'critical',
                'category' => 'rescue',
                'people_count' => 4,
                'vulnerable_groups' => ['children', 'elderly'],
                'address' => '45 Nguyễn Lương Bằng, Liên Chiểu, Đà Nẵng',
                'latitude' => 16.0416,
                'longitude' => 108.1052,
                'district_id' => 1,
                'status' => 'pending',
                'water_level_m' => 0.8,
                'notes' => 'Gia đình có 2 trẻ nhỏ (< 10 tuổi) và 1 bà cụ (72 tuổi). Nước đang dâng cao.',
            ],
            [
                'caller_name' => 'Trần Văn Hùng',
                'caller_phone' => '0912345678',
                'urgency' => 'high',
                'category' => 'medical',
                'people_count' => 2,
                'vulnerable_groups' => ['elderly'],
                'address' => '78 Đường số 3, An Khê, Thanh Khê',
                'latitude' => 16.0606,
                'longitude' => 108.1785,
                'district_id' => 5,
                'status' => 'pending',
                'water_level_m' => 0.6,
                'notes' => 'Ông bà 68 tuổi, bệnh tim. Cần hỗ trợ y tế khẩn cấp.',
            ],
            [
                'caller_name' => 'Lê Thị Hương',
                'caller_phone' => '0934567890',
                'urgency' => 'medium',
                'category' => 'evacuation',
                'people_count' => 6,
                'vulnerable_groups' => [],
                'address' => 'Khu phố 5, Hòa Phong, Hòa Vang',
                'latitude' => 15.9933,
                'longitude' => 108.1422,
                'district_id' => 3,
                'status' => 'pending',
                'water_level_m' => 0.3,
                'notes' => 'Gia đình 6 người muốn di chuyển đến nơi an toàn.',
            ],
        ];

        $priorityScores = [92, 78, 45];  // Calculated based on vulnerable groups, urgency, etc.

        foreach ($requests as $index => $reqData) {
            $req = RescueRequest::firstOrCreate(
                ['caller_phone' => $reqData['caller_phone']],
                array_merge($reqData, [
                    'request_number' => 'REQ-20260423-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                    'priority_score' => $priorityScores[$index],
                    'created_at' => $now->copy()->subMinutes(30 - ($index * 8)),
                ])
            );
        }

        $this->command->info('   ✅ Rescue Requests: ' . count($requests) . ' pending requests');
    }

    protected function seedDemoAlerts(Carbon $now): void
    {
        $alerts = [
            [
                'title' => '🚨 CẢNH BÁO NGẬP CẤP ĐỘ CAO - KHU VỰC HÒA KHÁNH',
                'alert_type' => 'flood_warning',
                'severity' => 'high',
                'message' => 'Mực nước tại khu vực Hòa Khánh đã vượt ngưỡng 2.0m. Nguy cơ ngập cao. Cư dân vùng trũng khẩn trương sơ tán.',
                'target_audience' => 'citizens',
                'status' => 'active',
                'scope' => 'regional',
                'district_id' => 1,
            ],
            [
                'title' => '⚠️ CẢNH BÁO SỚM - NGUY CƠ NGẬP TẠI AN KHÊ',
                'alert_type' => 'flood_warning',
                'severity' => 'medium',
                'message' => 'Dự báo mực nước tiếp tục tăng trong 2 giờ tới. Người dân khu vực An Khê chú ý theo dõi và chuẩn bị phương án sơ tán.',
                'target_audience' => 'citizens',
                'status' => 'active',
                'scope' => 'regional',
                'district_id' => 5,
            ],
            [
                'title' => '📢 THÔNG BÁO CHO ĐỘI CỨU HỘ - TRIỂN KHAI KHẨN',
                'alert_type' => 'rescue_dispatch',
                'severity' => 'high',
                'message' => 'Điều động Đội cứu hộ PCCC Liên Chiểu đến khu vực Hòa Khánh. Có 2 vụ yêu cầu cứu hộ khẩn cấp đang chờ.',
                'target_audience' => 'rescue_teams',
                'status' => 'active',
                'scope' => 'operational',
            ],
        ];

        foreach ($alerts as $index => $alertData) {
            Alert::firstOrCreate(
                ['title' => $alertData['title']],
                array_merge($alertData, [
                    'issued_by' => User::first()?->id,
                    'created_at' => $now->copy()->subMinutes(20 - ($index * 5)),
                ])
            );
        }

        $this->command->info('   ✅ Alerts: ' . count($alerts) . ' active alerts');
    }

    protected function seedDemoRecommendations(Carbon $now): void
    {
        $incident = Incident::where('title', 'Ngập nặng đường Nguyễn Lương Bằng - Hòa Khánh')->first();
        $prediction = Prediction::where('title', 'LIKE', '%Hòa Khánh%')->first();

        $recommendations = [
            [
                'type' => 'rescue_dispatch',
                'description' => 'Điều động Đội PCCC Liên Chiểu (RESCUE-001) đến 45 Nguyễn Lương Bằng, Liên Chiểu. Ưu tiên: 4 người bao gồm 2 trẻ em và 1 người cao tuổi.',
                'status' => 'pending',
                'confidence_score' => 0.87,
                'reasoning' => json_encode([
                    'urgency: critical (+30 pts)',
                    'vulnerable: children+elderly (+25 pts)',
                    'water_level: 0.8m (+10 pts)',
                    'wait_time: 25 min (+4 pts)',
                ]),
                'incident_id' => $incident?->id,
                'prediction_id' => $prediction?->id,
            ],
            [
                'type' => 'evacuation',
                'description' => 'Khuyến nghị sơ tán khu vực bán kính 500m quanh 45 Nguyễn Lương Bằng. Nguy cơ ngập mở rộng trong 30 phút tới.',
                'status' => 'pending',
                'confidence_score' => 0.82,
                'reasoning' => json_encode([
                    'water_level_rising: +0.3m/h',
                    'predicted_reach: 500m in 30min',
                    'shelter_capacity: 800m away',
                ]),
                'incident_id' => $incident?->id,
                'prediction_id' => $prediction?->id,
            ],
            [
                'type' => 'alert',
                'description' => 'Gửi cảnh báo ngập mức HIGH đến 1,200 hộ dân khu vực Hòa Khánh qua ứng dụng di động.',
                'status' => 'approved',
                'confidence_score' => 0.95,
                'reasoning' => json_encode([
                    'sensor_confirmed: water_level > 2.0m',
                    'multiple_reports: 3 citizen reports',
                    'prediction_confirmed: risk_score 82/100',
                ]),
                'incident_id' => $incident?->id,
                'prediction_id' => $prediction?->id,
            ],
        ];

        foreach ($recommendations as $index => $recData) {
            Recommendation::firstOrCreate(
                ['description' => substr($recData['description'], 0, 50)],
                array_merge($recData, [
                    'created_at' => $now->copy()->subMinutes(15 - ($index * 3)),
                ])
            );
        }

        $this->command->info('   ✅ Recommendations: ' . count($recommendations) . ' AI recommendations');
    }
}
