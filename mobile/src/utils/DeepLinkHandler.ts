/**
 * DeepLinkHandler - Xử lý deep linking và mở app từ notification
 * Hỗ trợ các URL schemes: aegisflow:// và https://aegisflow.app
 */

import { Linking, AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationService, navigate } from '../navigation/NavigationService';
import { scheduleNavigateFromPush, extractTypeFromPushData } from '../navigation/navigateFromPushNotification';
import PushNotificationHelper from './PushNotificationHelper';

// ============================================================================
// TYPES
// ============================================================================

export interface DeepLinkData {
  type: 'incident' | 'alert' | 'shelter' | 'report' | 'notification' | 'referral' | 'unknown';
  id?: number | string;
  params?: Record<string, any>;
}

interface NotificationData {
  type?: string;
  id?: string | number;
  incident_id?: string | number;
  alert_id?: string | number;
  report_id?: string | number;
  shelter_id?: string | number;
  [key: string]: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  PENDING_DEEP_LINK: 'pending_deep_link',
  PENDING_NOTIFICATION: 'pending_notification',
};

/**
 * URL scheme được hỗ trợ:
 * - aegisflow://incident/{id}
 * - aegisflow://alert/{id}
 * - aegisflow://shelter/{id}
 * - aegisflow://report/{id}
 * - aegisflow://notification/{id}
 *
 * Hoặc qua HTTP:
 * - https://aegisflow.app/incident/{id}
 * - https://aegisflow.app/alert/{id}
 * - https://aegisflow.app/shelter/{id}
 * - https://aegisflow.app/report/{id}
 * - https://aegisflow.app/notification/{id}
 */

const SUPPORTED_PATHS = ['incident', 'alert', 'shelter', 'report', 'notification'];

// ============================================================================
// CLASS
// ============================================================================

class DeepLinkHandler {
  static isInitialized = false;
  static appStateSubscription: any = null;

  /**
   * Khởi tạo DeepLinkHandler
   * Gọi trong App.tsx sau khi navigation đã sẵn sàng
   */
  static init() {
    if (this.isInitialized) return;

    console.log('[DeepLink] Initializing...');

    // 1. Xử lý deep link khi app được MỞ lần đầu từ deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        this.handleURL(url);
      } else {
        // Không có URL, kiểm tra notification đã lưu trước đó
        this.checkPendingNotification();
      }
    });

    // 2. Xử lý deep link khi app đã chạy và nhận deep link mới
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] URL received:', url);
      this.handleURL(url);
    });

    // 3. Xử lý khi app từ background state
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // 4. Xử lý notification opened (app đang đóng, user tap notification)
    this.setupNotificationHandler();

    this.isInitialized = true;
    console.log('[DeepLink] Initialized successfully');
  }

  /**
   * Cleanup khi unmount
   */
  static cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
  }

  /**
   * Xử lý app state change - kiểm tra notification khi app resume
   */
  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Check pending notification khi app active
      await this.checkPendingNotification();
    }
  };

  /**
   * Setup notification handler cho cả foreground và background
   */
  private static setupNotificationHandler() {
    // Foreground: khi app đang mở, nhận notification
    PushNotificationHelper.onMessageReceived((message) => {
      console.log('[DeepLink] Foreground notification:', message);
      // Store notification data để xử lý sau
      this.storePendingNotification(message.data);
      
      // Navigate từ notification
      if (message.data) {
        scheduleNavigateFromPush(message);
      }
    });

    // Background/Quit: khi app đang đóng, user tap notification
    PushNotificationHelper.onNotificationOpened((message) => {
      console.log('[DeepLink] Notification opened from background:', message);
      this.handleNotificationOpen(message.data);
    });
  }

  /**
   * Kiểm tra và xử lý notification đã lưu trước đó
   */
  private static async checkPendingNotification() {
    try {
      // Kiểm tra xem app có được mở từ notification không
      const initialNotification = await PushNotificationHelper.getInitialNotification();
      if (initialNotification) {
        console.log('[DeepLink] Initial notification found:', initialNotification);
        await this.handleNotificationOpen(initialNotification.data);
        return;
      }

      // Kiểm tra pending notification trong storage
      const pending = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_NOTIFICATION);
      if (pending) {
        const notificationData = JSON.parse(pending);
        console.log('[DeepLink] Pending notification from storage:', notificationData);
        await this.handleNotificationOpen(notificationData);
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_NOTIFICATION);
      }
    } catch (error) {
      console.error('[DeepLink] Error checking pending notification:', error);
    }
  }

  /**
   * Lưu notification data để xử lý sau
   */
  private static async storePendingNotification(data: NotificationData) {
    if (!data) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_NOTIFICATION, JSON.stringify(data));
    } catch (error) {
      console.error('[DeepLink] Error storing pending notification:', error);
    }
  }

  /**
   * Xử lý notification được mở
   */
  private static async handleNotificationOpen(data: NotificationData) {
    if (!data) {
      console.log('[DeepLink] No notification data');
      return;
    }

    console.log('[DeepLink] Handling notification:', data);

    // Xác định type và id từ notification data
    const deepLinkData = this.parseNotificationData(data);
    await this.navigateToDeepLink(deepLinkData);
  }

  /**
   * Parse notification data thành DeepLinkData
   */
  private static parseNotificationData(data: NotificationData): DeepLinkData {
    // Ưu tiên field type nếu có
    if (data.type) {
      const type = this.normalizeType(data.type);
      return {
        type,
        id: this.extractId(data),
        params: data,
      };
    }

    // Kiểm tra các field id cụ thể
    if (data.incident_id) {
      return {
        type: 'incident',
        id: Number(data.incident_id),
        params: data,
      };
    }

    if (data.alert_id) {
      return {
        type: 'alert',
        id: Number(data.alert_id),
        params: data,
      };
    }

    if (data.report_id) {
      return {
        type: 'report',
        id: Number(data.report_id),
        params: data,
      };
    }

    if (data.shelter_id) {
      return {
        type: 'shelter',
        id: Number(data.shelter_id),
        params: data,
      };
    }

    if (data.id) {
      return {
        type: 'notification',
        id: Number(data.id),
        params: data,
      };
    }

    return { type: 'unknown', params: data };
  }

  /**
   * Normalize notification type
   */
  private static normalizeType(type: string): DeepLinkData['type'] {
    const typeMap: Record<string, DeepLinkData['type']> = {
      'incident': 'incident',
      'su_co': 'incident',
      'canh_bao': 'alert',
      'alert': 'alert',
      'warning': 'alert',
      'bao_dong': 'alert',
      'shelter': 'shelter',
      'tro': 'shelter',
      'san': 'shelter',
      'report': 'report',
      'bao_cao': 'report',
      'notification': 'notification',
      'thong_bao': 'notification',
    };

    return typeMap[type.toLowerCase()] || 'unknown';
  }

  /**
   * Extract id từ notification data
   */
  private static extractId(data: NotificationData): number | string | undefined {
    return data.incident_id || data.alert_id || data.report_id || data.shelter_id || data.id;
  }

  /**
   * Xử lý URL được mở
   */
  static async handleURL(url: string) {
    try {
      console.log('[DeepLink] Processing URL:', url);

      const deepLinkData = this.parseURL(url);
      await this.navigateToDeepLink(deepLinkData);
    } catch (error) {
      console.error('[DeepLink] Error handling URL:', error);
    }
  }

  /**
   * Parse URL thành DeepLinkData
   * Hỗ trợ: aegisflow://path/id và https://aegisflow.app/path/id
   */
  static parseURL(url: string): DeepLinkData {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;

      // Xử lý pathname (bỏ leading slash)
      const cleanPath = pathname.replace(/^\/+/, '');
      const segments = cleanPath.split('/').filter(Boolean);

      if (segments.length === 0) {
        return { type: 'unknown' };
      }

      const path = segments[0].toLowerCase();
      const id = segments.length > 1 ? segments[1] : undefined;

      // Kiểm tra path có được hỗ trợ không
      if (!SUPPORTED_PATHS.includes(path)) {
        // Kiểm tra path đặc biệt
        if (path === 'ref' && id) {
          return { type: 'referral', id };
        }
        return { type: 'unknown' };
      }

      return {
        type: path as DeepLinkData['type'],
        id: id ? (isNaN(Number(id)) ? id : Number(id)) : undefined,
        params: Object.fromEntries(parsedUrl.searchParams),
      };
    } catch (error) {
      console.error('[DeepLink] URL parse error:', error);
      return { type: 'unknown' };
    }
  }

  /**
   * Điều hướng đến màn hình tương ứng với deep link
   */
  static async navigateToDeepLink(data: DeepLinkData) {
    if (!data || data.type === 'unknown') {
      console.log('[DeepLink] Unknown deep link type, navigating to home');
      this.navigateToHome();
      return;
    }

    console.log('[DeepLink] Navigating to:', data);

    try {
      // Kiểm tra user đã login chưa (trừ notification có thể không cần)
      const isLoggedIn = !!(await AsyncStorage.getItem('@auth_token'));

      switch (data.type) {
        case 'incident':
          if (data.id && isLoggedIn) {
            navigate('IncidentDetail', { id: Number(data.id) });
          } else if (!isLoggedIn) {
            await this.storePendingDeepLink(data);
            navigate('Login');
          }
          break;

        case 'alert':
          // Alerts có thể xem không cần login
          navigate('ReportsScreen', { alertId: data.id });
          break;

        case 'shelter':
          if (data.id && isLoggedIn) {
            navigate('ShelterDetail', { shelterId: Number(data.id) });
          } else {
            navigate('ShelterList');
          }
          break;

        case 'report':
          if (data.id && isLoggedIn) {
            navigate('ReportDetail', { id: Number(data.id) });
          } else if (!isLoggedIn) {
            await this.storePendingDeepLink(data);
            navigate('Login');
          }
          break;

        case 'notification':
          navigate('Notifications');
          break;

        case 'referral':
          if (isLoggedIn) {
            // Referral có thể navigate đến màn hình giới thiệu
            navigate('Referral');
          } else {
            await this.storePendingDeepLink(data);
            navigate('Register');
          }
          break;

        default:
          this.navigateToHome();
      }
    } catch (error) {
      console.error('[DeepLink] Navigation error:', error);
      this.navigateToHome();
    }
  }

  /**
   * Lưu deep link để xử lý sau khi login
   */
  private static async storePendingDeepLink(data: DeepLinkData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_DEEP_LINK, JSON.stringify(data));
    } catch (error) {
      console.error('[DeepLink] Error storing pending deep link:', error);
    }
  }

  /**
   * Lấy và xóa pending deep link
   * Gọi sau khi user đã login thành công
   */
  static async getPendingDeepLink(): Promise<DeepLinkData | null> {
    try {
      const pending = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_DEEP_LINK);
      if (pending) {
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_DEEP_LINK);
        return JSON.parse(pending);
      }
      return null;
    } catch (error) {
      console.error('[DeepLink] Error getting pending deep link:', error);
      return null;
    }
  }

  /**
   * Xử lý pending deep link sau khi login
   */
  static async handlePendingDeepLinkAfterLogin() {
    const pending = await this.getPendingDeepLink();
    if (pending) {
      console.log('[DeepLink] Handling pending deep link after login:', pending);
      await this.navigateToDeepLink(pending);
    }
  }

  /**
   * Điều hướng về home
   */
  private static navigateToHome() {
    // Điều hướng về Citizen tabs (home)
    navigate('CitizenTabs');
  }

  /**
   * Lấy deep link URL cho các màn hình
   * Dùng để share links
   */
  static getDeepLinkURL(type: DeepLinkData['type'], id?: number | string): string {
    const baseUrl = 'aegisflow://';
    const paths: Record<string, string> = {
      incident: 'incident',
      alert: 'alert',
      shelter: 'shelter',
      report: 'report',
      notification: 'notification',
      referral: 'ref',
    };

    const path = paths[type];
    if (!path) return baseUrl;

    return id ? `${baseUrl}${path}/${id}` : `${baseUrl}${path}`;
  }

  /**
   * Lấy HTTP URL cho share
   */
  static getHTTPURL(type: DeepLinkData['type'], id?: number | string): string {
    const baseUrl = 'https://aegisflow.app';
    const paths: Record<string, string> = {
      incident: 'incident',
      alert: 'alert',
      shelter: 'shelter',
      report: 'report',
      notification: 'notification',
      referral: 'ref',
    };

    const path = paths[type];
    if (!path) return baseUrl;

    return id ? `${baseUrl}/${path}/${id}` : `${baseUrl}/${path}`;
  }
}

export default DeepLinkHandler;
export { DeepLinkData, NotificationData };
