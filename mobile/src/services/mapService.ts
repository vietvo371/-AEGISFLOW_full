import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { MapReport, HeatmapPoint, Route, MapBounds } from '../types/api/map';
import env from '../config/env';

export const mapService = {
    getMapReports: async (): Promise<ApiResponse<MapReport[]>> => {
        const response = await api.get<ApiResponse<MapReport[]>>('/map/incidents');
        return response.data;
    },

    getFloodZones: async (): Promise<any> => {
        const response = await api.get('/public/flood-zones/geojson');
        return response.data;
    },

    getShelters: async (): Promise<ApiResponse<any[]>> => {
        const response = await api.get<ApiResponse<any[]>>('/map/shelters');
        return response.data;
    },

    getHeatmap: async (days: number = 7): Promise<ApiResponse<HeatmapPoint[]>> => {
        // Backend không có heatmap endpoint - trả về empty
        return { success: true, message: '', data: [] };
    },

    getTrafficEdges: async (): Promise<any> => {
        // Backend không có edges endpoint
        return { type: 'FeatureCollection', features: [] };
    },

    getClusters: async (zoom: number): Promise<ApiResponse<import('../types/api/map').ClusterMarker[]>> => {
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
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'AegisFlowAI/1.0',
                        'Accept-Language': 'vi'
                    }
                }
            );
            const data = await response.json();
            if (data.display_name) {
                return data.display_name;
            }
            return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
        } catch (error) {
            return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
        }
    }
};
