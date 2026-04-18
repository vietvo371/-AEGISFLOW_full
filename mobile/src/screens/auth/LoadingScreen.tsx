import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';

interface LoadingScreenProps {
  navigation: any;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation }) => {
  const { user, isEmergency } = useAuth();

  useEffect(() => {
    // Chờ AuthContext init xong rồi navigate dựa trên user đã có
    // KHÔNG gọi API ở đây — tránh double call + timeout
    const timer = setTimeout(() => {
      if (user) {
        // Có user từ AsyncStorage → verify bằng cách check roles
        if (isEmergency) {
          navigation.replace('EmergencyTabs');
        } else {
          navigation.replace('CitizenTabs');
        }
      } else {
        navigation.replace('Login');
      }
    }, 300); // Chờ AuthContext init xong

    return () => clearTimeout(timer);
  }, [user, isEmergency, navigation]);

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