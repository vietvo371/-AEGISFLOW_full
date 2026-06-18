import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { Incident, IncidentFilterParams, ReportDetail } from '../types/api/report';

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

const mapIncidentToReport = (incident: any): any => {
  if (!incident) return incident;

  // Map status (string) -> trang_thai (number)
  let trang_thai = 0; // Tiếp nhận
  if (incident.status === 'verified') trang_thai = 1;
  else if (incident.status === 'responding') trang_thai = 2;
  else if (incident.status === 'resolved') trang_thai = 3;
  else if (incident.status === 'closed') trang_thai = 3; // Hoàn thành

  // Map type (string) -> danh_muc (number)
  let danh_muc = 6; // Khác
  if (incident.type === 'traffic') danh_muc = 1;
  else if (incident.type === 'environment') danh_muc = 2;
  else if (incident.type === 'fire') danh_muc = 3;
  else if (incident.type === 'landslide') danh_muc = 4;
  else if (incident.type === 'flood' || incident.type === 'heavy_rain' || incident.type === 'dam_failure') danh_muc = 5;

  // Map severity (string) -> uu_tien (object)
  let uu_tien = { ten_muc: 'Trung bình', cap_do: 1 };
  if (incident.severity === 'low') uu_tien = { ten_muc: 'Thấp', cap_do: 0 };
  else if (incident.severity === 'medium') uu_tien = { ten_muc: 'Trung bình', cap_do: 1 };
  else if (incident.severity === 'high') uu_tien = { ten_muc: 'Cao', cap_do: 2 };
  else if (incident.severity === 'critical') uu_tien = { ten_muc: 'Khẩn cấp', cap_do: 3 };

  // Map photo_urls -> hinh_anhs
  const hinh_anhs = (incident.photo_urls || []).map((url: string, idx: number) => ({
    id: idx + 1,
    phan_anh_id: incident.id,
    duong_dan_hinh_anh: url,
    loai_file: 'image',
    kich_thuoc: 0,
    dinh_dang: 'jpg',
    created_at: incident.created_at,
    updated_at: incident.created_at,
  }));

  // Map events -> binh_luans
  const binh_luans = (incident.events || []).map((e: any) => ({
    id: e.id,
    noi_dung: e.description,
    nguoi_dung: {
      ho_ten: e.actor || 'Hệ thống',
    },
    created_at: e.created_at,
  }));

  return {
    ...incident,
    tieu_de: incident.title || '',
    mo_ta: incident.description || '',
    dia_chi: incident.address || '',
    trang_thai,
    danh_muc,
    uu_tien,
    hinh_anhs,
    binh_luans,
    luot_ung_ho: incident.upvotes || 0,
    luot_khong_ung_ho: incident.downvotes || 0,
    luot_xem: incident.views || 0,
  };
};

const mapRecommendationToReport = (rec: any): any => {
  if (!rec) return rec;

  let trang_thai = 0; // Tiếp nhận
  if (rec.status === 'approved' || rec.status === 'executed') trang_thai = 3; // Hoàn thành
  else if (rec.status === 'rejected') trang_thai = 4; // Từ chối
  else if (rec.status === 'pending') trang_thai = 2; // Đang xử lý

  let uu_tien = { ten_muc: 'Trung bình', cap_do: 1 };
  if (rec.priority === 'low') uu_tien = { ten_muc: 'Thấp', cap_do: 0 };
  else if (rec.priority === 'medium') uu_tien = { ten_muc: 'Trung bình', cap_do: 1 };
  else if (rec.priority === 'high') uu_tien = { ten_muc: 'Cao', cap_do: 2 };
  else if (rec.priority === 'critical') uu_tien = { ten_muc: 'Khẩn cấp', cap_do: 3 };

  let description = rec.description || '';
  if (rec.details) {
    if (rec.details.target_zone) description += `\nKhu vực: ${rec.details.target_zone}`;
    if (rec.details.people_count) description += `\nSố người: ${rec.details.people_count}`;
  }

  return {
    ...rec,
    id: rec.id,
    tieu_de: `[AI Đề xuất] ${rec.type_label || 'Hành động khẩn cấp'}`,
    mo_ta: description,
    dia_chi: rec.target_area || '',
    trang_thai,
    danh_muc: 6, // Khác
    uu_tien,
    hinh_anhs: [],
    binh_luans: [],
    luot_ung_ho: 0,
    luot_khong_ung_ho: 0,
    luot_xem: 0,
    created_at: rec.created_at,
  };
};

export const reportService = {
  getReports: async (params?: IncidentFilterParams): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/incidents', { params });
    const res = response.data;
    if (res.success && res.data) {
      if (Array.isArray(res.data.data)) {
        res.data.data = res.data.data.map(mapIncidentToReport);
      } else if (Array.isArray(res.data)) {
        res.data = res.data.map(mapIncidentToReport);
      }
    }
    return res;
  },

  getReportDetail: async (id: number): Promise<ApiResponse<ReportDetail>> => {
    const response = await api.get<ApiResponse<ReportDetail>>(`/incidents/${id}`);
    const res = response.data;
    if (res.success && res.data) {
      res.data = mapIncidentToReport(res.data);
    }
    return res;
  },

  getRecommendationDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(`/recommendations/${id}`);
    const res = response.data;
    if (res.success && res.data) {
      res.data = mapRecommendationToReport(res.data);
    }
    return res;
  },

  createReport: async (data: MobileCreateReportRequest): Promise<ApiResponse<Incident>> => {
    const backendData = toBackendFormat(data);
    const response = await api.post<ApiResponse<Incident>>('/incidents', backendData);
    const res = response.data;
    if (res.success && res.data) {
      res.data = mapIncidentToReport(res.data);
    }
    return res;
  },

  updateReport: async (id: number, data: Partial<MobileCreateReportRequest>): Promise<ApiResponse<Incident>> => {
    const updateData: Record<string, any> = {};
    if (data.tieu_de !== undefined) updateData.title = data.tieu_de;
    if (data.mo_ta !== undefined) updateData.description = data.mo_ta;
    if (data.danh_muc !== undefined) updateData.type = CATEGORY_TO_TYPE[data.danh_muc];
    if (data.uu_tien !== undefined) updateData.severity = PRIORITY_TO_SEVERITY[data.uu_tien];
    if (data.vi_do !== undefined) updateData.latitude = data.vi_do;
    if (data.kinh_do !== undefined) updateData.longitude = data.kinh_do;

    const response = await api.patch<ApiResponse<Incident>>(`/incidents/${id}`, updateData);
    const res = response.data;
    if (res.success && res.data) {
      res.data = mapIncidentToReport(res.data);
    }
    return res;
  },

  deleteReport: async (_id: number): Promise<ApiResponse<void>> => {
    return { success: false, message: 'Xóa sự cố không được hỗ trợ', data: null as any };
  },

  getMyReports: async (params?: IncidentFilterParams): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/incidents', {
      params: { ...params, my: true }
    });
    const res = response.data;
    if (res.success && res.data) {
      if (Array.isArray(res.data.data)) {
        res.data.data = res.data.data.map(mapIncidentToReport);
      } else if (Array.isArray(res.data)) {
        res.data = res.data.map(mapIncidentToReport);
      }
    }
    return res;
  },

  getNearbyReports: async (lat: number, long: number, radius: number = 5): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/incidents', {
      params: { lat, lng: long, radius, per_page: 50 }
    });
    const res = response.data;
    if (res.success && res.data) {
      if (Array.isArray(res.data.data)) {
        res.data.data = res.data.data.map(mapIncidentToReport);
      } else if (Array.isArray(res.data)) {
        res.data = res.data.map(mapIncidentToReport);
      }
    }
    return res;
  },

  getTrendingReports: async (limit: number = 10): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/incidents', {
      params: { per_page: limit }
    });
    const res = response.data;
    if (res.success && res.data) {
      if (Array.isArray(res.data.data)) {
        res.data.data = res.data.data.map(mapIncidentToReport);
      } else if (Array.isArray(res.data)) {
        res.data = res.data.map(mapIncidentToReport);
      }
    }
    return res;
  },

  voteReport: async (_id: number, _type: 'upvote' | 'downvote'): Promise<ApiResponse<any>> => {
    return { success: false, message: 'Tính năng bình chọn chưa được hỗ trợ', data: null };
  },

  incrementView: async (_id: number): Promise<ApiResponse<void>> => {
    return { success: true, message: '', data: null as any };
  },

  rateReport: async (_id: number, _rating: number): Promise<ApiResponse<void>> => {
    return { success: false, message: 'Tính năng đánh giá chưa được hỗ trợ', data: null as any };
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/analytics/overview');
    return response.data;
  },

  addComment: async (_reportId: number, _content: string): Promise<ApiResponse<any>> => {
    return { success: false, message: 'Tính năng bình luận chưa được hỗ trợ', data: null };
  },
};
