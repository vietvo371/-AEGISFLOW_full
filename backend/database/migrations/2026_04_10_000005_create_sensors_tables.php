<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Sensors
        Schema::create('sensors', function (Blueprint $table) {
            $table->id();
            $table->string('external_id', 100)->unique();
            $table->string('name');
            $table->string('type', 30);
            $table->string('model', 100)->nullable();
            $table->foreignId('flood_zone_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('district_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('edge_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('online');
            $table->decimal('min_value', 10, 2)->nullable();
            $table->decimal('max_value', 10, 2)->nullable();
            $table->string('unit', 20)->default('mm');
            $table->integer('reading_interval_seconds')->default(300);
            $table->decimal('alert_threshold', 10, 2)->nullable();
            $table->decimal('danger_threshold', 10, 2)->nullable();
            $table->timestamp('last_reading_at')->nullable();
            $table->decimal('last_value', 10, 2)->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('type');
            $table->index('status');
            $table->index(['flood_zone_id', 'is_active']);
        });

        // Thêm PostGIS point
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE sensors ADD COLUMN IF NOT EXISTS geometry geometry(POINT, 4326)');
        }

        // Sensor readings (partitioned by month — chỉ cấu trúc, partition tạo riêng)
        Schema::create('sensor_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sensor_id')->constrained()->cascadeOnDelete();
            $table->timestamp('recorded_at');
            $table->decimal('value', 10, 2);
            $table->json('raw_data')->nullable();
            $table->boolean('is_anomaly')->default(false);
            $table->decimal('quality_score', 3, 2)->nullable();
            $table->string('source', 30)->default('sensor');

            $table->primary(['id', 'recorded_at']);
            $table->index(['sensor_id', 'recorded_at']);
            $table->index(['sensor_id', 'is_anomaly']);
        });

        // Weather data
        Schema::create('weather_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained()->cascadeOnDelete();
            $table->timestamp('recorded_at');
            $table->decimal('temperature_c', 5, 2)->nullable();
            $table->decimal('humidity_pct', 5, 2)->nullable();
            $table->decimal('wind_speed_kmh', 6, 2)->nullable();
            $table->string('wind_direction', 10)->nullable();
            $table->decimal('rainfall_mm', 6, 2)->nullable();
            $table->decimal('pressure_hpa', 7, 2)->nullable();
            $table->decimal('visibility_km', 6, 2)->nullable();
            $table->decimal('cloud_cover_pct', 5, 2)->nullable();
            $table->decimal('uv_index', 4, 2)->nullable();
            $table->string('source', 50)->default('openweather');
            $table->date('forecast_date')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['district_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sensor_readings');
        Schema::dropIfExists('sensors');
        Schema::dropIfExists('weather_data');
    }
};
