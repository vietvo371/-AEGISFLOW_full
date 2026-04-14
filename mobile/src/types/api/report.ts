import { User } from './auth';

export interface Category {
    id: number;
    ten_danh_muc: string;
    ma_danh_muc: string;
    mo_ta?: string;
    icon?: string;
    mau_sac?: string;
    thu_tu_hien_thi?: number;
    trang_thai: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Priority {
    id: number;
    ten_muc: string;
    ma_muc: string;
    mo_ta?: string;
    cap_do: number;
    mau_sac?: string;
    thoi_gian_phan_hoi_toi_da?: number;
    trang_thai: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Agency {
    id: number;
    ten_co_quan: string;
    email_lien_he?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
    cap_do?: number;
    mo_ta?: string;
    trang_thai?: number;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface Report {
    id: number;
    nguoi_dung_id: number;
    tieu_de: string;
    mo_ta: string;
    danh_muc_id: number;
    trang_thai: number;
    uu_tien_id: number;
    vi_do: string;
    kinh_do: string;
    dia_chi: string;
    luot_ung_ho: number;
    luot_khong_ung_ho: number;
    luot_xem: number;
    nhan_ai?: string | string[] | null;
    do_tin_cay?: number | null;
    co_quan_phu_trach_id?: number | null;
    la_cong_khai: boolean;
    han_phan_hoi?: string | null;
    thoi_gian_phan_hoi_thuc_te?: string | null;
    thoi_gian_giai_quyet?: number | null;
    danh_gia_hai_long?: number | null;
    la_trung_lap: boolean;
    trung_lap_voi_id?: number | null;
    the_tags?: string[];
    du_lieu_mo_rong?: any;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    // Nested objects
    nguoi_dung?: User;
    danh_muc?: Category;
    uu_tien?: Priority;
    co_quan_xu_ly?: Agency | null;
    media?: Media[];
}

export interface Media {
    id: number;
    url: string;
    type: 'image' | 'video';
    thumbnail_url?: string;
}

// Vietnamese field names from Laravel API
export interface MediaItem {
    id: number;
    phan_anh_id: number;
    nguoi_dung_id: number;
    duong_dan_hinh_anh: string;
    duong_dan_thumbnail?: string | null;
    loai_file: string;
    kich_thuoc: number;
    dinh_dang: string;
    mo_ta?: string;
    media_service_id?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface MediaListParams {
    page?: number;
    per_page?: number;
    type?: 'image' | 'video';
}

export interface ReportDetail extends Report {
    user_voted?: number | null; // 1: upvoted, 0: downvoted, null: not voted (from API)
    // Vietnamese field names from actual API
    hinh_anhs?: MediaItem[];
    binh_luans?: Comment[];
    votes?: {
        total_upvotes: number;
        total_downvotes: number;
        user_voted: number | null; // 1: upvoted, -1: downvoted, null: not voted
    };
}

export interface Comment {
    id: number;
    noi_dung: string;
    user?: User;  // English field name
    nguoi_dung?: User;  // Vietnamese field name from API
    luot_thich: number;
    user_liked: boolean;
    created_at?: string;  // New API format
    ngay_tao?: string;    // Old format - fallback
}

export interface CreateReportRequest {
    tieu_de: string;
    mo_ta: string;
    danh_muc: number;
    uu_tien?: number;
    vi_do: number;
    kinh_do: number;
    dia_chi: string;
    la_cong_khai?: boolean;
    the_tags?: string[];
    media_ids?: number[];
}

export interface ReportFilterParams {
    page?: number;
    per_page?: number;
    danh_muc_id?: number;
    trang_thai?: number;
    uu_tien_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    search?: string;
    tu_khoa?: string; // Keyword search
}
