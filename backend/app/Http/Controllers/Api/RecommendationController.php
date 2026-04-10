<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Helpers\ApiResponse;
use App\Models\Recommendation;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    /**
     * Danh sách đề xuất
     * GET /api/recommendations
     */
    public function index(Request $request)
    {
        $query = Recommendation::with(['prediction', 'incident'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $items = $query->paginate($request->get('per_page', 20));

        $data = $items->map(fn ($r) => $this->formatRecommendation($r));

        return ApiResponse::paginate($items->setCollection($data));
    }

    /**
     * Chi tiết đề xuất
     * GET /api/recommendations/{id}
     */
    public function show(int $id)
    {
        $item = Recommendation::with(['prediction', 'incident', 'approver'])
            ->find($id);

        if (! $item) {
            return ApiResponse::notFound('Không tìm thấy đề xuất');
        }

        return ApiResponse::success($this->formatRecommendation($item, true));
    }

    /**
     * Phê duyệt đề xuất
     * PUT /api/recommendations/{id}/approve
     */
    public function approve(Request $request, int $id)
    {
        $item = Recommendation::find($id);

        if (! $item) {
            return ApiResponse::notFound('Không tìm thấy đề xuất');
        }

        $item->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return ApiResponse::success($this->formatRecommendation($item), 'Đã phê duyệt đề xuất');
    }

    /**
     * Từ chối đề xuất
     * PUT /api/recommendations/{id}/reject
     */
    public function reject(Request $request, int $id)
    {
        $data = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $item = Recommendation::find($id);

        if (! $item) {
            return ApiResponse::notFound('Không tìm thấy đề xuất');
        }

        $item->update([
            'status' => 'rejected',
            'rejected_reason' => $data['reason'],
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return ApiResponse::success($this->formatRecommendation($item), 'Đã từ chối đề xuất');
    }

    protected function formatRecommendation($r, bool $detailed = false): array
    {
        $data = [
            'id' => $r->id,
            'type' => $r->type,
            'type_label' => $r->translated('type'),
            'description' => $r->description,
            'details' => $r->details,
            'status' => $r->status,
            'status_label' => $r->translated('status'),
            'prediction' => $r->prediction ? ['id' => $r->prediction->id] : null,
            'incident' => $r->incident ? ['id' => $r->incident->id, 'title' => $r->incident->title] : null,
            'created_at' => $r->created_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data['approver'] = $r->approver ? ['id' => $r->approver->id, 'name' => $r->approver->name] : null;
            $data['approved_at'] = $r->approved_at?->toIso8601String();
            $data['rejected_reason'] = $r->rejected_reason;
            $data['executed_at'] = $r->executed_at?->toIso8601String();
        }

        return $data;
    }
}
