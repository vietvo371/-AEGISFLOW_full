import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';

export interface WeatherData {
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  condition: string;
  timestamp: string | null;
}

export interface WeatherSummary {
  current: WeatherData;
  forecast: string;
  alert_level: 'none' | 'low' | 'medium' | 'high';
}

interface BackendWeatherRecord {
  temperature_c?: number | string | null;
  humidity_pct?: number | string | null;
  rainfall_mm?: number | string | null;
  wind_speed_kmh?: number | string | null;
  cloud_cover_pct?: number | string | null;
  recorded_at?: string | null;
}

interface BackendWeatherSummary {
  districts?: Array<{
    avg_humidity_pct?: number | string | null;
    max_rainfall_mm?: number | string | null;
  }>;
}

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const inferCondition = (record: BackendWeatherRecord): string => {
  const rainfall = toNumber(record.rainfall_mm) ?? 0;
  const cloudCover = toNumber(record.cloud_cover_pct) ?? 0;

  if (rainfall >= 10) return 'Heavy Rain';
  if (rainfall > 0) return 'Rain';
  if (cloudCover >= 70) return 'Cloudy';
  return 'Clear';
};

const average = (values: Array<number | null>): number | null => {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) return null;
  return Math.round((validValues.reduce((sum, value) => sum + value, 0) / validValues.length) * 10) / 10;
};

const maxValue = (values: Array<number | null>): number | null => {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) return null;
  return Math.max(...validValues);
};

const normalizeWeather = (record?: BackendWeatherRecord | null): WeatherData => ({
  temperature: toNumber(record?.temperature_c),
  humidity: toNumber(record?.humidity_pct),
  rainfall: toNumber(record?.rainfall_mm),
  wind_speed: toNumber(record?.wind_speed_kmh),
  condition: record ? inferCondition(record) : 'Cloudy',
  timestamp: record?.recorded_at ?? null,
});

const normalizeCurrentWeather = (data: unknown): WeatherData => {
  const records = Array.isArray(data)
    ? data as BackendWeatherRecord[]
    : data && typeof data === 'object'
      ? Object.values(data as Record<string, BackendWeatherRecord>)
      : [];

  if (records.length === 0) return normalizeWeather(null);

  const timestamps = records
    .map(record => record.recorded_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;

  return normalizeWeather({
    temperature_c: average(records.map(record => toNumber(record.temperature_c))),
    humidity_pct: average(records.map(record => toNumber(record.humidity_pct))),
    rainfall_mm: maxValue(records.map(record => toNumber(record.rainfall_mm))),
    wind_speed_kmh: average(records.map(record => toNumber(record.wind_speed_kmh))),
    cloud_cover_pct: maxValue(records.map(record => toNumber(record.cloud_cover_pct))),
    recorded_at: latestTimestamp,
  });
};

const getAlertLevel = (summary?: BackendWeatherSummary): WeatherSummary['alert_level'] => {
  const districts = summary?.districts ?? [];
  const maxRainfall = Math.max(0, ...districts.map(item => toNumber(item.max_rainfall_mm) ?? 0));
  const maxHumidity = Math.max(0, ...districts.map(item => toNumber(item.avg_humidity_pct) ?? 0));

  if (maxRainfall >= 50 || maxHumidity >= 95) return 'high';
  if (maxRainfall >= 20 || maxHumidity >= 85) return 'medium';
  if (maxRainfall > 0 || maxHumidity >= 75) return 'low';
  return 'none';
};

export const weatherService = {
  getCurrent: async (): Promise<WeatherData> => {
    const response = await api.get<ApiResponse<BackendWeatherRecord[]>>('/weather/current');
    return normalizeCurrentWeather(response.data.data);
  },

  getHistory: async (): Promise<WeatherData[]> => {
    return [];
  },

  getSummary: async (): Promise<WeatherSummary> => {
    const [current, summaryResponse] = await Promise.all([
      weatherService.getCurrent(),
      api.get<ApiResponse<BackendWeatherSummary>>('/weather/summary'),
    ]);

    return {
      current,
      forecast: current.condition,
      alert_level: getAlertLevel(summaryResponse.data.data),
    };
  },
};
