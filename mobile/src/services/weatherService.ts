import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  condition: string;
  timestamp: string;
}

export interface WeatherSummary {
  current: WeatherData;
  forecast: string;
  alert_level: 'none' | 'low' | 'medium' | 'high';
}

export const weatherService = {
  getCurrent: async (): Promise<WeatherData> => {
    const response = await api.get<ApiResponse<WeatherData>>('/weather/current');
    return response.data.data;
  },

  getHistory: async (): Promise<WeatherData[]> => {
    const response = await api.get<ApiResponse<WeatherData[]>>('/weather/history');
    return response.data.data;
  },

  getSummary: async (): Promise<WeatherSummary> => {
    const response = await api.get<ApiResponse<WeatherSummary>>('/weather/summary');
    return response.data.data;
  },
};
