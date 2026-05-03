export interface MapReport {
    id: number;
    vi_do: number;
    kinh_do: number;
    tieu_de: string;
    danh_muc: number;
    danh_muc_text?: string;
    uu_tien: number;
    trang_thai: number;
    marker_color: string;
}

export interface HeatmapPoint {
    vi_do: number;
    kinh_do: number;
    weight: number;
}

export interface ClusterMarker {
    vi_do: number;
    kinh_do: number;
    count: number;
    sample_id: number;
}

export interface Route {
    id: number;
    ten_tuyen: string;
    diem_dung: RouteStop[];
}

export interface RouteStop {
    id: number;
    ten_diem: string;
    vi_do: number;
    kinh_do: number;
}

export interface MapBounds {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
}

export interface Shelter {
    id: number;
    ten_diem: string;
    dia_chi: string;
    latitude: number;
    longitude: number;
    suc_chua: number;
    hien_tai: number;
    loai: 'school' | 'community' | 'government' | 'religious';
    tinh_trang: 'available' | 'limited' | 'full';
    thoi_gian_mo?: string;
    thoi_gian_dong?: string;
    so_dt?: string;
    anh?: string;
    mo_ta?: string;
}

export interface Sensor {
    id: number;
    ten_tram: string;
    dia_chi: string;
    latitude: number;
    longitude: number;
    loai: 'water_level' | 'rainfall' | 'camera' | 'combined';
    trang_thai: 'online' | 'offline' | 'maintenance';
    gia_tri_hien_tai?: number;
    don_vi?: string;
    nguong_binh_thuong?: number;
    nguong_canh_bao?: number;
    nguong_nguy_hiem?: number;
    thoi_gian_doc_cuoi?: string;
}

export interface WeatherForecast {
    ngay: string;
    ngay_trong_tuan: string;
    nhiet_do_min: number;
    nhiet_do_max: number;
    tinh_trang: string;
    icon: string;
    xac_suat_mua: number;
    toc_do_gio: number;
    do_am: number;
}
