<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Districts
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 10)->unique();
            $table->bigInteger('population')->nullable();
            $table->decimal('area_km2', 10, 2)->nullable();
            $table->string('risk_level', 20)->nullable();
            $table->timestamps();
        });

        // Wards
        Schema::create('wards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 10)->unique();
            $table->bigInteger('population')->nullable();
            $table->timestamps();
        });

        // Thêm PostGIS boundary (chạy riêng sau migrate)
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE districts ADD COLUMN IF NOT EXISTS boundary geometry(POLYGON, 4326)');
            DB::statement('ALTER TABLE wards ADD COLUMN IF NOT EXISTS boundary geometry(POLYGON, 4326)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wards');
        Schema::dropIfExists('districts');
    }
};
