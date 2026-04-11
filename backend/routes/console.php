<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks — AegisFlow AI
|--------------------------------------------------------------------------
*/

// Chạy dự báo AI mỗi 15 phút
Schedule::job(new \App\Jobs\CallAIPrediction)
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->name('ai-prediction');

// Kiểm tra sức khỏe cảm biến mỗi 10 phút
Schedule::call(function () {
    \App\Models\Sensor::where('is_active', true)
        ->where('last_reading_at', '<', now()->subMinutes(10))
        ->update(['status' => 'offline']);
})->everyTenMinutes()->name('sensor-health-check');

// Dọn dẹp predictions hết hạn (hàng ngày)
Schedule::call(function () {
    \App\Models\Prediction::where('status', 'generated')
        ->where('created_at', '<', now()->subDays(2))
        ->update(['status' => 'expired']);
})->daily()->name('cleanup-expired-predictions');

// Dọn dẹp alerts hết hạn
Schedule::call(function () {
    \App\Models\Alert::where('status', 'active')
        ->whereNotNull('effective_until')
        ->where('effective_until', '<', now())
        ->update(['status' => 'expired']);
})->hourly()->name('cleanup-expired-alerts');
