import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';

// Incident types matching backend IncidentController
export interface Incident {
    id: number;
    title: string;
    description: string | null;
    type: 'accident' | 'congestion' | 'construction' | 'weather' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    source: 'operator' | 'citizen' | 'auto_detected';
    reported_by: number;
    assigned_to: number | null;
    resolved_at: string | null;
    location: { lat: number; lng: number } | null;
    location_name?: string;
    affected_edge_ids: number[] | null;
    metadata: Record<string, any> | null;
    reporter?: { id: number; name: string; email: string };
    assignee?: { id: number; name: string; email: string } | null;
    predictions?: any[];
    recommendations?: any[];
    created_at: string;
    updated_at: string;
}

export interface IncidentFilterParams {
    status?: string;
    type?: string;
    severity?: string;
    sort_by?: 'created_at' | 'severity' | 'updated_at';
    page?: number;
    per_page?: number;
}

export interface UpdateIncidentData {
    status?: 'open' | 'investigating' | 'resolved' | 'closed';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    assigned_to?: number | null;
    title?: string;
    description?: string;
}

export const incidentService = {
    getIncidents: async (params?: IncidentFilterParams): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/incidents', { params });
        return response.data;
    },

    getIncident: async (id: number): Promise<ApiResponse<Incident>> => {
        const response = await api.get<ApiResponse<Incident>>(`/incidents/${id}`);
        return response.data;
    },

    updateIncident: async (id: number, data: UpdateIncidentData): Promise<ApiResponse<Incident>> => {
        const response = await api.patch<ApiResponse<Incident>>(`/incidents/${id}`, data);
        return response.data;
    },
};
