<?php

namespace App\Providers;

use App\Services\FloodAutoDetector;
use App\Services\RecommendationGenerator;
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
        //
    }
}
