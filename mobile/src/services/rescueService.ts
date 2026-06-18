import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';

export interface RescueRequestItem {
  id: number;
  caller_name: string;
  caller_phone: string | null;
  address: string;
  latitude?: number;
  longitude?: number;
  location?: { lat?: number | string | null; lng?: number | string | null } | null;
  urgency: string;
  urgency_label?: string;
  priority?: string;
  category: string;
  category_label?: string;
  people_count: number;
  vulnerable_groups: string[];
  description: string | null;
  status: string;
  status_label?: string;
  priority_score?: number;
  assigned_team?: { id: number; name: string } | null;
  district?: { id: number; name: string } | null;
  created_at: string;
}

export interface CreateRescueRequestData {
  caller_name: string;
  caller_phone?: string;
  latitude: number;
  longitude: number;
  address: string;
  district_id?: number;
  ward_id?: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: 'medical' | 'food' | 'water' | 'rescue' | 'evacuation' | 'shelter' | 'other';
  people_count?: number;
  vulnerable_groups?: string[];
  description?: string;
  water_level_m?: number;
  accessibility_notes?: string;
  photo_urls?: string[];
}

export type RescueRequest = RescueRequestItem;

const toNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeRequest = (item: any): RescueRequestItem => {
  const lat = toNumber(item?.latitude) ?? toNumber(item?.location?.lat);
  const lng = toNumber(item?.longitude) ?? toNumber(item?.location?.lng);

  return {
    ...item,
    latitude: lat,
    longitude: lng,
  };
};

export const rescueService = {
  createRescueRequest: async (data: CreateRescueRequestData): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/rescue-requests', data);
    return response.data;
  },

  getMyRescueRequests: async (params?: { status?: string; page?: number }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/rescue-requests', { params });
    const payload = response.data.data;
    if (Array.isArray(payload?.data)) {
      response.data.data = {
        ...payload,
        data: payload.data.map(normalizeRequest),
      };
    } else if (Array.isArray(payload)) {
      response.data.data = payload.map(normalizeRequest);
    }
    return response.data;
  },

  getRescueRequestDetail: async (id: number): Promise<ApiResponse<RescueRequestItem>> => {
    const response = await api.get<ApiResponse<RescueRequestItem>>(`/rescue-requests/${id}`);
    response.data.data = normalizeRequest(response.data.data);
    return response.data;
  },

  rateRescue: async (id: number, rating: number): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(`/rescue-requests/${id}/rate`, { rating });
    return response.data;
  },

  createRequest: async (data: any): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/rescue-requests', data);
    return response.data;
  },

  getRequests: async (params?: { assigned_team_id?: number; status?: string }): Promise<any[]> => {
    const response = await api.get<ApiResponse<any>>('/rescue-requests', { params });
    const payload = response.data.data;
    const items = Array.isArray(payload?.data) ? payload.data : payload;
    return Array.isArray(items) ? items.map(normalizeRequest) : [];
  },

  getMyTeam: async (): Promise<{ id: number; name: string } | null> => {
    try {
      const response = await api.get<ApiResponse<any>>('/rescue-teams/my');
      return response.data.data ?? null;
    } catch {
      return null;
    }
  },

  getRequest: async (id: number): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/rescue-requests/${id}`);
    return normalizeRequest(response.data.data);
  },

  getPending: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any>>('/rescue-requests/pending');
    const payload = response.data.data;
    const items = Array.isArray(payload?.data) ? payload.data : payload;
    return Array.isArray(items) ? items.map(normalizeRequest) : [];
  },

  updateStatus: async (id: number, status: string): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/rescue-requests/${id}/status`, { status });
    return response.data.data;
  },

  assignRequest: async (id: number, teamId: number): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/rescue-requests/${id}/assign`, { team_id: teamId });
    return response.data.data;
  },
};
