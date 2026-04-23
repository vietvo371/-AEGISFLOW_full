<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed tọa độ thực tế cho incidents, shelters, rescue_teams
 * Tọa độ thực tế tại Đà Nẵng
 */
class LocationSeeder extends Seeder
{
    public function run(): void
    {
        // ── Incidents ──────────────────────────────────────────────────────
        $incidents = [
            // Ngập đường Nguyễn Lương Bằng, Liên Chiểu
            ['title' => 'Ngập đường Nguyễn Lương Bằng', 'lat' => 16.0748, 'lng' => 108.1521],
            // Mưa lớn kéo dài quận Cẩm Lệ
            ['title' => 'Mưa lớn kéo dài quận Cẩm Lệ', 'lat' => 16.0102, 'lng' => 108.1893],
            // Cảnh báo sạt lở đồi Hòa Vang
            ['title' => 'Cảnh báo sạt lở đồi Hòa Vang', 'lat' => 15.9823, 'lng' => 108.0912],
        ];

        foreach ($incidents as $i) {
            DB::table('incidents')
                ->where('title', $i['title'])
                ->update([
                    'geometry' => DB::raw("ST_SetSRID(ST_MakePoint({$i['lng']}, {$i['lat']}), 4326)"),
                ]);
        }
        $this->command->info('✅ Incidents locations updated');

        // ── Shelters ───────────────────────────────────────────────────────
        $shelters = [
            // Trường THPT Liên Chiểu — Liên Chiểu
            ['code' => 'SHELTER-001', 'lat' => 16.0712, 'lng' => 108.1498],
            // Trường ĐH Bách Khoa — Ngũ Hành Sơn
            ['code' => 'SHELTER-002', 'lat' => 16.0039, 'lng' => 108.2062],
            // Trung tâm VHTT Cẩm Lệ
            ['code' => 'SHELTER-003', 'lat' => 16.0134, 'lng' => 108.1921],
            // Sân vận động Hòa Vang
            ['code' => 'SHELTER-004', 'lat' => 15.9756, 'lng' => 108.1234],
        ];

        foreach ($shelters as $s) {
            DB::table('shelters')
                ->where('code', $s['code'])
                ->update([
                    'geometry' => DB::raw("ST_SetSRID(ST_MakePoint({$s['lng']}, {$s['lat']}), 4326)"),
                ]);
        }
        $this->command->info('✅ Shelters locations updated');

        // ── Rescue Teams ───────────────────────────────────────────────────
        $teams = [
            // Đội PCCC Liên Chiểu
            ['code' => 'RESCUE-001', 'lat' => 16.0698, 'lng' => 108.1467],
            // Đội PCCC Cẩm Lệ
            ['code' => 'RESCUE-002', 'lat' => 16.0089, 'lng' => 108.1876],
            // Đội Y tế Đà Nẵng — Hải Châu
            ['code' => 'RESCUE-003', 'lat' => 16.0678, 'lng' => 108.2208],
            // Đội quân đội Hòa Vang
            ['code' => 'RESCUE-004', 'lat' => 15.9801, 'lng' => 108.1156],
            // Đội tình nguyện Thanh Khê
            ['code' => 'RESCUE-005', 'lat' => 16.0589, 'lng' => 108.1934],
        ];

        foreach ($teams as $t) {
            DB::table('rescue_teams')
                ->where('code', $t['code'])
                ->update([
                    'current_latitude'  => $t['lat'],
                    'current_longitude' => $t['lng'],
                    'last_location_update' => now(),
                ]);
        }
        $this->command->info('✅ Rescue teams locations updated');
    }
}
