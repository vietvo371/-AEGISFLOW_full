import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackScreen } from '../../navigation/types';
import { theme } from '../../theme/colors';
import { componentStyles } from '../../theme/components';

const SplashScreen: StackScreen<'Loading'> = () => {
  const navigation = useNavigation();
  const logoScale = new Animated.Value(0.8);
  const logoOpacity = new Animated.Value(0);

  useEffect(() => {
    const animateLogo = () => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateLogo();

    // Navigate to Onboarding after 2 seconds
    const timer = setTimeout(() => {
      navigation.navigate('Onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, logoScale, logoOpacity]);

  return (
    <View style={[componentStyles.container, styles.container]}>
      <Animated.Image
        source={require('../../assets/images/logo.png')}
        style={[
          styles.logo,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundDark,
  },
  logo: {
    width: 120,
    height: 120,
  },
});

export default SplashScreen;
