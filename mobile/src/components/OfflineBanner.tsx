/**
 * OfflineBanner - Hiển thị trạng thái offline
 * Hiển thị banner khi app offline hoặc có dữ liệu chưa sync
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';
import { useNetwork } from '../contexts/NetworkContext';
import { useOfflineData } from '../contexts/OfflineDataContext';

interface OfflineBannerProps {
  /** Ẩn banner khi không cần */
  visible?: boolean;
  /** Style tùy chỉnh */
  style?: any;
  /** Callback khi tap */
  onPress?: () => void;
  /** Ẩn khi không có pending actions */
  hideWhenNoPending?: boolean;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({
  visible = true,
  style,
  onPress,
  hideWhenNoPending = false,
}) => {
  const { isConnected, wasOffline } = useNetwork();
  const { pendingActionsCount, syncNow } = useOfflineData();

  // Không hiển thị nếu đang online và không có pending
  if (isConnected && pendingActionsCount === 0 && !hideWhenNoPending) {
    return null;
  }

  // Hiển thị "đang sync" nếu vừa online
  if (wasOffline && isConnected) {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.syncingBanner]}
        onPress={onPress || syncNow}
        activeOpacity={0.8}
      >
        <Icon name="cloud-sync" size={20} color="#fff" />
        <Text style={styles.syncingText}>Đang đồng bộ dữ liệu...</Text>
      </TouchableOpacity>
    );
  }

  // Hiển thị offline banner
  if (!isConnected) {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.offlineBanner]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Icon name="wifi-off" size={20} color="#fff" />
        <View style={styles.textContainer}>
          <Text style={styles.offlineText}>Bạn đang offline</Text>
          {pendingActionsCount > 0 && (
            <Text style={styles.pendingText}>
              {pendingActionsCount} thao tác đang chờ đồng bộ
            </Text>
          )}
        </View>
        {pendingActionsCount > 0 && (
          <Icon name="chevron-right" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    );
  }

  // Online nhưng có pending actions
  if (pendingActionsCount > 0) {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.pendingBanner]}
        onPress={onPress || syncNow}
        activeOpacity={0.8}
      >
        <Icon name="cloud-upload-outline" size={20} color={theme.colors.primary} />
        <View style={styles.textContainer}>
          <Text style={styles.pendingTextPrimary}>
            {pendingActionsCount} thao tác cần đồng bộ
          </Text>
        </View>
        <TouchableOpacity onPress={syncNow} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>Đồng bộ</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  offlineBanner: {
    backgroundColor: '#6B7280', // Gray for offline
  },
  syncingBanner: {
    backgroundColor: '#3B82F6', // Blue for syncing
  },
  pendingBanner: {
    backgroundColor: '#FEF3C7', // Light yellow for pending
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  textContainer: {
    flex: 1,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  pendingTextPrimary: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  syncingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineBanner;
