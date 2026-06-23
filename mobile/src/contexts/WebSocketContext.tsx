import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import WebSocketService from '../services/websocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config/env';
import NetInfo from '@react-native-community/netinfo';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  /**
   * Auto-subscribe channel rồi listen.
   * Silent no-op nếu WebSocket chưa ready hoặc disabled.
   */
  listen: (channel: string, event: string, callback: (data: any) => void) => void;
  subscribePusher: (channel: string, event: string, callback: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  // Ref để track WebSocket đã connect thật sự (không dùng state để tránh race condition)
  const wsReady = useRef(false);
  const connectedHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    const initWebSocket = async () => {
      try {
        // Tắt nếu disabled trong env
        if (!env.ENABLE_WEBSOCKET) return;

        const token = await AsyncStorage.getItem('@auth_token');
        if (!token) return;

        const echo = await WebSocketService.connect();

        // Lắng nghe sự kiện kết nối thật sự từ Pusher
        // thay vì set isConnected ngay sau connect() resolve
        const pusher = (echo as any)?.connector?.pusher;
        if (pusher?.connection) {
          const onConnected = () => {
            if (mounted) {
              console.log('[WebSocketProvider] ✅ Pusher connected — setting isConnected=true');
              wsReady.current = true;
              setIsConnected(true);
            }
          };
          const onDisconnected = () => {
            if (mounted) {
              console.log('[WebSocketProvider] ❌ Pusher disconnected — setting isConnected=false');
              wsReady.current = false;
              setIsConnected(false);
            }
          };

          // Nếu đã connected rồi (reconnect)
          if (pusher.connection.state === 'connected') {
            onConnected();
          } else {
            pusher.connection.bind('connected', onConnected);
          }
          pusher.connection.bind('disconnected', onDisconnected);
          pusher.connection.bind('unavailable', onDisconnected);
          pusher.connection.bind('failed', onDisconnected);

          connectedHandlerRef.current = () => {
            pusher.connection.unbind('connected', onConnected);
            pusher.connection.unbind('disconnected', onDisconnected);
            pusher.connection.unbind('unavailable', onDisconnected);
            pusher.connection.unbind('failed', onDisconnected);
          };
        } else {
          // Fallback nếu không có Pusher instance
          if (mounted) {
            wsReady.current = true;
            setIsConnected(true);
          }
        }
      } catch (_error) {
        // App vẫn hoạt động bình thường, chỉ không có realtime
        console.log('[WebSocketProvider] ⚠️ WebSocket init failed, continuing without realtime');
      }
    };

    initWebSocket();

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && !wsReady.current) {
        initWebSocket();
      }
    });

    return () => {
      mounted = false;
      wsReady.current = false;
      if (connectedHandlerRef.current) {
        connectedHandlerRef.current();
        connectedHandlerRef.current = null;
      }
      unsubscribeNetInfo();
      WebSocketService.disconnect();
    };
  }, []);

  const subscribe = (channel: string) => {
    if (!wsReady.current) return;
    try { WebSocketService.subscribe(channel); } catch { /* ignore */ }
  };

  const unsubscribe = (channel: string) => {
    if (!wsReady.current) return;
    try { WebSocketService.unsubscribe(channel); } catch { /* ignore */ }
  };

  /**
   * Tự động subscribe channel trước, sau đó listen event.
   * Nếu WebSocket chưa ready → skip silently (không crash).
   */
  const listen = (channel: string, event: string, callback: (data: any) => void) => {
    if (!wsReady.current) return;

    // Subscribe trước nếu chưa (WebSocketService.subscribe ignore nếu đã có)
    try { WebSocketService.subscribe(channel); } catch { /* already subscribed OK */ }

    try {
      WebSocketService.listen(channel, event, callback);
    } catch (err) {
      console.warn(`[WS] listen failed (${channel}/${event}):`, err);
    }
  };

  const subscribePusher = (channel: string, event: string, callback: (data: any) => void) => {
    if (!wsReady.current) return;
    try { WebSocketService.subscribePusher(channel, event, callback); } catch { /* ignore */ }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, unsubscribe, listen, subscribePusher }}>
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
