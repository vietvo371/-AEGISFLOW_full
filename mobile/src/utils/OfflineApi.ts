/**
 * OfflineApi - API wrapper với offline support
 * Tự động cache data và queue requests khi offline
 */

import api from './Api';
import OfflineStorage from '../services/OfflineStorage';
import NetInfo from '@react-native-community/netinfo';

// ============================================================================
// TYPES
// ============================================================================

interface RequestConfig {
  cacheKey?: string;
  cacheExpiration?: number; // ms
  skipCache?: boolean;
  skipQueue?: boolean;
  onOffline?: 'cache' | 'queue' | 'error';
}

interface ApiResponse<T = any> {
  data: T;
  cached?: boolean;
}

// ============================================================================
// OFFLINE API
// ============================================================================

class OfflineApi {
  private static instance: OfflineApi;

  private constructor() {}

  static getInstance(): OfflineApi {
    if (!OfflineApi.instance) {
      OfflineApi.instance = new OfflineApi();
    }
    return OfflineApi.instance;
  }

  /**
   * Kiểm tra trạng thái mạng
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  }

  /**
   * GET request với offline support
   */
  async get<T = any>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { cacheKey, cacheExpiration, skipCache = false } = config;

    const online = await this.isOnline();

    // OFFLINE: Trả về cache
    if (!online) {
      if (cacheKey) {
        const cached = await OfflineStorage.get<T>(cacheKey);
        if (cached) {
          console.log(`[OfflineApi] GET ${url} - served from cache`);
          return { data: cached, cached: true };
        }
      }
      throw new Error('Không có kết nối mạng và không có dữ liệu cache');
    }

    // ONLINE: Gọi API
    try {
      const response = await api.get<T>(url);
      const data = response.data;

      // Cache nếu có key
      if (cacheKey && !skipCache) {
        await OfflineStorage.set(
          cacheKey,
          data,
          cacheExpiration || 60 * 60 * 1000 // Default 1 hour
        );
      }

      return { data, cached: false };
    } catch (error) {
      // Nếu API fail, thử cache
      if (cacheKey) {
        const cached = await OfflineStorage.get<T>(cacheKey);
        if (cached) {
          console.log(`[OfflineApi] GET ${url} - API failed, served from cache`);
          return { data: cached, cached: true };
        }
      }
      throw error;
    }
  }

  /**
   * POST/PUT/PATCH/DELETE với offline queue support
   */
  async request<T = any>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { skipQueue = false, onOffline = 'queue' } = config;

    const online = await this.isOnline();

    // OFFLINE
    if (!online) {
      if (onOffline === 'error') {
        throw new Error('Không có kết nối mạng');
      }

      if (onOffline === 'queue' && !skipQueue) {
        // Thêm vào queue
        await OfflineStorage.addToQueue({
          endpoint: url,
          method,
          payload: data,
          type: method === 'DELETE' ? 'delete' : method === 'PUT' || method === 'PATCH' ? 'update' : 'create',
        });
        console.log(`[OfflineApi] ${method} ${url} - queued for later`);
        return { data: { queued: true } as any, cached: false };
      }

      throw new Error('Không có kết nối mạng');
    }

    // ONLINE: Gọi API
    try {
      const response = await api.request<T>({
        method,
        url,
        data,
      });
      return { data: response.data, cached: false };
    } catch (error) {
      // Nếu fail và có queue option
      if (onOffline === 'queue' && !skipQueue) {
        await OfflineStorage.addToQueue({
          endpoint: url,
          method,
          payload: data,
          type: method === 'DELETE' ? 'delete' : method === 'PUT' || method === 'PATCH' ? 'update' : 'create',
        });
        console.log(`[OfflineApi] ${method} ${url} - queued after failed request`);
        return { data: { queued: true } as any, cached: false };
      }
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export default OfflineApi.getInstance();
export { OfflineApi, RequestConfig, ApiResponse };
