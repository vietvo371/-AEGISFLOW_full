# 🔌 WebSocket Realtime Notifications - Setup Guide

Hướng dẫn chi tiết thêm WebSocket Realtime Notifications vào React Native app.

---

## 📋 Mục lục

1. [Yêu cầu](#yêu-cầu)
2. [Cài đặt Dependencies](#cài-đặt-dependencies)
3. [Cấu hình Backend](#cấu-hình-backend)
4. [Setup WebSocket Service](#setup-websocket-service)
5. [Tạo Context & Hook](#tạo-context--hook)
6. [Tạo UI Components](#tạo-ui-components)
7. [Tích hợp vào App](#tích-hợp-vào-app)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Yêu cầu

### Backend Requirements:
- ✅ Laravel Reverb WebSocket Server đang chạy
- ✅ Nginx reverse proxy cấu hình `/app/` → `localhost:6001`
- ✅ Route `/broadcasting/auth` hoạt động
- ✅ Events broadcast với `ShouldBroadcast`

### Frontend Requirements:
- ✅ React Native
- ✅ React Navigation
- ✅ AsyncStorage (lưu auth token)

---

## 📦 Cài đặt Dependencies

### 1. Install packages:

```bash
yarn add laravel-echo pusher-js
yarn add react-native-vector-icons
yarn add @react-native-async-storage/async-storage
yarn add react-native-safe-area-context
```

### 2. iOS Setup:

```bash
cd ios && pod install && cd ..
```

### 3. Link vector icons:

**android/app/build.gradle:**
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

**ios:** Đã auto-link với CocoaPods

---

## ⚙️ Cấu hình Backend

### 1. Environment Variables

**`src/config/env.ts`:**
```typescript
const env = {
  // API URL
  API_URL: 'https://api.aegisflow.ai',

  // WebSocket Configuration
  // Backend dùng Nginx reverse proxy: /app/ -> localhost:6001
  // Mobile app kết nối qua HTTPS (port 443) giống web
  REVERB_APP_ID: 808212,
  REVERB_APP_KEY: 'lwf6joghdvbowg9hb7p4',
  REVERB_APP_SECRET: 'yh8dts6nhxqzn2i77yim',
  REVERB_HOST: 'api.aegisflow.ai',
  REVERB_PORT: 443, // Nginx reverse proxy
  REVERB_SCHEME: 'https',

  // Bật WebSocket
  ENABLE_WEBSOCKET: true,

  // ... other configs
};

export default env;
```

**⚠️ Lưu ý:**
- Sử dụng port **443** (HTTPS) thay vì 6001
- Nginx đã proxy `/app/` → `localhost:6001`
- Không cần `cluster` khi dùng Laravel Reverb

---

## 🔌 Setup WebSocket Service

### 1. Tạo WebSocket Service

**`src/services/websocket.ts`:**
```typescript
import Pusher from 'pusher-js/react-native';
import Echo from 'laravel-echo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config/env';

// Make Pusher available globally for Laravel Echo
(window as any).Pusher = Pusher;

const getEchoConfig = () => ({
  broadcaster: 'reverb',
  key: env.REVERB_APP_KEY,
  wsHost: env.REVERB_HOST,
  wsPort: env.REVERB_PORT,
  wssPort: env.REVERB_PORT,
  forceTLS: env.REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  auth: {
    headers: {} as any,
  },
});

class WebSocketService {
  private echo: Echo<any> | null = null;
  private pusher: Pusher | null = null;
  private channels: Map<string, any> = new Map();
  private isConnected: boolean = false;

  async connect() {
    if (this.echo) {
      console.log('⚠️ WebSocket already connected');
      return this.echo;
    }

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('@auth_token');
      console.log('🔑 Token found:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      const config = getEchoConfig();
      
      if (token) {
        config.auth.headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        };
      }

      // Initialize Laravel Echo
      this.echo = new Echo(config);
      
      console.log('✅ Laravel Echo created successfully');
      
      // Get Pusher instance for connection events
      this.pusher = (this.echo as any)?.connector?.pusher;
      
      if (!this.pusher) {
        console.error('❌ Pusher instance not available');
        return this.echo;
      }
      
      console.log('🚀 Pusher instance obtained');
      
      // Bind connection events
      this.pusher.connection.bind('connected', () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('❌ WebSocket disconnected');
        this.isConnected = false;
      });

      this.pusher.connection.bind('error', (err: any) => {
        console.error('❌ WebSocket error:', err);
        this.isConnected = false;
      });

      return this.echo;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
      this.pusher = null;
      this.channels.clear();
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  subscribe(channelName: string) {
    if (!this.echo) {
      throw new Error('WebSocket not connected');
    }

    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    console.log(`📡 Subscribing to ${channelName}...`);
    
    const channel = channelName.startsWith('private-')
      ? this.echo.private(channelName.replace('private-', ''))
      : this.echo.channel(channelName);
    
    this.channels.set(channelName, channel);
    console.log(`✅ Subscribed to ${channelName}`);
    
    return channel;
  }

  unsubscribe(channelName: string) {
    if (this.channels.has(channelName) && this.echo) {
      this.echo.leave(channelName.replace('private-', ''));
      this.channels.delete(channelName);
    }
  }

  listen(channelName: string, eventName: string, callback: (data: any) => void) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not subscribed`);
    }

    channel.listen(eventName, callback);
    console.log(`👂 Listening to ${eventName} on ${channelName}`);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default new WebSocketService();
```

---

## 🎣 Tạo Context & Hook

### 1. WebSocket Context

**`src/contexts/WebSocketContext.tsx`:**
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import WebSocketService from '../services/websocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config/env';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  listen: (channel: string, event: string, callback: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initWebSocket = async () => {
      try {
        if (!env.ENABLE_WEBSOCKET) {
          console.log('⚠️ WebSocket disabled in env');
          return;
        }

        const token = await AsyncStorage.getItem('@auth_token');
        if (!token) {
          console.log('⚠️ No auth token, skipping WebSocket');
          return;
        }

        console.log('🚀 Initializing WebSocket...');
        await WebSocketService.connect();
        
        if (mounted) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('❌ Failed to initialize WebSocket:', error);
      }
    };

    initWebSocket();

    return () => {
      mounted = false;
      WebSocketService.disconnect();
    };
  }, []);

  const subscribe = (channel: string) => {
    WebSocketService.subscribe(channel);
  };

  const unsubscribe = (channel: string) => {
    WebSocketService.unsubscribe(channel);
  };

  const listen = (channel: string, event: string, callback: (data: any) => void) => {
    WebSocketService.listen(channel, event, callback);
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, unsubscribe, listen }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};
```

### 2. Notifications Hook

**`src/hooks/useNotifications.ts`:**
```typescript
import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

export interface Notification {
  id: string;
  type: 'report_status' | 'points_updated' | 'wallet_updated';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read?: boolean;
}

type RefreshCallback = () => void;
let refreshCallbacks: RefreshCallback[] = [];

export const useNotifications = () => {
  const { isConnected, subscribe, unsubscribe, listen } = useWebSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count from API
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Register refresh callback
  const registerRefreshCallback = useCallback((callback: RefreshCallback) => {
    refreshCallbacks.push(callback);
    return () => {
      refreshCallbacks = refreshCallbacks.filter(cb => cb !== callback);
    };
  }, []);

  // Trigger all refresh callbacks
  const triggerRefresh = useCallback(() => {
    refreshCallbacks.forEach(callback => callback());
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
    }
  }, [user?.id, fetchUnreadCount]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!isConnected || !user?.id) return;

    console.log('🎯 Setting up WebSocket listeners for user:', user.id);

    const userChannel = `private-user.${user.id}`;
    subscribe(userChannel);

    // Listen to report status updates
    listen(userChannel, 'report.status.updated', (data) => {
      console.log('📢 Report status updated:', data);
      
      const notification: Notification = {
        id: `report-${data.report_id || Date.now()}`,
        type: 'report_status',
        title: 'Cập nhật trạng thái',
        message: `"${data.report?.tieu_de}" đã được cập nhật`,
        data: { id: data.report_id, ...data.report },
        timestamp: new Date(),
        read: false,
      };

      setNotifications(prev => [notification, ...prev]);
      fetchUnreadCount();
      triggerRefresh();
    });

    return () => {
      unsubscribe(userChannel);
    };
  }, [isConnected, user?.id]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    fetchUnreadCount();
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetchUnreadCount();
  };

  const clearAll = () => {
    setNotifications([]);
    fetchUnreadCount();
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    registerRefreshCallback,
  };
};
```

---

## 🎨 Tạo UI Components

### 1. Notification Banner (Toast)

**`src/components/NotificationBanner.tsx`:**
```typescript
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotifications } from '../hooks/useNotifications';
import { theme } from '../theme/colors';

export const NotificationBanner = () => {
  const { notifications, markAsRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  const latestNotification = notifications.find(n => !n.read);

  useEffect(() => {
    if (latestNotification) {
      showToast();
    }
  }, [latestNotification?.id]);

  const showToast = () => {
    if (!latestNotification) return;

    // Reset animations
    slideAnim.setValue(-100);
    fadeAnim.setValue(0);
    progressAnim.setValue(1);

    // Show animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    // Auto hide after 5s
    setTimeout(() => {
      hideToast();
    }, 5000);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (latestNotification) {
        markAsRead(latestNotification.id);
      }
    });
  };

  if (!latestNotification) return null;

  const getConfig = () => {
    // Color coding by type
    switch (latestNotification.type) {
      case 'report_status':
        return {
          backgroundColor: theme.colors.infoLight,
          icon: 'information-outline',
          iconColor: theme.colors.info,
          borderColor: theme.colors.info,
        };
      default:
        return {
          backgroundColor: theme.colors.infoLight,
          icon: 'bell',
          iconColor: theme.colors.info,
          borderColor: theme.colors.info,
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: config.backgroundColor }]}
        onPress={hideToast}
        activeOpacity={0.9}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: config.borderColor,
              },
            ]}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name={config.icon} size={24} color={config.iconColor} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {latestNotification.title}
            </Text>
            <Text style={styles.message} numberOfLines={3}>
              {latestNotification.message}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideToast}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999999,
  },
  toast: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  progressBar: {
    height: '100%',
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingTop: 12,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
});
```

---

## 📱 Tích hợp vào App

### 1. Wrap App với WebSocketProvider

**`App.tsx`:**
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { WebSocketProvider } from './src/contexts/WebSocketContext';
import { NotificationBanner } from './src/components/NotificationBanner';
import MainNavigator from './src/navigation/MainTabNavigator';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WebSocketProvider>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
          
          {/* Notification Banner phải nằm BÊN TRONG WebSocketProvider */}
          <NotificationBanner />
        </WebSocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
```

### 2. Sử dụng trong Screens

**HomeScreen với Auto Refresh:**
```typescript
import { useNotifications } from '../hooks/useNotifications';

const HomeScreen = () => {
  const { unreadCount, registerRefreshCallback } = useNotifications();

  useEffect(() => {
    // Register callback để refresh data khi có event mới
    const unregister = registerRefreshCallback(() => {
      console.log('🔄 Refreshing data due to WebSocket event');
      fetchData();
      refreshMap();
    });

    return () => unregister();
  }, [registerRefreshCallback]);

  return (
    <View>
      {/* Unread badge */}
      <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
        <Icon name="bell" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

**NotificationsScreen:**
```typescript
import { useNotifications } from '../hooks/useNotifications';

const NotificationsScreen = () => {
  const { notifications, markAsRead } = useNotifications();

  return (
    <FlatList
      data={notifications}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => markAsRead(item.id)}>
          <Text>{item.title}</Text>
          <Text>{item.message}</Text>
        </TouchableOpacity>
      )}
    />
  );
};
```

---

## ✅ Testing

### 1. Kiểm tra Connection

Reload app và xem logs:
```
🚀 Initializing WebSocket...
🔑 Token found: 6|dZE5leKP...
✅ Laravel Echo created successfully
🚀 Pusher instance obtained
✅ WebSocket connected
🎯 Setting up WebSocket listeners for user: 1
📡 Subscribing to private-user.1...
✅ Subscribed to private-user.1
```

### 2. Test Event

Từ backend admin panel, duyệt một report:

**Mobile logs:**
```
📢 Report status updated: { report_id: 22, ... }
✅ Notification created
📊 Unread count from API: 5
🔄 Refreshing data due to WebSocket event
```

**UI:**
- ✅ Toast notification xuất hiện
- ✅ Unread badge cập nhật
- ✅ HomeScreen tự động refresh

### 3. Test Navigation

Ấn vào notification:
```
🔔 Notification pressed
🚀 Navigating to ReportDetail with ID: 22
```

---

## 🐛 Troubleshooting

### 1. Không kết nối được

**Lỗi:** `Connection state: connecting → unavailable`

**Fix:**
- Kiểm tra port 443 có accessible không
- Kiểm tra Nginx reverse proxy
- Thử `curl https://api.aegisflow.ai/app/`

### 2. Lỗi "cluster required"

**Lỗi:** `Options object must provide a cluster`

**Fix:** Đừng truyền `cluster` field khi dùng Laravel Reverb

### 3. Không nhận events

**Debug:**
```typescript
// Thêm global event listener
pusherChannel.bind_global((eventName, data) => {
  console.log('🌍 Global event:', eventName, data);
});
```

### 4. Lỗi "Cannot read property 'bind' of undefined"

**Fix:** Đảm bảo get Pusher instance sau khi Echo khởi tạo:
```typescript
this.pusher = (this.echo as any)?.connector?.pusher;
```

---

## 📚 Event Data Structure

### Backend Event:

**Laravel Event Class:**
```php
class ReportStatusUpdated implements ShouldBroadcast
{
    public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->report->user_id);
    }

    public function broadcastAs()
    {
        return 'report.status.updated';
    }

    public function broadcastWith()
    {
        return [
            'report_id' => $this->report->id,
            'old_status' => $this->oldStatus,
            'new_status' => $this->report->trang_thai,
            'report' => [
                'id' => $this->report->id,
                'tieu_de' => $this->report->tieu_de,
                'trang_thai' => $this->report->trang_thai,
            ],
        ];
    }
}
```

### Mobile Receives:
```json
{
  "report_id": 22,
  "old_status": 1,
  "new_status": 2,
  "report": {
    "id": 22,
    "tieu_de": "Hố ga bị vỡ",
    "trang_thai": 2
  }
}
```

---

## 🎯 Best Practices

1. **Error Handling:** Luôn wrap trong try-catch
2. **Memory Leaks:** Cleanup listeners trong useEffect return
3. **Performance:** Chỉ subscribe channels cần thiết
4. **Security:** Luôn dùng Bearer token cho private channels
5. **UX:** Hiển thị connection status cho user
6. **Testing:** Test cả success và error cases

---

## 🚀 Production Checklist

- [ ] Backend Laravel Reverb running
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates valid
- [ ] `/broadcasting/auth` endpoint secured
- [ ] Events broadcast correctly
- [ ] Mobile app connects successfully
- [ ] Notifications display correctly
- [ ] Auto-refresh working
- [ ] Navigation working
- [ ] Error handling implemented
- [ ] Connection status indicator
- [ ] Testing on both iOS and Android

---

## 📖 Tài liệu tham khảo

- [Laravel Broadcasting](https://laravel.com/docs/11.x/broadcasting)
- [Laravel Reverb](https://laravel.com/docs/11.x/reverb)
- [Laravel Echo](https://github.com/laravel/echo)
- [Pusher JS](https://github.com/pusher/pusher-js)

---

**✅ HOÀN THÀNH!** WebSocket Realtime Notifications đã sẵn sàng! 🎉
