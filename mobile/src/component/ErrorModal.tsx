import React from 'react';
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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { theme } from '../theme/colors';
import { useEffect } from 'react';

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
  animationSize?: number;
  showConfirmButton?: boolean;
}

const { width } = Dimensions.get('window');

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title = 'Lỗi',
  message = 'Đã xảy ra lỗi',
  buttonText = 'Xác nhận',
  showConfirmButton = true,
}) => {
  const animation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      animation.value = withTiming(1, { 
        duration: 150, 
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

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  if (!visible) return null;

  const statusColor = '#EF4444'; // Danger Red

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
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
              <Text style={[styles.title, { color: statusColor }]}>{title}</Text>
              
              <Text style={styles.message}>{message}</Text>
              
              {showConfirmButton && (
                <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                >
                  <View style={[styles.confirmBtn, { backgroundColor: statusColor }]}>
                    <Text style={styles.buttonText}>{buttonText}</Text>
                  </View>
                </TouchableOpacity>
              )}
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
    fontFamily: theme.typography.fontFamily,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 28,
    fontFamily: theme.typography.fontFamily,
  },
  primaryButton: {
    width: '100%',
    height: 48,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily,
  },
});

export default ErrorModal;

