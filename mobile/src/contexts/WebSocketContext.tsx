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

  useEffect(() => {
    let mounted = true;

    const initWebSocket = async () => {
      try {
        // Tắt nếu disabled trong env
        if (!env.ENABLE_WEBSOCKET) return;

        const token = await AsyncStorage.getItem('@auth_token');
        if (!token) return;

        await WebSocketService.connect();

        if (mounted) {
          setIsConnected(true);
          wsReady.current = true;
        }
      } catch (_error) {
        // App vẫn hoạt động bình thường, chỉ không có realtime
      }
    };

    initWebSocket();

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && !isConnected) {
        initWebSocket();
      }
    });

    return () => {
      mounted = false;
      wsReady.current = false;
      unsubscribeNetInfo();
      WebSocketService.disconnect();
    };
  }, [isConnected]);

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
