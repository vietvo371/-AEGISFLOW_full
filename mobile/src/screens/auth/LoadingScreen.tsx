import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme as staticTheme } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';

interface LoadingScreenProps {
  navigation: any;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation }) => {
  const { user, isEmergency, loading } = useAuth();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    if (loading) return;

    if (user) {
      navigation.reset({
        index: 0,
        routes: [{ name: isEmergency ? 'EmergencyTabs' : 'CitizenTabs' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [loading, user, isEmergency, navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
      />
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: staticTheme.spacing.xl,
  },
  spinner: {
    marginTop: staticTheme.spacing.lg,
  },
});

export default LoadingScreen;
