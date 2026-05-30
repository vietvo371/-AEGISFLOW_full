import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { HeatmapPoint, Route, MapBounds } from '../types/api/map';

const normalizeSheltersResponse = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.features)) {
        return payload.features.map((feature: any) => {
            const properties = feature.properties || {};
            const coordinates = feature.geometry?.coordinates || [];

            return {
                ...properties,
                latitude: Number(coordinates[1]),
                longitude: Number(coordinates[0]),
            };
        });
    }
    return [];
};

export const mapService = {
    getMapReports: async (bounds?: MapBounds, filters?: any): Promise<ApiResponse<any>> => {
        const params: any = { ...filters };
        if (bounds) {
            params.min_lon = bounds.min_lon;
            params.min_lat = bounds.min_lat;
            params.max_lon = bounds.max_lon;
            params.max_lat = bounds.max_lat;
        }
        try {
            const response = await api.get<ApiResponse<any>>('/map/incidents', { params });
            return response.data;
        } catch (error: any) {
            // Nếu chưa đăng nhập hoặc token hết hạn (401), tự động lấy dữ liệu public incidents
            if (error.response?.status === 401 || !error.response) {
                const response = await api.get<any>('/public/incidents', { params });
                return {
                    success: true,
                    message: 'Loaded public reports',
                    data: response.data
                };
            }
            throw error;
        }
    },

    getFloodZones: async (): Promise<any> => {
        const response = await api.get('/public/flood-zones/geojson');
        return response.data;
    },

    getShelters: async (): Promise<ApiResponse<any[]>> => {
        try {
            const response = await api.get<any>('/map/shelters');
            return {
                success: true,
                message: response.data?.message || '',
                data: normalizeSheltersResponse(response.data),
            };
        } catch (error: any) {
            if (error?.response?.status === 401 || !error?.response) {
                const response = await api.get<any>('/public/map/shelters');
                return {
                    success: true,
                    message: response.data?.message || 'Loaded public shelters',
                    data: normalizeSheltersResponse(response.data),
                };
            }
            throw error;
        }
    },

    getHeatmap: async (_days: number = 7): Promise<ApiResponse<HeatmapPoint[]>> => {
        // Backend không có heatmap endpoint - trả về empty
        return { success: true, message: '', data: [] };
    },

    getTrafficEdges: async (): Promise<any> => {
        // Backend không có edges endpoint
        return { type: 'FeatureCollection', features: [] };
    },

    getClusters: async (_zoom: number): Promise<ApiResponse<import('../types/api/map').ClusterMarker[]>> => {
        // Backend không có clusters endpoint - dùng incidents thường
        const response = await api.get<ApiResponse<any[]>>('/map/incidents');
        return response.data;
    },

    getRoutes: async (): Promise<ApiResponse<Route[]>> => {
        // Backend không có routes endpoint - trả về empty
        return { success: true, message: '', data: [] };
    },

    reverseGeocode: async (lat: number, long: number): Promise<string> => {
        try {
            const response = await api.get('/map/geocode/reverse', {
                params: { lat, lng: long },
            });
            const data = response.data;
            const result = data?.results?.[0] || data?.result || data;
            const address =
                result?.formatted_address ||
                result?.address ||
                result?.display_name ||
                data?.formatted_address ||
                data?.address;
            if (address) return address;
            return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
        } catch (error) {
            return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
        }
    },

    forwardGeocode: async (query: string): Promise<any[]> => {
        const response = await api.get('/map/geocode/forward', {
            params: { text: query },
        });
        const data = response.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.data)) return data.data;
        return Array.isArray(data) ? data : [];
    }
};
