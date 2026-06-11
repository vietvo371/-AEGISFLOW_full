import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationBanner = () => {
  const { notifications, markAsRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const touchStartY = useRef(0);
  
  const latestNotification = notifications.find(n => !n.read);

  // DEBUG: Component mounted
  useEffect(() => {
    console.log('🎨 NotificationBanner component mounted');
    return () => console.log('🎨 NotificationBanner component unmounted');
  }, []);

  useEffect(() => {
    if (latestNotification) {
      console.log('🎨 Showing notification banner:', latestNotification.title);
      showToast();
    }
  }, [latestNotification?.id]);

  const showToast = () => {
    if (!latestNotification) return;

    // Reset animations
    slideAnim.setValue(-120);
    fadeAnim.setValue(0);

    // Show toast animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 5 seconds
    const timer = setTimeout(() => {
      hideToast();
    }, 5000);

    return () => clearTimeout(timer);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (latestNotification) {
        markAsRead(latestNotification.id);
      }
    });
  };

  const handleTouchStart = (e: any) => {
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndY = e.nativeEvent.pageY;
    const diffY = touchEndY - touchStartY.current;
    
    // If swiped up by more than 20 pixels, dismiss immediately!
    if (diffY < -20) {
      console.log('👆 Swiped up to dismiss toast!');
      hideToast();
    }
  };

  if (!latestNotification) return null;

  const getToastConfig = () => {
    const newStatus = latestNotification.data?.new_status;
    let accentColor = '#3B82F6'; // Default Blue (Info)
    let icon = 'bell-outline';

    if (latestNotification.type === 'report_status') {
      if (newStatus === 3) {
        accentColor = '#10B981'; // Success Green
        icon = 'check-circle';
      } else if (newStatus === 4) {
        accentColor = '#EF4444'; // Error Red
        icon = 'close-circle';
      } else {
        accentColor = '#3B82F6'; // Info Blue
        icon = 'information-outline';
      }
    } else {
      switch (latestNotification.type) {
        case 'points_updated':
          accentColor = '#F59E0B'; // Amber Gold
          icon = 'star';
          break;
        case 'incident_created':
          accentColor = '#EF4444'; // Emergency Red
          icon = 'alert-decagram';
          break;
        case 'new_nearby_report':
          accentColor = '#8B5CF6'; // Violet
          icon = 'map-marker-radius';
          break;
        default:
          if (latestNotification.title.toLowerCase().includes('ai')) {
            accentColor = '#8B5CF6'; // Purple for AI
            icon = 'brain';
          } else {
            accentColor = '#3B82F6'; // Blue
            icon = 'bell-badge-outline';
          }
      }
    }

    return { accentColor, icon };
  };

  const config = getToastConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toast}
        activeOpacity={0.95}
        onPress={hideToast}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Glow Left Accent */}
        <View style={[styles.leftGlow, { backgroundColor: config.accentColor }]} />

        {/* Content Wrapper */}
        <View style={styles.content}>
          {/* Glowing Icon Wrapper */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: `${config.accentColor}12`,
                borderColor: `${config.accentColor}28`,
              },
            ]}
          >
            <Icon name={config.icon} size={18} color={config.accentColor} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {latestNotification.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {latestNotification.message}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999999,
  },
  toast: {
    backgroundColor: '#0F172A', // Obsidian Deep Obsidian Slate
    borderRadius: 24, // High premium rounded capsule shape
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Subtle glass lighting border
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },
  leftGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4, // Left vertical glow bar
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 20, // Add padding to avoid overlapping leftGlow
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF', // Pure premium white text
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  message: {
    fontSize: 12,
    color: '#94A3B8', // Soft readable Slate Gray
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
});
