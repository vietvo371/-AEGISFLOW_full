import { Platform } from 'react-native';

class PushNotificationHelper {
  static async checkPermission() { return false; }
  static async requestPermission() { return false; }
  static async getToken() { return null; }
  static async registerDeviceWithServer() { return false; }
  static async unregisterDeviceFromServer() { return false; }
  static onMessageReceived(callback: (message: any) => void) { return () => {}; }
  static onNotificationOpened(callback: (message: any) => void) { return () => {}; }
  static async getInitialNotification() { return null; }
  static onTokenRefresh(callback: (token: string) => void) { return () => {}; }
  static async deleteToken() { return true; }
}

export default PushNotificationHelper;
