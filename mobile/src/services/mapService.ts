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
        const response = await api.get<ApiResponse<HeatmapPoint[]>>('/map/heatmap', {
            params: { days }
        });
        return response.data;
    },

    getTrafficEdges: async (): Promise<any> => {
        const response = await api.get('/edges/geojson');
        return response.data;
    },

    getClusters: async (zoom: number): Promise<ApiResponse<import('../types/api/map').ClusterMarker[]>> => {
        const response = await api.get<ApiResponse<import('../types/api/map').ClusterMarker[]>>('/map/clusters', {
            params: { zoom }
        });
        return response.data;
    },

    getRoutes: async (): Promise<ApiResponse<Route[]>> => {
        // Note: API returns "coming soon" - placeholder for future GTFS routes
        const response = await api.get<ApiResponse<Route[]>>('/map/routes');
        return response.data;
    },

    reverseGeocode: async (lat: number, long: number): Promise<string> => {
        try {
            // Using OpenStreetMap Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'CityResQ360App/1.0', // Required by Nominatim usage policy
                        'Accept-Language': 'vi' // Request Vietnamese results
                    }
                }
            );
            const data = await response.json();
            console.log('Reverse geocoding response:', data);
            if (data.display_name) {
                return data.display_name;
            }
            return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
        }
    }
};
