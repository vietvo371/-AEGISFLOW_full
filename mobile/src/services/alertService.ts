import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';

export interface AlertItem {
  id: number;
  title: string;
  description: string | null;
  alert_type: string;
  alert_type_label?: string;
  severity: string;
  severity_label?: string;
  status: string;
  status_label?: string;
  effective_from: string | null;
  effective_until: string | null;
  affected_districts?: string[];
  source?: string;
  issuer?: { id: number; name: string } | null;
  related_incident_id?: number | null;
  created_at: string;
}

export interface AlertFilterParams {
  status?: string;
  alert_type?: string;
  severity?: string;
  per_page?: number;
  page?: number;
}

export const alertService = {
  getAlerts: async (params?: AlertFilterParams): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/alerts', { params });
    return response.data;
  },

  getActiveAlerts: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/alerts', {
      params: { status: 'active', per_page: 50 },
    });
    return response.data;
  },

  getAlertDetail: async (id: number): Promise<ApiResponse<AlertItem>> => {
    const response = await api.get<ApiResponse<AlertItem>>(`/alerts/${id}`);
    return response.data;
  },
};
