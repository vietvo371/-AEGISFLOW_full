/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, Platform, LogBox } from 'react-native';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainNavigator from './src/navigation/MainTabNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { WebSocketProvider } from './src/contexts/WebSocketContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { OfflineDataProvider } from './src/contexts/OfflineDataContext';
import { NotificationBanner } from './src/components/NotificationBanner';
import { theme } from './src/theme/colors';
import './src/i18n'; // Initialize i18n
import { navigationRef } from './src/navigation/NavigationService';
import { AlertProvider } from './src/services/AlertService';
import AlertServiceConnector from './src/component/AlertServiceConnector';
import NotificationService from './src/components/NotificationService';
import { ErrorModalProvider } from './src/utils/ErrorModalManager';
import DeepLinkHandler from './src/utils/DeepLinkHandler';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

// Xử lý thông báo khi app đang mở
const handleNotification = (notification: any) => {
  console.log('Xử lý thông báo trong app:', notification);
  // DeepLinkHandler sẽ tự động xử lý thông qua PushNotificationHelper
};

// Xử lý khi người dùng mở thông báo
const handleNotificationOpened = (notification: any) => {
  console.log('Người dùng mở thông báo:', notification);
  // DeepLinkHandler sẽ tự động xử lý thông qua PushNotificationHelper
};

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  // Khởi tạo DeepLinkHandler sau khi navigation đã sẵn sàng
  useEffect(() => {
    // Đợi navigation container sẵn sàng
    const initDeepLink = () => {
      if (navigationRef.isReady()) {
        DeepLinkHandler.init();
      } else {
        // Thử lại sau 1 giây
        setTimeout(initDeepLink, 1000);
      }
    };

    // Delay một chút để đảm bảo navigation đã ready
    const timer = setTimeout(initDeepLink, 500);

    return () => {
      clearTimeout(timer);
      DeepLinkHandler.cleanup();
    };
  }, []);

  // Xử lý sync khi network thay đổi
  const handleNetworkChange = (isConnected: boolean) => {
    console.log('[App] Network changed:', isConnected);
    // Có thể trigger sync ở đây nếu cần
  };

  const navigationTheme: Theme = {
    dark: isDarkMode,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.white,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
    fonts: {
      regular: {
        fontFamily: Platform.select({
          ios: 'SF Pro Display',
          android: 'Roboto',
        }) as string,
        fontWeight: '400',
      },
      medium: {
        fontFamily: Platform.select({
          ios: 'SF Pro Display',
          android: 'Roboto',
        }) as string,
        fontWeight: '500',
      },
      bold: {
        fontFamily: Platform.select({
          ios: 'SF Pro Display',
          android: 'Roboto',
        }) as string,
        fontWeight: '700',
      },
      heavy: {
        fontFamily: Platform.select({
          ios: 'SF Pro Display',
          android: 'Roboto',
        }) as string,
        fontWeight: '900',
      },
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorModalProvider>
          <AlertProvider>
            <AlertServiceConnector />
            <NotificationService
              onNotification={handleNotification}
              onNotificationOpened={handleNotificationOpened}
            />
            <NetworkProvider onNetworkChange={handleNetworkChange}>
              <OfflineDataProvider>
                <AuthProvider>
                  <WebSocketProvider>
                    <StatusBar
                      barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                      backgroundColor={theme.colors.background}
                    />
                    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
                      <MainNavigator />
                    </NavigationContainer>
                    {/* NotificationBanner phải nằm BÊN TRONG WebSocketProvider để nhận context */}
                    <NotificationBanner />
                  </WebSocketProvider>
                </AuthProvider>
              </OfflineDataProvider>
            </NetworkProvider>
          </AlertProvider>
        </ErrorModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
