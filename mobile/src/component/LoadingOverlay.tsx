import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { theme } from '../theme/colors';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  useLottie?: boolean;
  lottieSize?: number;
  loop?: boolean;
  autoPlay?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  useLottie = true,
  lottieSize = 120,
  loop = true,
  autoPlay = true,
}) => {
  const [lottieError, setLottieError] = React.useState(false);

  if (!visible) return null;

  // Fallback for platforms where Lottie might not work properly
  const shouldUseLottie = useLottie && Platform.OS !== 'web' && !lottieError;

  const handleLottieError = () => {
    console.warn('Lottie animation failed to load, falling back to ActivityIndicator');
    setLottieError(true);
  };

  return (
    <Modal transparent visible={visible}>
      <View style={styles.container}>
        <View style={styles.content}>
          {shouldUseLottie ? (
            <LottieView
              source={require('../assets/animations/coin_wallet.json')}
              autoPlay={autoPlay}
              loop={loop}
              style={{ 
                width: lottieSize, 
                height: lottieSize,
                backgroundColor: 'transparent'
              }}
              resizeMode="contain"
              hardwareAccelerationAndroid={true}
              onAnimationFailure={handleLottieError}
            />
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md, 
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  message: {
    marginTop: theme.spacing.md,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
});

export default LoadingOverlay; 