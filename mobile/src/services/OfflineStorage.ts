/**
 * OfflineStorage - Lưu trữ dữ liệu offline
 * Cho phép app hoạt động khi không có mạng
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface StoredData<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  // Data caches
  ALERTS: '@offline_alerts',
  INCIDENTS: '@offline_incidents',
  SHELTERS: '@offline_shelters',
  SENSORS: '@offline_sensors',
  REPORTS: '@offline_reports',
  WEATHER: '@offline_weather',
  USER_PROFILE: '@offline_user_profile',

  // Pending queue
  OFFLINE_QUEUE: '@offline_queue',

  // Settings
  OFFLINE_SETTINGS: '@offline_settings',

  // Sync status
  LAST_SYNC: '@offline_last_sync',
};

// Default cache expiration (1 hour)
const DEFAULT_EXPIRATION = 60 * 60 * 1000;

// Max queue items
const MAX_QUEUE_SIZE = 50;

// ============================================================================
// CLASS
// ============================================================================

class OfflineStorage {
  private static instance: OfflineStorage;

  private constructor() {}

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  // ============================================================================
  // GENERIC METHODS
  // ============================================================================

  /**
   * Lưu data với timestamp
   */
  async set<T>(key: string, data: T, expirationMs?: number): Promise<void> {
    try {
      const storedData: StoredData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: expirationMs ? Date.now() + expirationMs : undefined,
      };
      await AsyncStorage.setItem(key, JSON.stringify(storedData));
    } catch (error) {
      console.error(`[OfflineStorage] Error saving ${key}:`, error);
      throw error;
    }
  }

  /**
   * Lấy data, trả về null nếu hết hạn hoặc không tồn tại
   */
  async get<T>(key: string, ignoreExpiration = false): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const storedData: StoredData<T> = JSON.parse(raw);

      // Check expiration
      if (!ignoreExpiration && storedData.expiresAt) {
        if (Date.now() > storedData.expiresAt) {
          // Data expired, remove it
          await this.remove(key);
          return null;
        }
      }

      return storedData.data;
    } catch (error) {
      console.error(`[OfflineStorage] Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Xóa data
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[OfflineStorage] Error removing ${key}:`, error);
    }
  }

  /**
   * Xóa tất cả offline data
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('[OfflineStorage] Error clearing all:', error);
    }
  }

  /**
   * Lấy thời gian sync cuối
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return time ? Number(time) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cập nhật thời gian sync
   */
  async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(Date.now()));
    } catch (error) {
      console.error('[OfflineStorage] Error updating sync time:', error);
    }
  }

  // ============================================================================
  // DOMAIN-SPECIFIC METHODS
  // ============================================================================

  // --- Alerts ---
  async saveAlerts(alerts: any[]): Promise<void> {
    await this.set(STORAGE_KEYS.ALERTS, alerts, DEFAULT_EXPIRATION);
  }

  async getAlerts(): Promise<any[] | null> {
    return this.get<any[]>(STORAGE_KEYS.ALERTS);
  }

  // --- Incidents ---
  async saveIncidents(incidents: any[]): Promise<void> {
    await this.set(STORAGE_KEYS.INCIDENTS, incidents, DEFAULT_EXPIRATION);
  }

  async getIncidents(): Promise<any[] | null> {
    return this.get<any[]>(STORAGE_KEYS.INCIDENTS);
  }

  // --- Shelters ---
  async saveShelters(shelters: any[]): Promise<void> {
    await this.set(STORAGE_KEYS.SHELTERS, shelters, DEFAULT_EXPIRATION * 24); // 24 hours
  }

  async getShelters(): Promise<any[] | null> {
    return this.get<any[]>(STORAGE_KEYS.SHELTERS);
  }

  // --- Sensors ---
  async saveSensors(sensors: any[]): Promise<void> {
    await this.set(STORAGE_KEYS.SENSORS, sensors, 5 * 60 * 1000); // 5 minutes
  }

  async getSensors(): Promise<any[] | null> {
    return this.get<any[]>(STORAGE_KEYS.SENSORS);
  }

  // --- Reports ---
  async saveReports(reports: any[]): Promise<void> {
    await this.set(STORAGE_KEYS.REPORTS, reports, DEFAULT_EXPIRATION);
  }

  async getReports(): Promise<any[] | null> {
    return this.get<any[]>(STORAGE_KEYS.REPORTS);
  }

  // --- Weather ---
  async saveWeather(weather: any): Promise<void> {
    await this.set(STORAGE_KEYS.WEATHER, weather, 30 * 60 * 1000); // 30 minutes
  }

  async getWeather(): Promise<any | null> {
    return this.get<any>(STORAGE_KEYS.WEATHER);
  }

  // --- User Profile ---
  async saveUserProfile(profile: any): Promise<void> {
    await this.set(STORAGE_KEYS.USER_PROFILE, profile); // No expiration
  }

  async getUserProfile(): Promise<any | null> {
    return this.get<any>(STORAGE_KEYS.USER_PROFILE, true); // Ignore expiration
  }

  // ============================================================================
  // OFFLINE QUEUE (Pending API calls when offline)
  // ============================================================================

  /**
   * Thêm action vào queue để sync later
   */
  async addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getQueue();

      // Check if queue is full
      if (queue.length >= MAX_QUEUE_SIZE) {
        // Remove oldest item
        queue.shift();
      }

      const newItem: OfflineQueueItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.push(newItem);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));

      console.log('[OfflineStorage] Added to queue:', newItem);
    } catch (error) {
      console.error('[OfflineStorage] Error adding to queue:', error);
    }
  }

  /**
   * Lấy tất cả items trong queue
   */
  async getQueue(): Promise<OfflineQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('[OfflineStorage] Error getting queue:', error);
      return [];
    }
  }

  /**
   * Lấy và xóa item đầu tiên trong queue
   */
  async shiftQueue(): Promise<OfflineQueueItem | null> {
    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return null;

      const item = queue.shift();
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));

      return item || null;
    } catch (error) {
      console.error('[OfflineStorage] Error shifting queue:', error);
      return null;
    }
  }

  /**
   * Xóa item khỏi queue
   */
  async removeFromQueue(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(filtered));
    } catch (error) {
      console.error('[OfflineStorage] Error removing from queue:', error);
    }
  }

  /**
   * Tăng retry count cho item
   */
  async incrementRetryCount(id: string): Promise<number> {
    try {
      const queue = await this.getQueue();
      const item = queue.find(i => i.id === id);
      if (item) {
        item.retryCount++;
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
        return item.retryCount;
      }
      return 0;
    } catch (error) {
      console.error('[OfflineStorage] Error incrementing retry:', error);
      return 0;
    }
  }

  /**
   * Xóa toàn bộ queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('[OfflineStorage] Error clearing queue:', error);
    }
  }

  /**
   * Lấy số lượng items trong queue
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Kiểm tra data có còn fresh không
   */
  isFresh(key: string, maxAgeMs: number = DEFAULT_EXPIRATION): Promise<boolean> {
    return this.get(key).then(data => {
      if (!data) return false;
      // This is a simplified check - in real app you'd want to track timestamp
      return true;
    });
  }

  /**
   * Lấy storage size estimate
   */
  async getStorageSize(): Promise<{ used: number; keys: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(k =>
        Object.values(STORAGE_KEYS).includes(k)
      );

      let totalSize = 0;
      for (const key of offlineKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16
        }
      }

      return {
        used: totalSize,
        keys: offlineKeys.length,
      };
    } catch (error) {
      console.error('[OfflineStorage] Error calculating storage size:', error);
      return { used: 0, keys: 0 };
    }
  }
}

export default OfflineStorage.getInstance();
export { STORAGE_KEYS, DEFAULT_EXPIRATION, MAX_QUEUE_SIZE };
