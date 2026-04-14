// User Profile Types (Public)

export interface UserProfile {
    id: number;
    ho_ten: string;
    anh_dai_dien?: string | null;
    vai_tro?: number; // 0 = citizen, 1 = government, etc.
    diem_thanh_pho?: number; // City points
    diem_uy_tin?: number; // Reputation points
    cap_huy_hieu?: number; // Badge level
    cap_huy_hieu_text?: string;
    tong_so_phan_anh?: number; // Total reports
    ty_le_chinh_xac?: number; // Accuracy rate
    ngay_tham_gia?: string; // Join date
    // Public profile fields only - no email, phone, etc.
}

export interface UserStats {
    user_id: number;
    user_name: string;
    total_reports: number;
    verified_reports: number;
    resolved_reports: number;
    rejected_reports: number;
    total_votes_received: number;
    total_comments: number;
    city_points: number;
    reputation_score: number;
    accuracy_rate: number;
    badge_level: number;
    member_since: string;
    categories: {
        category: number;
        category_name: string;
        count: number;
        percentage: number;
    }[];
    recent_reports: {
        date: string;
        count: number;
    }[];
    achievements: {
        id: number;
        name: string;
        description: string;
        icon?: string;
        unlocked_at: string;
    }[];
}
