/**
 * @format
 */

import { AppRegistry } from 'react-native';
import firebase from '@react-native-firebase/app';
import App from './App';
import { name as appName } from './app.json';
import PushNotificationHelper from './src/utils/PushNotificationHelper';
import { scheduleNavigateFromPush } from './src/navigation/navigateFromPushNotification';

// Initialize Firebase if not already initialized
if (firebase.apps.length === 0) {
  try {
    firebase.initializeApp();
  } catch (e) {
    console.warn('Firebase auto-initialization failed, initializing with dummy config:', e);
    try {
      firebase.initializeApp({
        apiKey: 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q',
        appId: '1:123456789:ios:abcdef123456',
        projectId: 'aegisflowai-dummy',
        messagingSenderId: '123456789',
        storageBucket: 'aegisflowai-dummy.appspot.com',
      });
    } catch (err) {
      console.error('Firebase manual initialization failed:', err);
    }
  }
}

// Background/quit message handler — must be registered before AppRegistry
PushNotificationHelper.setBackgroundMessageHandler(async (remoteMessage) => {
  scheduleNavigateFromPush(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
