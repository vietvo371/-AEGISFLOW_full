<?php

namespace App\Providers;

use App\Services\FloodAutoDetector;
use App\Services\RecommendationGenerator;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Singletons cho Services
        $this->app->singleton(FloodAutoDetector::class, function () {
            return new FloodAutoDetector();
        });

        $this->app->singleton(RecommendationGenerator::class, function () {
            return new RecommendationGenerator();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ── Rate Limiting ──────────────────────────────────────

        // API chung: 60 requests/phút cho mỗi user (hoặc IP nếu chưa login)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        // Auth endpoints: 5 requests/phút để chống brute-force
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->ip()
            );
        });

        // Sensor data ingestion: 120 requests/phút (throughput cao hơn)
        RateLimiter::for('sensor-data', function (Request $request) {
            return Limit::perMinute(120)->by(
                $request->user()?->id ?: $request->ip()
            );
        });
    }
}
