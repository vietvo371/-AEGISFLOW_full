import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';

export interface RescueRequest {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  team_id?: number;
  created_at: string;
}

export const rescueService = {
  getRequests: async (): Promise<RescueRequest[]> => {
    const response = await api.get<ApiResponse<RescueRequest[]>>('/rescue-requests');
    return response.data.data;
  },

  getRequest: async (id: number): Promise<RescueRequest> => {
    const response = await api.get<ApiResponse<RescueRequest>>(`/rescue-requests/${id}`);
    return response.data.data;
  },

  createRequest: async (data: Partial<RescueRequest>): Promise<RescueRequest> => {
    const response = await api.post<ApiResponse<RescueRequest>>('/rescue-requests', data);
    return response.data.data;
  },

  updateStatus: async (id: number, status: string): Promise<RescueRequest> => {
    const response = await api.put<ApiResponse<RescueRequest>>(`/rescue-requests/${id}/status`, { status });
    return response.data.data;
  },

  getPending: async (): Promise<RescueRequest[]> => {
    const response = await api.get<ApiResponse<RescueRequest[]>>('/rescue-requests/pending');
    return response.data.data;
  },

  assignRequest: async (id: number, teamId: number): Promise<RescueRequest> => {
    const response = await api.put<ApiResponse<RescueRequest>>(`/rescue-requests/${id}/assign`, { team_id: teamId });
    return response.data.data;
  },
};
