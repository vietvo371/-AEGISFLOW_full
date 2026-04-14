import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Animated, { FadeInDown, FadeInUp, SlideInDown } from 'react-native-reanimated';
import { theme } from '../../theme/colors';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import LoadingOverlay from '../../component/LoadingOverlay';
import api from '../../utils/Api';
import { useTranslation } from '../../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

interface ChangePasswordScreenProps {
  navigation: any;
  route: {
    params: {
      identifier: string;
      type: 'phone' | 'email';
      token: string;
    };
  };
}

const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { identifier, type, token } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErrors.newPassword = t('changePassword.newPasswordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('changePassword.passwordMinLength');
    } 
    if (!confirmPassword) {
      newErrors.confirmPassword = t('changePassword.confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('changePassword.passwordsNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // CityResQ360 API format - theo API docs
      const response = await api.post('/auth/reset-password', {
        email: identifier,
        token: token,
        mat_khau: newPassword,
        mat_khau_confirmation: confirmPassword,
      });

      console.log('Reset password response:', response.data);
      
      // Response format: { success: true, message: "..." }
      if (response.data.success) {
        Alert.alert(
          'Thành công',
          response.data.message || 'Mật khẩu đã được đặt lại thành công',
          [
            {
              text: 'Xác nhận',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
      }
    } catch (error: any) {
      console.log('Reset password error:', error);
      let errorMessage = 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      
      if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return { text: t('auth.weak'), color: theme.colors.error };
    if (strength <= 4) return { text: t('auth.medium'), color: theme.colors.warning };
    return { text: t('auth.strong'), color: theme.colors.success };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View
          style={styles.header}
          entering={FadeInDown.duration(600).springify()}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('changePassword.createNewPassword')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('changePassword.enterStrongPassword')}
            </Text>
          </View>
        </Animated.View>

        {/* Main Card */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.duration(800).delay(200).springify()}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Icon name="lock-reset" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{t('changePassword.resetPassword')}</Text>
            <Text style={styles.cardSubtitle}>
              {t('changePassword.verificationSuccessful')}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <InputCustom
              label={t('changePassword.newPassword')}
              placeholder={t('changePassword.enterNewPassword')}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setPasswordStrength(calculatePasswordStrength(text));
              }}
              secureTextEntry={!showPassword}
              error={errors.newPassword}
              required
              leftIcon="lock-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              containerStyle={styles.input}
            />

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View
                    style={[
                      styles.passwordStrengthFill,
                      {
                        width: `${(passwordStrength / 6) * 100}%`,
                        backgroundColor: getPasswordStrengthText(passwordStrength).color
                      }
                    ]}
                  />
                </View>
                <Text style={[
                  styles.passwordStrengthText,
                  { color: getPasswordStrengthText(passwordStrength).color }
                ]}>
                  {getPasswordStrengthText(passwordStrength).text}
                </Text>
              </View>
            )}

            <InputCustom
              label={t('changePassword.confirmNewPassword')}
              placeholder={t('changePassword.confirmNewPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              required
              leftIcon="lock-check-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              containerStyle={styles.input}
            />

            {/* Change Password Button */}
            <ButtonCustom
              title={t('changePassword.changePassword')}
              onPress={handleChangePassword}
              style={styles.changePasswordButton}
              icon="check-circle"
            />
          </View>
        </Animated.View>

      </ScrollView>

      <LoadingOverlay visible={loading} message={t('changePassword.changingPassword')} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: theme.colors.primary + '10',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.secondary + '10',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp('4%'),
    paddingBottom: hp('4%'),
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: hp('3%'),
    paddingBottom: hp('2%'),
    gap: wp('4%'),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: wp('6%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    marginBottom: hp('0.5%'),
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: wp('4%'),
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    lineHeight: wp('5%'),
  },

  // Card Styles
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: wp('4%'),
    padding: wp('6%'),
    marginBottom: hp('2%'),
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  cardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  cardTitle: {
    fontSize: wp('5%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginBottom: hp('0.5%'),
  },
  cardSubtitle: {
    fontSize: wp('4%'),
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
  },

  // Form Styles
  formContainer: {
    marginBottom: hp('2%'),
  },
  input: {
    marginBottom: theme.spacing.lg,
  },

  // Password Strength
  passwordStrengthContainer: {
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'right',
  },

  // Change Password Button
  changePasswordButton: {
    marginBottom: theme.spacing.lg,
    height: 56,
  },

});

export default ChangePasswordScreen;
