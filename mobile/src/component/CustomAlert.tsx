import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
  interpolate
} from 'react-native-reanimated';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

const { width } = Dimensions.get('window');

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
}) => {
  const animation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      animation.value = withTiming(1, { 
        duration: 150, // Snappy & Instant feel
        easing: Easing.out(Easing.quad) 
      });
    } else {
      animation.value = withTiming(0, { duration: 100 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animation.value,
    transform: [{ scale: interpolate(animation.value, [0, 1], [0.95, 1]) }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: animation.value,
  }));

  const getStatusColor = () => {
    switch (type) {
      case 'error': return '#EF4444'; // Red-500
      case 'success': return '#10B981'; // Green-500
      case 'warning': return '#F59E0B'; // Amber-500
      case 'confirm': return '#3B82F6'; // Blue-500
      default: return '#6366F1'; // Indigo-500
    }
  };

  const statusColor = getStatusColor();

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) button.onPress();
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Rapid Blur/Dark Overlay */}
        {Platform.OS === 'ios' ? (
          <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={5} />
        ) : (
          <Animated.View style={[styles.overlay, overlayStyle]} />
        )}

        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.card}>
            {/* Color Accent Bar at Top */}
            <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

            <View style={styles.contentPadding}>
              {/* No Icon - Focus on Message */}
              <Text style={[styles.title, { color: statusColor }]}>
                {title || (type === 'confirm' ? 'Xác nhận' : 'Thông báo')}
              </Text>
              
              {message && <Text style={styles.message}>{message}</Text>}

              {/* Buttons Section - Color-Coded Snappy Buttons */}
              <View style={[
                styles.buttonContainer,
                buttons.length === 2 ? styles.row : styles.column
              ]}>
                {buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  
                  if (!isCancel) {
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleButtonPress(button)}
                        activeOpacity={0.8}
                        style={[styles.primaryButton, buttons.length === 2 && styles.flex1]}
                      >
                        <LinearGradient
                          colors={[statusColor, statusColor]} // Plain color but keeping gradient structure for uniform look
                          style={styles.gradientBtn}
                        >
                          <Text style={styles.primaryBtnText}>{button.text}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.7}
                      style={[styles.secondaryButton, buttons.length === 2 && styles.flex1]}
                    >
                      <Text style={styles.secondaryBtnText}>{button.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  container: {
    width: width * 0.82,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  accentBar: {
    height: 6,
    width: '100%',
  },
  contentPadding: {
    padding: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569', // Slate-600
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  flex1: {
    flex: 1,
  },
  primaryButton: {
    height: 48,
  },
  gradientBtn: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // Slate-100
  },
  secondaryBtnText: {
    color: '#64748B', // Slate-500
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CustomAlert;
