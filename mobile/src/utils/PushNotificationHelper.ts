import { Platform, PermissionsAndroid } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

type MessageHandler = (message: FirebaseMessagingTypes.RemoteMessage) => void;
type TokenHandler = (token: string) => void;

class PushNotificationHelper {
  /**
   * Kiểm tra quyền thông báo hiện tại
   */
  static async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const status = await messaging().hasPermission();
        return (
          status === messaging.AuthorizationStatus.AUTHORIZED ||
          status === messaging.AuthorizationStatus.PROVISIONAL
        );
      }
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return result;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Yêu cầu quyền thông báo
   */
  static async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const status = await messaging().requestPermission({
          alert: true,
          announcement: false,
          badge: true,
          carPlay: false,
          criticalAlert: false,
          provisional: false,
          sound: true,
        });
        return (
          status === messaging.AuthorizationStatus.AUTHORIZED ||
          status === messaging.AuthorizationStatus.PROVISIONAL
        );
      }
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lấy FCM registration token
   */
  static async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token || null;
    } catch (error) {
      console.warn('[FCM] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Xóa FCM token (khi logout)
   */
  static async deleteToken(): Promise<boolean> {
    try {
      await messaging().deleteToken();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Subscribe to FCM topic
   */
  static async subscribeToTopic(topic: string): Promise<boolean> {
    try {
      await messaging().subscribeToTopic(topic);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Unsubscribe from FCM topic
   */
  static async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lắng nghe message khi app đang foreground
   */
  static onMessageReceived(callback: MessageHandler): () => void {
    return messaging().onMessage(callback);
  }

  /**
   * Lắng nghe khi user tap notification (app background)
   */
  static onNotificationOpened(callback: MessageHandler): () => void {
    return messaging().onNotificationOpenedApp(callback);
  }

  /**
   * Lấy notification ban đầu khi app cold start từ notification
   */
  static async getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
    try {
      return await messaging().getInitialNotification();
    } catch {
      return null;
    }
  }

  /**
   * Lắng nghe token refresh
   */
  static onTokenRefresh(callback: TokenHandler): () => void {
    return messaging().onTokenRefresh(callback);
  }

  /**
   * Set background message handler (gọi ở module level — ngoài component)
   */
  static setBackgroundMessageHandler(handler: MessageHandler): void {
    messaging().setBackgroundMessageHandler(handler);
  }

  /**
   * Đăng ký device với backend sau khi permission granted
   */
  static async registerDeviceWithServer(): Promise<boolean> {
    // Deprecated: use NotificationTokenService.registerTokenAfterLogin()
    return false;
  }

  /**
   * Hủy đăng ký device khỏi server
   */
  static async unregisterDeviceFromServer(): Promise<boolean> {
    // Deprecated: use NotificationTokenService.unregisterTokenAfterLogout()
    return false;
  }
}

export default PushNotificationHelper;
