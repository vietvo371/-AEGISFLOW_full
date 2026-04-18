import { User } from './auth';

// Backend Incident types - khớp với IncidentController.php formatIncident()

export type IncidentType = 'flood' | 'heavy_rain' | 'landslide' | 'dam_failure' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'verified' | 'responding' | 'resolved' | 'closed';
export type IncidentSource = 'citizen' | 'sensor' | 'system' | 'social_media';

export interface Incident {
    id: number;
    title: string;
    type: IncidentType;
    type_label: string;
    severity: IncidentSeverity;
    severity_label: string;
    status: IncidentStatus;
    status_label: string;
    source: IncidentSource;
    address: string | null;
    location: any;
    water_level_m: number | null;
    district: { id: number; name: string } | null;
    flood_zone: { id: number; name: string } | null;
    assignee: { id: number; name: string } | null;
    created_at: string;
}

export interface IncidentEvent {
    id: number;
    event_type: string;
    description: string;
    actor: string | null;
    created_at: string;
}

export interface IncidentDetail extends Incident {
    description: string | null;
    rainfall_mm: number | null;
    photo_urls: string[];
    reporter: { id: number; name: string } | null;
    verifier: { id: number; name: string } | null;
    verified_at: string | null;
    resolved_at: string | null;
    events: IncidentEvent[];
}

// Backend expects these fields on POST /incidents
export interface CreateIncidentRequest {
    title: string;
    description?: string;
    type: IncidentType;
    severity: IncidentSeverity;
    latitude: number;
    longitude: number;
    address?: string;
    district_id?: number;
    flood_zone_id?: number;
    water_level_m?: number;
    rainfall_mm?: number;
    photo_urls?: string[];
}

export interface IncidentFilterParams {
    page?: number;
    per_page?: number;
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    type?: IncidentType;
    district_id?: number;
}

// Legacy types (giữ lại cho tương thích ngược)
export interface Report extends Incident {}
export interface ReportDetail extends IncidentDetail {}
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
export interface ReportFilterParams extends IncidentFilterParams {}

// Các types cũ - giữ lại nếu còn code nào reference
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

export interface Media {
    id: number;
    url: string;
    type: 'image' | 'video';
    thumbnail_url?: string;
}

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

export interface Comment {
    id: number;
    noi_dung: string;
    user?: User;
    nguoi_dung?: User;
    luot_thich: number;
    user_liked: boolean;
    created_at?: string;
    ngay_tao?: string;
}
