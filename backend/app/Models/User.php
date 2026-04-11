<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * User Model — Người dùng hệ thống
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $email_verified_at
 * @property string $password
 * @property string|null $phone
 * @property string|null $avatar
 * @property bool $is_active
 * @property \Carbon\Carbon|null $last_login_at
 * @property string|null $provider
 * @property string|null $provider_id
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property \Carbon\Carbon|null $deleted_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles, SoftDeletes;

    #[Fillable(['name', 'email', 'password', 'phone', 'avatar', 'provider', 'provider_id'])]
    #[Hidden(['password', 'remember_token'])]
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'avatar',
        'is_active',
        'last_login_at',
        'provider',
        'provider_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    // ============================================================
    // Relationships
    // ============================================================

    /**
     * Các yêu cầu cứu hộ do user báo cáo
     */
    public function rescueRequests(): HasMany
    {
        return $this->hasMany(RescueRequest::class, 'reported_by');
    }

    /**
     * Các sự cố do user báo cáo
     */
    public function reportedIncidents(): HasMany
    {
        return $this->hasMany(Incident::class, 'reported_by');
    }

    /**
     * Các sự cố do user được gán xử lý
     */
    public function assignedIncidents(): HasMany
    {
        return $this->hasMany(Incident::class, 'assigned_to');
    }

    /**
     * Thành viên đội cứu hộ (nếu là rescue_team role)
     */
    public function rescueMemberships(): HasMany
    {
        return $this->hasMany(RescueMember::class, 'user_id');
    }

    /**
     * Các cảnh báo do user phát hành
     */
    public function issuedAlerts(): HasMany
    {
        return $this->hasMany(Alert::class, 'issued_by');
    }

    /**
     * Thiết bị FCM của user
     */
    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class, 'user_id');
    }

    /**
     * Tất cả notifications gửi cho user
     */
    public function notifications(): MorphMany
    {
        return $this->morphMany(\Illuminate\Notifications\DatabaseNotification::class, 'notifiable')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Activity logs (Spatie)
     */
    public function activities(): HasMany
    {
        return $this->hasMany(\Spatie\Activitylog\Models\Activity::class, 'causer_id')
            ->where('causer_type', self::class);
    }

    // ============================================================
    // Helpers
    // ============================================================

    /**
     * Kiểm tra user có đang active không
     */
    public function isActive(): bool
    {
        return $this->is_active === true;
    }

    /**
     * Kiểm tra user có role cụ thể không
     */
    public function hasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }

    /**
     * Lấy danh sách permission của user
     */
    public function getPermissionNamesAttribute(): array
    {
        return $this->getAllPermissions()->pluck('name')->toArray();
    }

    /**
     * Lấy danh sách roles của user
     */
    public function getRoleNamesAttribute(): array
    {
        return $this->roles()->pluck('name')->toArray();
    }

    /**
     * Format response cho API
     */
    public function toApiResponse(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar' => $this->avatar,
            'roles' => $this->role_names,
            'permissions' => $this->permission_names,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
