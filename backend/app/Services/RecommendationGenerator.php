<?php

namespace App\Services;

use App\Enums\RecommendationStatusEnum;
use App\Enums\RecommendationTypeEnum;
use App\Models\Prediction;
use App\Models\Recommendation;

/**
 * RecommendationGenerator — Tự động sinh đề xuất từ dự đoán
 */
class RecommendationGenerator
{
    /**
     * Sinh đề xuất từ prediction
     */
    public function generate(Prediction $prediction): array
    {
        $recommendations = [];

        $severity = $prediction->severity ?? 'low';
        $probability = $prediction->probability ?? 0;

        if ($probability >= 0.8 && in_array($severity, ['high', 'critical'])) {
            $recommendations = array_merge($recommendations, $this->generateCritical($prediction));
        } elseif ($probability >= 0.6 && $severity === 'high') {
            $recommendations = array_merge($recommendations, $this->generateHigh($prediction));
        } elseif ($probability >= 0.4) {
            $recommendations[] = $this->generateMedium($prediction);
        }

        return $recommendations;
    }

    /**
     * Đề xuất cho mức nghiêm trọng cao
     */
    protected function generateCritical(Prediction $prediction): array
    {
        return [
            // Tuyến ưu tiên
            $this->createRecommendation(
                $prediction,
                RecommendationTypeEnum::PRIORITY_ROUTE->value,
                "Kích hoạt tuyến ưu tiên — Dự báo ngập nghiêm trọng với xác suất "
                    .round($prediction->probability * 100)."%",
                [
                    'action' => 'activate_priority_route',
                    'urgency' => 'critical',
                    'probability' => $prediction->probability,
                ]
            ),

            // Cảnh báo khẩn cấp
            $this->createRecommendation(
                $prediction,
                RecommendationTypeEnum::ALERT->value,
                "Phát cảnh báo ngập cấp độ "
                    .($prediction->severity ?? 'high')
                    ." cho khu vực dự báo",
                [
                    'action' => 'broadcast_alert',
                    'severity' => $prediction->severity ?? 'high',
                    'auto_dispatch_rescue' => true,
                ]
            ),

            // Điều động cứu hộ
            $this->createRecommendation(
                $prediction,
                RecommendationTypeEnum::EVACUATION->value,
                "Chuẩn bị sơ tán dân cư trong vùng nguy hiểm",
                [
                    'action' => 'prepare_evacuation',
                    ' shelters_to_activate' => 'all_safe_shelters',
                ]
            ),
        ];
    }

    /**
     * Đề xuất cho mức cao
     */
    protected function generateHigh(Prediction $prediction): array
    {
        return [
            $this->createRecommendation(
                $prediction,
                RecommendationTypeEnum::REROUTE->value,
                "Đề xuất đổi tuyến giao thông tránh khu vực dự báo ngập",
                [
                    'action' => 'suggest_reroute',
                    'alternative_routes' => 'auto_calculate',
                ]
            ),

            $this->createRecommendation(
                $prediction,
                RecommendationTypeEnum::ALERT->value,
                "Cảnh báo người dân khu vực có nguy cơ ngập",
                [
                    'action' => 'notify_residents',
                    'radius_km' => 2,
                ]
            ),
        ];
    }

    /**
     * Đề xuất cho mức trung bình
     */
    protected function generateMedium(Prediction $prediction): Recommendation
    {
        return $this->createRecommendation(
            $prediction,
            RecommendationTypeEnum::REROUTE->value,
            "Cập nhật lộ trình di chuyển — nguy cơ ngập "
                .round($prediction->probability * 100)."%",
            [
                'action' => 'update_routes',
                'severity' => 'medium',
            ]
        );
    }

    /**
     * Tạo recommendation record
     */
    protected function createRecommendation(
        Prediction $prediction,
        string $type,
        string $description,
        array $details
    ): Recommendation {
        return Recommendation::create([
            'prediction_id' => $prediction->id,
            'incident_id' => null,
            'type' => $type,
            'description' => $description,
            'details' => $details,
            'status' => RecommendationStatusEnum::PENDING->value,
        ]);
    }
}
