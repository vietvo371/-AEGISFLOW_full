<?php

namespace App\Http\Controllers\Api\Admin;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Danh sách người dùng
     * GET /api/admin/users
     */
    public function index(Request $request)
    {
        $query = User::with('roles')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        if ($request->filled('role')) {
            $query->role($request->role);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->paginate($request->get('per_page', 20));

        $data = $users->map(fn ($u) => $this->formatUser($u));

        return ApiResponse::paginate($users->setCollection($data));
    }

    /**
     * Tạo user mới
     * POST /api/admin/users
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
            'phone' => 'nullable|string|max:20',
            'role' => 'required|exists:roles,id',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'is_active' => true,
        ]);

        $role = \Spatie\Permission\Models\Role::find($data['role']);
        $user->assignRole($role);

        return ApiResponse::created($this->formatUser($user->fresh()));
    }

    /**
     * Cập nhật user
     * PUT /api/admin/users/{id}
     */
    public function update(Request $request, int $id)
    {
        $user = User::find($id);

        if (! $user) {
            return ApiResponse::notFound('Không tìm thấy người dùng');
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
            'role' => 'sometimes|exists:roles,id',
        ]);

        $user->update($data);

        if (isset($data['role'])) {
            $role = \Spatie\Permission\Models\Role::find($data['role']);
            $user->syncRoles([$role]);
        }

        return ApiResponse::success($this->formatUser($user->fresh()), 'Cập nhật thành công');
    }

    /**
     * Xóa user
     * DELETE /api/admin/users/{id}
     */
    public function destroy(int $id)
    {
        $user = User::find($id);

        if (! $user) {
            return ApiResponse::notFound('Không tìm thấy người dùng');
        }

        // Soft delete thay vì xóa vĩnh viễn
        $user->is_active = false;
        $user->save();
        $user->delete();

        return ApiResponse::deleted('Người dùng đã được vô hiệu hóa');
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
            'is_active' => $user->is_active,
            'roles' => $user->roles->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
            ]),
            'created_at' => $user->created_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }
}
