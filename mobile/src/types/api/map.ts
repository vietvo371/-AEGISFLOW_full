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
