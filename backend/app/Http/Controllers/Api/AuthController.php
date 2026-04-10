<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Helpers\ApiResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Đăng nhập
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return ApiResponse::error('Email hoặc mật khẩu không chính xác', 401);
        }

        if (! $user->is_active) {
            return ApiResponse::error('Tài khoản đã bị vô hiệu hóa', 403);
        }

        // Cập nhật last_login
        $user->last_login_at = now();
        $user->last_login_ip = $request->ip();
        $user->saveQuietly();

        $token = $user->createToken('auth_token')->plainTextToken;

        return ApiResponse::success([
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 'Đăng nhập thành công');
    }

    /**
     * Đăng ký tài khoản mới
     * POST /api/auth/register
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'is_active' => true,
        ]);

        // Gán vai trò mặc định: citizen
        $citizenRole = \Spatie\Permission\Models\Role::where('slug', 'citizen')->first();
        if ($citizenRole) {
            $user->assignRole($citizenRole);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return ApiResponse::created([
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 'Đăng ký thành công');
    }

    /**
     * Lấy thông tin user hiện tại
     * GET /api/auth/me
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return ApiResponse::success($this->formatUser($user));
    }

    /**
     * Cập nhật profile
     * PUT /api/auth/profile
     */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = $request->user();
        $user->update($data);

        return ApiResponse::success($this->formatUser($user->fresh()), 'Cập nhật profile thành công');
    }

    /**
     * Đổi mật khẩu
     * POST /api/auth/change-password
     */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return ApiResponse::error('Mật khẩu hiện tại không chính xác', 400);
        }

        $user->password = Hash::make($data['password']);
        $user->save();

        return ApiResponse::success(null, 'Đổi mật khẩu thành công');
    }

    /**
     * Cập nhật FCM token
     * POST /api/auth/fcm-token
     */
    public function updateFcmToken(Request $request)
    {
        $data = $request->validate([
            'device_token' => 'required|string',
            'device_type' => 'required|in:ios,android,web',
            'device_name' => 'nullable|string|max:100',
        ]);

        $user = $request->user();

        $user->devices()->updateOrCreate(
            ['device_token' => $data['device_token']],
            [
                'device_type' => $data['device_type'],
                'device_name' => $data['device_name'] ?? null,
                'is_active' => true,
            ]
        );

        return ApiResponse::success(null, 'FCM token đã cập nhật');
    }

    /**
     * Đăng xuất
     * POST /api/auth/logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Đăng xuất thành công');
    }

    /**
     * Refresh token
     * POST /api/auth/refresh
     */
    public function refresh(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
        ]);
    }

    /**
     * Format user response
     */
    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'roles' => $user->roles->pluck('slug'),
            'permissions' => $user->getAllPermissions()->pluck('slug'),
            'is_active' => $user->is_active,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
