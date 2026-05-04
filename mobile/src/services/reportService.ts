import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { Incident, IncidentDetail, IncidentFilterParams } from '../types/api/report';

// Mapping từ mobile category ID (1-6) → backend incident type
const CATEGORY_TO_TYPE: Record<number, string> = {
  1: 'traffic',      // Giao thông
  2: 'environment',  // Môi trường
  3: 'fire',         // Cháy nổ
  4: 'landslide',    // Rác thải → dùng landslide (gần đúng)
  5: 'flood',        // Ngập lụt
  6: 'other',        // Khác
};

// Mapping từ mobile priority (1-4) → backend severity
const PRIORITY_TO_SEVERITY: Record<number, string> = {
  1: 'low',      // Bình thường
  2: 'medium',   // Trung bình
  3: 'high',     // Cao
  4: 'critical', // Khẩn cấp
};

// Mobile CreateReportRequest format (VN field names)
interface MobileCreateReportRequest {
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

// Backend format (EN field names)
interface BackendIncidentRequest {
  title: string;
  description: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  address: string;
  photo_urls?: string[];
}

/**
 * Chuyển đổi format từ mobile (VN) → backend (EN)
 */
const toBackendFormat = (data: MobileCreateReportRequest): BackendIncidentRequest => {
  return {
    title: data.tieu_de,
    description: data.mo_ta,
    type: CATEGORY_TO_TYPE[data.danh_muc] || 'other',
    severity: PRIORITY_TO_SEVERITY[data.uu_tien || 1] || 'medium',
    latitude: data.vi_do,
    longitude: data.kinh_do,
    address: data.dia_chi,
    photo_urls: [], // media upload handled separately
  };
};

export const reportService = {
    getReports: async (params?: IncidentFilterParams): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/incidents', { params });
        return response.data;
    },

    getReportDetail: async (id: number): Promise<ApiResponse<IncidentDetail>> => {
        const response = await api.get<ApiResponse<IncidentDetail>>(`/incidents/${id}`);
        return response.data;
    },

    createReport: async (data: MobileCreateReportRequest): Promise<ApiResponse<Incident>> => {
        const backendData = toBackendFormat(data);
        const response = await api.post<ApiResponse<Incident>>('/incidents', backendData);
        return response.data;
    },

    updateReport: async (id: number, data: Partial<MobileCreateReportRequest>): Promise<ApiResponse<Incident>> => {
        // Backend dùng PATCH, chỉ gửi fields được thay đổi
        const updateData: Record<string, any> = {};
        if (data.tieu_de !== undefined) updateData.title = data.tieu_de;
        if (data.mo_ta !== undefined) updateData.description = data.mo_ta;
        if (data.danh_muc !== undefined) updateData.type = CATEGORY_TO_TYPE[data.danh_muc];
        if (data.uu_tien !== undefined) updateData.severity = PRIORITY_TO_SEVERITY[data.uu_tien];
        if (data.vi_do !== undefined) updateData.latitude = data.vi_do;
        if (data.kinh_do !== undefined) updateData.longitude = data.kinh_do;

        const response = await api.patch<ApiResponse<Incident>>(`/incidents/${id}`, updateData);
        return response.data;
    },

    deleteReport: async (id: number): Promise<ApiResponse<void>> => {
        return { success: false, message: 'Xóa sự cố không được hỗ trợ', data: null };
    },

    getMyReports: async (params?: IncidentFilterParams): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/incidents', {
            params: { ...params, my: true }
        });
        return response.data;
    },

    getNearbyReports: async (lat: number, long: number, radius: number = 5): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/incidents', {
            params: { lat, lng: long, radius, per_page: 50 }
        });
        return response.data;
    },

    getTrendingReports: async (limit: number = 10): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/incidents', {
            params: { per_page: limit }
        });
        return response.data;
    },

    voteReport: async (id: number, type: 'upvote' | 'downvote'): Promise<ApiResponse<any>> => {
        return { success: false, message: 'Tính năng bình chọn chưa được hỗ trợ', data: null };
    },

    incrementView: async (id: number): Promise<ApiResponse<void>> => {
        return { success: true, message: '', data: null };
    },

    rateReport: async (id: number, rating: number): Promise<ApiResponse<void>> => {
        return { success: false, message: 'Tính năng đánh giá chưa được hỗ trợ', data: null };
    },

    getStats: async (): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/analytics/overview');
        return response.data;
    },

    addComment: async (reportId: number, content: string): Promise<ApiResponse<any>> => {
        return { success: false, message: 'Tính năng bình luận chưa được hỗ trợ', data: null };
    },
};
