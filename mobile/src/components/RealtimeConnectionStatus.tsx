import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Component hiển thị trạng thái kết nối WebSocket và số lượng thông báo chưa đọc
 * Có thể sử dụng trong bất kỳ màn hình nào
 */
export const RealtimeConnectionStatus = () => {
  const { isConnected } = useWebSocket();
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
      <Text style={styles.text}>
        {isConnected ? 'Đang kết nối' : 'Không kết nối'}
      </Text>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
