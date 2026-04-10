<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Helpers\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Danh sách thông báo của user
     * GET /api/notifications
     */
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        $data = $notifications->map(fn ($n) => $this->formatNotification($n));

        return ApiResponse::paginate($notifications->setCollection($data));
    }

    /**
     * Số thông báo chưa đọc
     * GET /api/notifications/unread-count
     */
    public function unreadCount(Request $request)
    {
        $count = $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->count();

        return ApiResponse::success(['count' => $count]);
    }

    /**
     * Danh sách chưa đọc
     * GET /api/notifications/unread
     */
    public function unread(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        $data = $notifications->map(fn ($n) => $this->formatNotification($n));

        return ApiResponse::success($data);
    }

    /**
     * Đánh dấu đã đọc
     * PUT /api/notifications/{id}/read
     */
    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()
            ->notifications()
            ->find($id);

        if (! $notification) {
            return ApiResponse::notFound('Không tìm thấy thông báo');
        }

        $notification->markAsRead();

        return ApiResponse::success(null, 'Đã đánh dấu đã đọc');
    }

    /**
     * Đánh dấu tất cả đã đọc
     * PUT /api/notifications/read-all
     */
    public function markAllRead(Request $request)
    {
        $request->user()
            ->notifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponse::success(null, 'Tất cả thông báo đã được đánh dấu đã đọc');
    }

    /**
     * Format notification response
     */
    protected function formatNotification($n): array
    {
        $data = $n->data;

        return [
            'id' => $n->id,
            'type' => class_basename($n->type),
            'title' => $data['title'] ?? 'Thông báo',
            'body' => $data['body'] ?? '',
            'data' => $data,
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
