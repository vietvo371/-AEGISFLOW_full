<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\AIModel;
use App\Models\Incident;
use App\Models\Prediction;
use App\Models\RescueRequest;
use App\Models\RescueTeam;
use App\Models\Shelter;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedShelters();
        $this->seedRescueTeams();
        $this->seedAIModels();
        $this->seedIncidents();
        $this->seedRescueRequests();
    }

    protected function seedShelters(): void
    {
        $shelters = [
            ['name' => 'Trường THPT Liên Chiểu', 'code' => 'SHELTER-001',
             'address' => '123 Nguyễn Lương Bằng, Liên Chiểu, Đà Nẵng',
             'shelter_type' => 'school', 'capacity' => 500, 'current_occupancy' => 45,
             'facilities' => ['food', 'water', 'medical', 'electricity', 'toilet'],
             'is_flood_safe' => true, 'district_id' => 1],
            ['name' => 'Trường ĐH Bách Khoa', 'code' => 'SHELTER-002',
             'address' => '54 Nguyễn Lương Bằng, Đà Nẵng',
             'shelter_type' => 'school', 'capacity' => 1000, 'current_occupancy' => 120,
             'facilities' => ['food', 'water', 'medical', 'electricity', 'toilet', 'shelter'],
             'is_flood_safe' => true, 'district_id' => 2],
            ['name' => 'Trung tâm VHTT Cẩm Lệ', 'code' => 'SHELTER-003',
             'address' => '456 Đường 2/9, Cẩm Lệ, Đà Nẵng',
             'shelter_type' => 'community_center', 'capacity' => 300, 'current_occupancy' => 20,
             'facilities' => ['food', 'water', 'medical'],
             'is_flood_safe' => true, 'district_id' => 2],
            ['name' => 'Sân vận động Hòa Vang', 'code' => 'SHELTER-004',
             'address' => '78 Quang Trung, Hòa Vang, Đà Nẵng',
             'shelter_type' => 'stadium', 'capacity' => 2000, 'current_occupancy' => 0,
             'facilities' => ['food', 'water', 'medical', 'electricity', 'toilet'],
             'is_flood_safe' => true, 'district_id' => 3],
        ];

        foreach ($shelters as $s) {
            Shelter::firstOrCreate(['code' => $s['code']], array_merge($s, [
                'status' => 'open',
                'is_flood_safe' => true,
            ]));
        }

        $this->command->info('✅ Shelters: '.count($shelters));
    }

    protected function seedRescueTeams(): void
    {
        $teams = [
            ['name' => 'Đội cứu hộ PCCC Liên Chiểu', 'code' => 'RESCUE-001',
             'team_type' => 'fire', 'district_id' => 1,
             'specializations' => ['flood_rescue', 'first_aid', 'water_pump'],
             'personnel_count' => 25, 'vehicle_count' => 5, 'status' => 'available'],
            ['name' => 'Đội cứu hộ PCCC Cẩm Lệ', 'code' => 'RESCUE-002',
             'team_type' => 'fire', 'district_id' => 2,
             'specializations' => ['flood_rescue', 'first_aid'],
             'personnel_count' => 20, 'vehicle_count' => 4, 'status' => 'available'],
            ['name' => 'Đội Y tế Đà Nẵng', 'code' => 'RESCUE-003',
             'team_type' => 'medical', 'district_id' => null,
             'specializations' => ['first_aid', 'medical_evacuation', 'triage'],
             'personnel_count' => 30, 'vehicle_count' => 6, 'status' => 'available'],
            ['name' => 'Đội quân đội Hòa Vang', 'code' => 'RESCUE-004',
             'team_type' => 'military', 'district_id' => 3,
             'specializations' => ['flood_rescue', 'logistics', 'evacuation'],
             'personnel_count' => 50, 'vehicle_count' => 10, 'status' => 'available'],
            ['name' => 'Đội tình nguyện Thanh Khê', 'code' => 'RESCUE-005',
             'team_type' => 'volunteer', 'district_id' => 5,
             'specializations' => ['food_distribution', 'shelter_support', 'first_aid'],
             'personnel_count' => 40, 'vehicle_count' => 2, 'status' => 'available'],
        ];

        foreach ($teams as $t) {
            RescueTeam::firstOrCreate(['code' => $t['code']], $t);
        }

        $this->command->info('✅ RescueTeams: '.count($teams));
    }

    protected function seedAIModels(): void
    {
        $models = [
            ['name' => 'LSTM Water Level Predictor', 'slug' => 'water-level-lstm',
             'model_type' => 'lstm', 'version' => 'v1.0', 'framework' => 'TensorFlow',
             'output_type' => 'water_level', 'description' => 'Dự báo mực nước bằng LSTM',
             'input_features' => ['sensor_readings_24h', 'weather_data', 'historical_flood'],
             'is_production' => true],
            ['name' => 'CNN Rainfall Classifier', 'slug' => 'rainfall-cnn',
             'model_type' => 'cnn', 'version' => 'v1.2', 'framework' => 'PyTorch',
             'output_type' => 'rainfall', 'description' => 'Phân loại cường độ mưa',
             'input_features' => ['radar_image', 'satellite_image'],
             'is_production' => false],
            ['name' => 'Flood Risk Ensemble', 'slug' => 'flood-risk-ensemble',
             'model_type' => 'ensemble', 'version' => 'v1.0', 'framework' => 'Scikit-learn',
             'output_type' => 'flood_probability', 'description' => 'Ensemble model dự báo ngập',
             'input_features' => ['water_level', 'rainfall', 'tide_level', 'topography'],
             'is_production' => true],
            ['name' => 'Rule-based Alert Engine', 'slug' => 'alert-rule-engine',
             'model_type' => 'rule', 'version' => 'v2.0', 'framework' => 'Python',
             'output_type' => 'alert', 'description' => 'Engine sinh cảnh báo từ rules',
             'input_features' => ['thresholds', 'sensor_data'],
             'is_production' => true],
        ];

        foreach ($models as $m) {
            AIModel::firstOrCreate(['slug' => $m['slug']], array_merge($m, [
                'is_active' => $m['is_production'],
            ]));
        }

        $this->command->info('✅ AIModels: '.count($models));
    }

    protected function seedIncidents(): void
    {
        $incidents = [
            ['title' => 'Ngập đường Nguyễn Lương Bằng', 'type' => 'flood', 'severity' => 'high',
             'status' => 'responding', 'source' => 'citizen',
             'address' => '123 Nguyễn Lương Bằng, Liên Chiểu', 'district_id' => 1,
             'water_level_m' => 0.8, 'reported_by' => 1],
            ['title' => 'Mưa lớn kéo dài quận Cẩm Lệ', 'type' => 'heavy_rain', 'severity' => 'medium',
             'status' => 'verified', 'source' => 'sensor',
             'address' => 'Khu vực Cẩm Lệ', 'district_id' => 2,
             'rainfall_mm' => 85.5, 'reported_by' => 1],
            ['title' => 'Cảnh báo sạt lở đồi Hòa Vang', 'type' => 'landslide', 'severity' => 'critical',
             'status' => 'responding', 'source' => 'operator',
             'address' => 'Đường đèo Hòa Vang', 'district_id' => 3,
             'reported_by' => 2],
        ];

        foreach ($incidents as $i) {
            Incident::firstOrCreate(
                ['title' => $i['title']],
                array_merge($i, ['created_at' => now()->subHours(rand(1, 48))])
            );
        }

        $this->command->info('✅ Incidents: '.count($incidents));
    }

    protected function seedRescueRequests(): void
    {
        $requests = [
            ['caller_name' => 'Nguyễn Thị Lan', 'urgency' => 'high', 'category' => 'rescue',
             'people_count' => 3, 'vulnerable_groups' => ['children'],
             'address' => '45 Đường số 5, Liên Chiểu', 'district_id' => 1,
             'status' => 'pending', 'reported_by' => 5],
            ['caller_name' => 'Trần Văn Minh', 'urgency' => 'medium', 'category' => 'food',
             'people_count' => 10,
             'address' => '78 Phố Hòa Khánh, Cẩm Lệ', 'district_id' => 2,
             'status' => 'assigned', 'reported_by' => 5],
            ['caller_name' => 'Lê Hoàng Nam', 'urgency' => 'critical', 'category' => 'medical',
             'people_count' => 1, 'vulnerable_groups' => ['elderly'],
             'address' => '12 Đường 2/9, Hải Châu', 'district_id' => 4,
             'status' => 'in_progress', 'reported_by' => 4],
        ];

        foreach ($requests as $index => $r) {
            RescueRequest::firstOrCreate(
                ['caller_name' => $r['caller_name'], 'address' => $r['address']],
                array_merge($r, [
                    'request_number' => 'REQ-' . date('Ymd') . '-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                    'created_at' => now()->subHours(rand(1, 12))
                ])
            );
        }

        $this->command->info('✅ RescueRequests: '.count($requests));
    }
}
