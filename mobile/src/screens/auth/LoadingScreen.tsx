import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/Api';

interface LoadingScreenProps {
  navigation: any;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation }) => {
  const { user, isEmergency } = useAuth();

  useEffect(() => {
    const checkLogin = async () => {
      try {
        await new Promise((resolve: any) => setTimeout(resolve, 1500));
        const res = await api.get('/auth/check-login');

        if (res.data?.success && res.data?.data?.user) {
          const userData = res.data?.data?.user;
          const roles: string[] = userData?.roles || [];

          // Role-based navigation
          if (roles.includes('emergency')) {
            navigation.replace('EmergencyTabs');
          } else {
            navigation.replace('CitizenTabs');
          }
        } else {
          navigation.replace('Login');
        }
      } catch (error: any) {
        navigation.replace('Login');
      }
    };
    checkLogin();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={styles.spinner}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: theme.spacing.xl,
  },
  spinner: {
    marginTop: theme.spacing.lg,
  },
});

export default LoadingScreen;