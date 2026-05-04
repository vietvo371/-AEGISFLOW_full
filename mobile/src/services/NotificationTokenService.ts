/**
 * NotificationTokenService - Quản lý FCM token
 * Tích hợp với FcmTokenController backend
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL } from '../utils/Api';
import { authService } from './authService';
import PushNotificationHelper from '../utils/PushNotificationHelper';

const FCM_TOKEN_KEY = '@fcm_token';
const DEVICE_ID_KEY = '@device_id';

interface DeviceInfo {
  deviceId: string;
  deviceType: 'ios' | 'android' | 'web';
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
}

class NotificationTokenService {
  /**
   * Lấy hoặc tạo device ID
   */
  static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `device_${Date.now()}`;
    }
  }

  /**
   * Lưu FCM token vào AsyncStorage
   */
  static async saveFCMToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    } catch (error) {
      console.error('Lỗi khi lưu FCM token:', error);
    }
  }

  /**
   * Lấy FCM token từ AsyncStorage
   */
  static async getSavedFCMToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch (error) {
      console.error('Lỗi khi lấy FCM token:', error);
      return null;
    }
  }

  /**
   * Xóa FCM token khỏi AsyncStorage
   */
  static async clearFCMToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    } catch (error) {
      console.error('Lỗi khi xóa FCM token:', error);
    }
  }

  /**
   * Lấy thông tin thiết bị
   */
  static async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getOrCreateDeviceId();
    
    return {
      deviceId,
      deviceType: Platform.OS as 'ios' | 'android' | 'web',
      deviceName: Platform.select({
        ios: 'iPhone',
        android: 'Android Device',
        default: 'Unknown Device',
      }) || 'Unknown Device',
      osVersion: Platform.Version?.toString(),
    };
  }

  /**
   * Đăng ký FCM token với server khi user đăng nhập
   */
  static async registerTokenAfterLogin(): Promise<{ success: boolean; deviceId?: number }> {
    try {
      // Kiểm tra quyền thông báo
      const hasPermission = await PushNotificationHelper.checkPermission();
      
      if (!hasPermission) {
        const granted = await PushNotificationHelper.requestPermission();
        if (!granted) {
          console.log('Người dùng từ chối quyền thông báo');
          return { success: false };
        }
      }

      // Lấy FCM token
      const fcmToken = await PushNotificationHelper.getToken();
      if (!fcmToken) {
        console.error('Không thể lấy FCM token');
        return { success: false };
      }

      // Lưu token local
      await this.saveFCMToken(fcmToken);

      // Lấy thông tin thiết bị
      const deviceInfo = await this.getDeviceInfo();

      // Đăng ký với server
      const result = await this.registerDeviceWithServer(fcmToken, deviceInfo);
      
      return result;
    } catch (error) {
      console.error('Lỗi nghiêm trọng trong quá trình đăng ký FCM token:', error);
      return { success: false };
    }
  }

  /**
   * Đăng ký device với server
   */
  static async registerDeviceWithServer(
    fcmToken: string,
    deviceInfo: DeviceInfo
  ): Promise<{ success: boolean; deviceId?: number }> {
    try {
      const response = await api.post('/fcm/register', {
        fcm_token: fcmToken,
        device_type: deviceInfo.deviceType,
        device_name: deviceInfo.deviceName,
        device_model: deviceInfo.deviceModel,
        os_version: deviceInfo.osVersion,
      });

      console.log('Đã đăng ký FCM token thành công:', response.data);
      return { success: true, deviceId: response.data.data?.device_id };
    } catch (error: any) {
      console.warn('Lỗi khi đăng ký FCM token:', error?.response?.data || error);
      return { success: false };
    }
  }

  /**
   * Cập nhật FCM token khi token bị refresh
   */
  static async updateTokenOnRefresh(newToken: string): Promise<boolean> {
    try {
      await this.saveFCMToken(newToken);

      const deviceInfo = await this.getDeviceInfo();
      const result = await this.registerDeviceWithServer(newToken, deviceInfo);
      
      return result.success;
    } catch (error) {
      console.error('Lỗi khi cập nhật FCM token:', error);
      return false;
    }
  }

  /**
   * Refresh token - thay thế token cũ bằng token mới
   */
  static async refreshToken(oldToken: string, newToken: string): Promise<boolean> {
    try {
      const response = await api.post('/fcm/refresh', {
        old_token: oldToken,
        new_token: newToken,
      });

      if (response.data.success) {
        await this.saveFCMToken(newToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Lỗi khi refresh token:', error);
      return false;
    }
  }

  /**
   * Lấy danh sách devices của user
   */
  static async getDevices(): Promise<any[]> {
    try {
      const response = await api.get('/fcm/devices');
      return response.data.data?.devices || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách devices:', error);
      return [];
    }
  }

  /**
   * Xóa device
   */
  static async deleteDevice(deviceId: number): Promise<boolean> {
    try {
      const response = await api.delete(`/fcm/devices/${deviceId}`);
      return response.data.success;
    } catch (error) {
      console.error('Lỗi khi xóa device:', error);
      return false;
    }
  }

  /**
   * Cập nhật notification settings cho device
   */
  static async updateDeviceSettings(
    deviceId: number,
    settings: {
      notification_enabled?: boolean;
      notification_settings?: Record<string, boolean>;
    }
  ): Promise<boolean> {
    try {
      const response = await api.put(`/fcm/devices/${deviceId}`, settings);
      return response.data.success;
    } catch (error) {
      console.error('Lỗi khi cập nhật device settings:', error);
      return false;
    }
  }

  /**
   * Hủy đăng ký FCM token khi user đăng xuất
   */
  static async unregisterTokenAfterLogout(): Promise<boolean> {
    try {
      // Lấy current token để xóa trên server
      const currentToken = await this.getSavedFCMToken();

      if (currentToken) {
        try {
          // Xóa device bằng token
          const encodedToken = encodeURIComponent(currentToken);
          await api.delete(`/fcm/token/${encodedToken}`);
        } catch (e) {
          console.warn('Không xóa được FCM token trên server:', e);
        }
      }

      // Xóa token khỏi Firebase
      await PushNotificationHelper.deleteToken();

      // Xóa token khỏi AsyncStorage
      await this.clearFCMToken();

      return true;
    } catch (error) {
      console.error('Lỗi khi hủy đăng ký FCM token:', error);
      return false;
    }
  }

  /**
   * Subscribe topic FCM
   */
  static async subscribeTopic(topic: string): Promise<boolean> {
    try {
      const response = await api.post('/fcm/subscribe', { topic });
      return response.data.success;
    } catch (error) {
      console.error('Lỗi khi subscribe topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe topic FCM
   */
  static async unsubscribeTopic(topic: string): Promise<boolean> {
    try {
      const response = await api.post('/fcm/unsubscribe', { topic });
      return response.data.success;
    } catch (error) {
      console.error('Lỗi khi unsubscribe topic:', error);
      return false;
    }
  }
}

export default NotificationTokenService;
export { DeviceInfo };
