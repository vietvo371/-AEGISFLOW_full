<?php

namespace App\Models;

use App\Enums\IncidentSourceEnum;
use App\Enums\IncidentStatusEnum;
use App\Enums\SeverityEnum;
use App\Traits\HasTranslatedEnums;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * Incident — Sự cố ngập lụt
 *
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property string $type (flood|heavy_rain|landslide|dam_failure|other)
 * @property string $severity (low|medium|high|critical)
 * @property string $status (reported|verified|responding|resolved|closed)
 * @property string $source (citizen|camera|sensor|operator|ai)
 * @property string $geometry (PostGIS POINT)
 * @property string|null $address
 * @property int|null $district_id
 * @property int|null $ward_id
 * @property int|null $flood_zone_id
 * @property float|null $water_level_m
 * @property float|null $rainfall_mm
 * @property array|null $photo_urls
 * @property int|null $reported_by
 * @property int|null $assigned_to
 * @property int|null $verified_by
 * @property \Carbon\Carbon|null $verified_at
 * @property \Carbon\Carbon|null $resolved_at
 * @property \Carbon\Carbon|null $closed_at
 * @property array|null $metadata
 */
class Incident extends Model
{
    use HasFactory, SoftDeletes, HasTranslatedEnums;

    protected $fillable = [
        'title',
        'description',
        'type',
        'severity',
        'status',
        'source',
        'geometry',
        'address',
        'district_id',
        'ward_id',
        'flood_zone_id',
        'water_level_m',
        'rainfall_mm',
        'photo_urls',
        'reported_by',
        'assigned_to',
        'verified_by',
        'verified_at',
        'resolved_at',
        'closed_at',
        'metadata',
    ];

    protected $casts = [
        'photo_urls' => 'array',
        'metadata' => 'array',
        'water_level_m' => 'decimal:2',
        'rainfall_mm' => 'decimal:2',
        'verified_at' => 'datetime',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected static array $translatedEnums = [
        'type' => 'enums.incident_type',
        'severity' => 'enums.severity',
        'status' => 'enums.incident_status',
        'source' => 'enums.incident_source',
    ];

    // ============================================================
    // Relationships
    // ============================================================

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class, 'district_id');
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class, 'ward_id');
    }

    public function floodZone(): BelongsTo
    {
        return $this->belongsTo(FloodZone::class, 'flood_zone_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function events(): HasMany
    {
        return $this->hasMany(IncidentEvent::class, 'incident_id')
            ->orderBy('created_at', 'asc');
    }

    public function predictions(): HasMany
    {
        return $this->hasMany(Prediction::class, 'incident_id');
    }

    public function recommendations(): HasMany
    {
        return $this->hasMany(Recommendation::class, 'incident_id');
    }

    public function rescueRequests(): HasMany
    {
        return $this->hasMany(RescueRequest::class, 'incident_id');
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class, 'related_incident_id');
    }

    // ============================================================
    // Helpers
    // ============================================================

    /**
     * Lấy tọa độ
     */
    public function getLocationAttribute(): ?array
    {
        $result = DB::selectOne("
            SELECT ST_X(geometry::geometry) as lng, ST_Y(geometry::geometry) as lat
            FROM incidents WHERE id = ?
        ", [$this->id]);

        return $result ? ['lat' => $result->lat, 'lng' => $result->lng] : null;
    }

    /**
     * Lấy GeoJSON Feature
     */
    public function toGeoJson(): array
    {
        $geometry = DB::selectOne("
            SELECT ST_AsGeoJSON(geometry) as geojson FROM incidents WHERE id = ?
        ", [$this->id]);

        return [
            'type' => 'Feature',
            'id' => $this->id,
            'properties' => [
                'id' => $this->id,
                'title' => $this->title,
                'type' => $this->type,
                'severity' => $this->severity,
                'status' => $this->status,
                'source' => $this->source,
                'address' => $this->address,
                'water_level_m' => $this->water_level_m,
            ],
            'geometry' => $geometry ? json_decode($geometry->geojson) : null,
        ];
    }

    /**
     * Chuyển trạng thái thành resolved
     */
    public function markResolved(): self
    {
        $this->status = IncidentStatusEnum::RESOLVED->value;
        $this->resolved_at = now();
        $this->save();

        return $this;
    }

    /**
     * Chuyển trạng thái thành closed
     */
    public function markClosed(): self
    {
        $this->status = IncidentStatusEnum::CLOSED->value;
        $this->closed_at = now();
        $this->save();

        return $this;
    }

    /**
     * Xác minh sự cố
     */
    public function verify(int $userId): self
    {
        $this->status = IncidentStatusEnum::VERIFIED->value;
        $this->verified_by = $userId;
        $this->verified_at = now();
        $this->save();

        $this->events()->create([
            'event_type' => 'verified',
            'description' => 'Sự cố đã được xác minh',
            'actor_id' => $userId,
        ]);

        return $this;
    }

    /**
     * Tạo timeline event
     */
    public function logEvent(string $eventType, string $description, ?int $actorId = null): IncidentEvent
    {
        return $this->events()->create([
            'event_type' => $eventType,
            'description' => $description,
            'actor_id' => $actorId,
        ]);
    }

    // ============================================================
    // Scopes
    // ============================================================

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeDistrict($query, int $districtId)
    {
        return $query->where('district_id', $districtId);
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', [IncidentStatusEnum::RESOLVED->value, IncidentStatusEnum::CLOSED->value]);
    }

    public function scopeCritical($query)
    {
        return $query->where('severity', SeverityEnum::CRITICAL->value);
    }

    public function scopeReportedBy($query, int $userId)
    {
        return $query->where('reported_by', $userId);
    }
}
