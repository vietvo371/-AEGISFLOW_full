<?php

use App\Enums\AlertTypeEnum;
use App\Enums\RecommendationTypeEnum;
use App\Helpers\ApiResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — AegisFlow AI
|--------------------------------------------------------------------------
*/

// ============================================================
// PUBLIC ROUTES (Không cần đăng nhập)
// ============================================================
Route::prefix('public')->group(function () {
    Route::get('incidents', [App\Http\Controllers\Api\IncidentController::class, 'publicList']);
    Route::get('flood-zones/geojson', [App\Http\Controllers\Api\FloodZoneController::class, 'geojson']);
    Route::get('alerts/geojson', [App\Http\Controllers\Api\AlertController::class, 'geojson']);
});

// ============================================================
// AUTH ROUTES
// ============================================================
Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('login', [App\Http\Controllers\Api\AuthController::class, 'login']);
        Route::post('register', [App\Http\Controllers\Api\AuthController::class, 'register']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [App\Http\Controllers\Api\AuthController::class, 'me']);
        Route::put('profile', [App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
        Route::post('change-password', [App\Http\Controllers\Api\AuthController::class, 'changePassword']);
        Route::post('fcm-token', [App\Http\Controllers\Api\AuthController::class, 'updateFcmToken']);
        Route::post('logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);
        Route::post('refresh', [App\Http\Controllers\Api\AuthController::class, 'refresh']);
    });
});

// ============================================================
// AUTHENTICATED ROUTES (Cần đăng nhập)
// ============================================================
Route::middleware('auth:sanctum')->group(function () {

    // ── Incidents ──────────────────────────────────────────
    Route::apiResource('incidents', App\Http\Controllers\Api\IncidentController::class)
        ->only('index', 'show', 'store', 'update');

    // ── Rescue Requests ─────────────────────────────────────
    Route::apiResource('rescue-requests', App\Http\Controllers\Api\RescueRequestController::class)
        ->only('index', 'show', 'store', 'update');
    Route::get('rescue-requests/pending', [App\Http\Controllers\Api\RescueRequestController::class, 'pending']);
    Route::put('rescue-requests/{id}/assign', [App\Http\Controllers\Api\RescueRequestController::class, 'assign']);
    Route::put('rescue-requests/{id}/status', [App\Http\Controllers\Api\RescueRequestController::class, 'updateStatus']);
    Route::post('rescue-requests/{id}/rate', [App\Http\Controllers\Api\RescueRequestController::class, 'rate']);

    // ── Flood Zones ─────────────────────────────────────────
    Route::apiResource('flood-zones', App\Http\Controllers\Api\FloodZoneController::class)
        ->only('index', 'show', 'store', 'update', 'destroy');
    Route::get('flood-zones/geojson', [App\Http\Controllers\Api\FloodZoneController::class, 'geojson']);

    // ── Sensors ─────────────────────────────────────────────
    Route::get('sensors', [App\Http\Controllers\Api\SensorController::class, 'index']);
    Route::get('sensors/{id}', [App\Http\Controllers\Api\SensorController::class, 'show']);
    Route::get('sensors/{id}/readings', [App\Http\Controllers\Api\SensorController::class, 'readings']);

    // ── Weather Data ───────────────────────────────────────
    Route::get('weather/current', [App\Http\Controllers\Api\WeatherDataController::class, 'current']);
    Route::get('weather/history', [App\Http\Controllers\Api\WeatherDataController::class, 'history']);
    Route::get('weather/summary', [App\Http\Controllers\Api\WeatherDataController::class, 'summary']);

    // ── Rescue Teams ────────────────────────────────────────
    Route::apiResource('rescue-teams', App\Http\Controllers\Api\RescueTeamController::class)
        ->only('index', 'show');
    Route::put('rescue-teams/{id}/location', [App\Http\Controllers\Api\RescueTeamController::class, 'updateLocation']);

    // ── Shelters ───────────────────────────────────────────
    Route::apiResource('shelters', App\Http\Controllers\Api\ShelterController::class)
        ->only('index', 'show');

    // ── Predictions ─────────────────────────────────────────
    Route::get('predictions', [App\Http\Controllers\Api\PredictionController::class, 'index']);
    Route::get('predictions/{id}', [App\Http\Controllers\Api\PredictionController::class, 'show']);
    Route::put('predictions/{id}/verify', [App\Http\Controllers\Api\PredictionController::class, 'verify']);

    // ── Recommendations ──────────────────────────────────────
    Route::get('recommendations', [App\Http\Controllers\Api\RecommendationController::class, 'index']);
    Route::get('recommendations/{id}', [App\Http\Controllers\Api\RecommendationController::class, 'show']);
    Route::put('recommendations/{id}/approve', [App\Http\Controllers\Api\RecommendationController::class, 'approve']);
    Route::put('recommendations/{id}/reject', [App\Http\Controllers\Api\RecommendationController::class, 'reject']);

    // ── Alerts ──────────────────────────────────────────────
    Route::apiResource('alerts', App\Http\Controllers\Api\AlertController::class)
        ->only('index', 'show', 'store', 'update');
    Route::put('alerts/{id}/status', [App\Http\Controllers\Api\AlertController::class, 'updateStatus']);

    // ── Notifications ──────────────────────────────────────
    Route::get('notifications', [App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::get('notifications/unread', [App\Http\Controllers\Api\NotificationController::class, 'unread']);
    Route::get('notifications/unread-count', [App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
    Route::put('notifications/{id}/read', [App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::put('notifications/read-all', [App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);

    // ── Map ────────────────────────────────────────────────
    Route::prefix('map')->group(function () {
        Route::get('all', [App\Http\Controllers\Api\MapController::class, 'all']);
        Route::get('incidents', [App\Http\Controllers\Api\MapController::class, 'incidents']);
        Route::get('flood-zones', [App\Http\Controllers\Api\MapController::class, 'floodZones']);
        Route::get('rescue-teams', [App\Http\Controllers\Api\MapController::class, 'rescueTeams']);
        Route::get('shelters', [App\Http\Controllers\Api\MapController::class, 'shelters']);
        Route::get('flood-reports', [App\Http\Controllers\Api\MapController::class, 'floodReports']);
        Route::get('sensor-stations', [App\Http\Controllers\Api\MapController::class, 'sensorStations']);
        Route::get('flood-events', [App\Http\Controllers\Api\MapController::class, 'floodEvents']);
    });

    // ── Analytics ──────────────────────────────────────────
    Route::get('analytics/overview', [App\Http\Controllers\Api\AnalyticsController::class, 'overview']);

    // ── Evacuation Routes ──────────────────────────────────
    Route::get('evacuation-routes', [App\Http\Controllers\Api\EvacuationRouteController::class, 'index']);
    Route::get('evacuation-routes/{id}', [App\Http\Controllers\Api\EvacuationRouteController::class, 'show']);

    // ============================================================
    // OPERATOR ROUTES (role: city_admin, rescue_operator)
    // ============================================================
    Route::middleware('role_or_permission:city_admin,rescue_operator')->group(function () {

        // Trigger AI prediction
        Route::post('predictions/trigger', [App\Http\Controllers\Api\PredictionController::class, 'trigger']);

        // Sensor data ingestion
        Route::post('sensor-data', [App\Http\Controllers\Api\SensorDataController::class, 'ingest']);
        Route::post('sensor-data/batch', [App\Http\Controllers\Api\SensorDataController::class, 'batchIngest']);

        // CRUD Flood Zones
        Route::apiResource('flood-zones', App\Http\Controllers\Api\FloodZoneController::class)
            ->only('store', 'update', 'destroy');

        // CRUD Alerts
        Route::apiResource('alerts', App\Http\Controllers\Api\AlertController::class)
            ->only('store', 'update');

        // CRUD Rescue Requests (quản lý)
        Route::put('rescue-requests/{id}/assign', [App\Http\Controllers\Api\RescueRequestController::class, 'assign']);
        Route::put('rescue-requests/{id}/status', [App\Http\Controllers\Api\RescueRequestController::class, 'updateStatus']);

        // Weather data ingestion
        Route::post('weather', [App\Http\Controllers\Api\WeatherDataController::class, 'store']);
        Route::post('weather/batch', [App\Http\Controllers\Api\WeatherDataController::class, 'batchStore']);

        // CRUD Evacuation Routes
        Route::post('evacuation-routes', [App\Http\Controllers\Api\EvacuationRouteController::class, 'store']);
        Route::put('evacuation-routes/{id}', [App\Http\Controllers\Api\EvacuationRouteController::class, 'update']);
        Route::delete('evacuation-routes/{id}', [App\Http\Controllers\Api\EvacuationRouteController::class, 'destroy']);
    });

    // ============================================================
    // ADMIN ROUTES (role: city_admin)
    // ============================================================
    Route::middleware('role:city_admin')->prefix('admin')->group(function () {

        // User management
        Route::apiResource('users', App\Http\Controllers\Api\Admin\UserController::class);
        Route::get('stats', [App\Http\Controllers\Api\Admin\SystemController::class, 'stats']);
        Route::get('logs', [App\Http\Controllers\Api\Admin\SystemController::class, 'logs']);
    });
});
