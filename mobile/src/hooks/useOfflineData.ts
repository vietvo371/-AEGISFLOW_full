/**
 * useOfflineData - Hook để truy cập offline data và network state
 * Cung cấp interface đơn giản cho components
 */

import { useCallback, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { useOfflineData } from '../contexts/OfflineDataContext';
import api from '../utils/Api';
import env from '../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface UseFetchOptions<T> {
  /** Endpoint để fetch */
  endpoint: string;
  /** Storage key để cache */
  storageKey?: string;
  /** Transform data trước khi cache */
  transform?: (data: any) => T;
  /** Auto fetch khi mount */
  immediate?: boolean;
  /** Refresh interval in ms (0 = no refresh) */
  refreshInterval?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface UseFetchResult<T> {
  /** Data từ server hoặc cache */
  data: T | null;
  /** Đang loading */
  loading: boolean;
  /** Có lỗi không */
  error: Error | null;
  /** Có đang dùng data từ cache không */
  isFromCache: boolean;
  /** Refresh data */
  refresh: () => Promise<void>;
  /** Sync data lên server (cho offline queue) */
  syncToServer: (
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload?: any
  ) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook để fetch data với offline support
 * @example
 * const { data, loading, refresh } = useFetch({
 *   endpoint: '/api/alerts',
 *   storageKey: 'alerts',
 *   immediate: true,
 * });
 */
export function useFetch<T = any>(options: UseFetchOptions<T>): UseFetchResult<T> {
  const {
    endpoint,
    storageKey,
    transform,
    immediate = true,
    refreshInterval = 0,
    headers = {},
  } = options;

  const { isOnline } = useNetwork();
  const {
    isOnline: offlineOnline,
    cacheAlerts,
    cacheIncidents,
    cacheShelters,
    cacheSensors,
    cacheReports,
    cacheWeather,
    addPendingAction,
  } = useOfflineData();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Cache function mapper
  const cacheMapper: Record<string, (data: any) => Promise<void>> = {
    alerts: cacheAlerts,
    incidents: cacheIncidents,
    shelters: cacheShelters,
    sensors: cacheSensors,
    reports: cacheReports,
    weather: cacheWeather,
  };

  // Fetch data từ server
  const fetchFromServer = useCallback(async () => {
    if (!isOnline) {
      console.log('[useFetch] Offline, skipping server fetch');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(endpoint, { headers });
      const result = response.data;

      // Transform nếu có
      const transformedData = transform ? transform(result) : result;

      // Cache nếu có storageKey
      if (storageKey && cacheMapper[storageKey]) {
        await cacheMapper[storageKey](Array.isArray(result) ? result : result.data || result);
      }

      setData(transformedData);
      setIsFromCache(false);

      return transformedData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      console.error(`[useFetch] Error fetching ${endpoint}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, headers, isOnline, storageKey, transform, cacheMapper]);

  // Load from cache
  const loadFromCache = useCallback(async () => {
    if (!storageKey) return null;

    try {
      const OfflineStorage = require('../services/OfflineStorage').default;
      const cachedData = await OfflineStorage.get(
        storageKey.startsWith('@') ? storageKey : `@offline_${storageKey}`
      );

      if (cachedData) {
        const transformedData = transform ? transform(cachedData) : cachedData;
        setData(transformedData);
        setIsFromCache(true);
        return transformedData;
      }
    } catch (err) {
      console.error(`[useFetch] Error loading cache for ${storageKey}:`, err);
    }

    return null;
  }, [storageKey, transform]);

  // Main refresh function
  const refresh = useCallback(async () => {
    // Luôn ưu tiên server
    const serverData = await fetchFromServer();

    // Nếu không fetch được server, thử cache
    if (!serverData) {
      await loadFromCache();
    }
  }, [fetchFromServer, loadFromCache]);

  // Sync data to server (cho offline queue)
  const syncToServer = useCallback(
    async (method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', payload?: any) => {
      const normalizedMethod = method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE';

      if (isOnline) {
        // Online: gọi trực tiếp
        try {
          const response = await api.request({
            method: normalizedMethod,
            url: endpoint,
            data: payload,
            headers,
          });
          // Refresh data after sync
          await refresh();
          return response.data;
        } catch (err) {
          console.error(`[useFetch] Sync error:`, err);
          throw err;
        }
      } else {
        // Offline: thêm vào queue
        await addPendingAction(endpoint, normalizedMethod, payload, 'create');
        console.log(`[useFetch] Added to offline queue: ${normalizedMethod} ${endpoint}`);
      }
    },
    [endpoint, headers, isOnline, addPendingAction, refresh]
  );

  // Initial fetch
  useEffect(() => {
    if (immediate) {
      refresh();
    }
  }, []);

  // Auto refresh interval
  useEffect(() => {
    if (!immediate || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [immediate, refreshInterval, refresh]);

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh,
    syncToServer,
  };
}

// ============================================================================
// PRESET HOOKS - Các hooks preset cho từng loại data
// ============================================================================

/**
 * Hook để fetch alerts
 */
export function useAlerts(immediate = true) {
  return useFetch({
    endpoint: '/api/alerts',
    storageKey: 'alerts',
    immediate,
  });
}

/**
 * Hook để fetch incidents
 */
export function useIncidents(immediate = true) {
  return useFetch({
    endpoint: '/api/incidents',
    storageKey: 'incidents',
    immediate,
  });
}

/**
 * Hook để fetch shelters
 */
export function useShelters(immediate = true) {
  return useFetch({
    endpoint: '/api/shelters',
    storageKey: 'shelters',
    immediate,
  });
}

/**
 * Hook để fetch sensors
 */
export function useSensors(immediate = true, refreshInterval = 30000) {
  return useFetch({
    endpoint: '/api/sensors',
    storageKey: 'sensors',
    immediate,
    refreshInterval,
  });
}

/**
 * Hook để fetch weather
 */
export function useWeather(immediate = true, refreshInterval = 1800000) {
  return useFetch({
    endpoint: '/api/weather',
    storageKey: 'weather',
    immediate,
    refreshInterval,
  });
}

/**
 * Hook để fetch reports của user
 */
export function useReports(immediate = true) {
  return useFetch({
    endpoint: '/api/reports/my',
    storageKey: 'reports',
    immediate,
  });
}

// ============================================================================
// STATE HOOKS (để import)
// ============================================================================

import { useState } from 'react';

export { useState };
