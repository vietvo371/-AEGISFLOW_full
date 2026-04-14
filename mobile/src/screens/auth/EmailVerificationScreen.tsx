import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Animated, { FadeInDown, FadeInUp, SlideInDown } from 'react-native-reanimated';
import { theme } from '../../theme/colors';
import { authService } from '../../services/authService';
import api from '../../utils/Api';
import { useTranslation } from '../../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const EmailVerificationScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Fetch email and verification status from profile when component mounts
  useEffect(() => {
    const fetchProfileAndStatus = async () => {
      try {
        setCheckingStatus(true);
        const response = await api.get('/client/profile');
        if (response.data?.status && response.data?.data) {
          const profileData = response.data.data;
          setEmail(profileData.email || '');

          // Check if email is already verified
          const isEmailVerified = profileData.is_active_mail === 1;

          setIsAlreadyVerified(isEmailVerified);
        }
      } catch (e) {
        console.log('Error fetching profile:', e);
        Alert.alert(t('common.error'), t('emailVerification.getEmailError'));
      } finally {
        setCheckingStatus(false);
      }
    };

    const unsubscribe = (navigation as any).addListener('focus', fetchProfileAndStatus);
    fetchProfileAndStatus();
    return unsubscribe;
  }, [navigation]);

  const handleSendCode = async () => {
    if (!email) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/resend-otp', {
        username: email,
        type: 'email'
      });

      console.log('Send OTP response:', response.data);

      if (response.data.status) {
        setIsCodeSent(true);
        setCountdown(60); // 60 seconds countdown
        startCountdown();
        Alert.alert('', response.data.message || t('emailVerification.sendOtpSuccess'));
      } else {
        Alert.alert(t('common.error'), response.data.message || t('emailVerification.sendOtpError'));
      }
    } catch (error: any) {
      console.log('Send OTP error:', error);
      let errorMessage = t('emailVerification.sendOtpFailed');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // OTP input handling
  const handleNumberPress = (num: string) => {
    if (currentInputIndex >= 6) return;

    const newOtp = [...otp];
    newOtp[currentInputIndex] = num;
    setOtp(newOtp);
    setCode(newOtp.join(''));

    // Move to next input
    if (currentInputIndex < 5) {
      setCurrentInputIndex(currentInputIndex + 1);
    }
  };

  const handleDelete = () => {
    if (currentInputIndex > 0) {
      const newOtp = [...otp];
      newOtp[currentInputIndex - 1] = '';
      setOtp(newOtp);
      setCode(newOtp.join(''));
      setCurrentInputIndex(currentInputIndex - 1);
    } else if (otp[currentInputIndex]) {
      // If at first input and has digit, clear it
      const newOtp = [...otp];
      newOtp[currentInputIndex] = '';
      setOtp(newOtp);
      setCode(newOtp.join(''));
    }
  };

  // Auto verify when OTP is complete
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && !verifying) {
      const timer = setTimeout(() => {
        handleVerify();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [otp, verifying]);

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (!otpString || otpString.length < 6) {
      Alert.alert(t('common.error'), t('emailVerification.enterFullOtp'));
      return;
    }

    setVerifying(true);
    try {
      // Use authService.verifyEmail with just the code
      await authService.verifyEmail(otpString);

      Alert.alert(t('common.success'), t('emailVerification.emailVerifiedSuccess'), [
        {
          text: 'OK',
          onPress: () => {
            (navigation as any).goBack();
          }
        }
      ]);

    } catch (error: any) {
      console.log('Verify email error:', error);
      let errorMessage = t('emailVerification.otpIncorrect');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert(t('common.error'), errorMessage);
      // Reset OTP on error
      setOtp(['', '', '', '', '', '']);
      setCode('');
      setCurrentInputIndex(0);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    handleSendCode();
  };

  // Render already verified view
  const renderAlreadyVerified = () => (
    <View style={styles.verifiedContainer}>
      <View style={styles.verifiedIconContainer}>
        <Icon name="check-circle" size={64} color={theme.colors.success || '#34C759'} />
      </View>
      <Text style={styles.verifiedTitle}>{t('emailVerification.emailAlreadyVerified')}</Text>
      <Text style={styles.verifiedSubtitle}>
        {t('emailVerification.emailVerifiedDescription')}
      </Text>
      {email && (
        <View style={styles.verifiedEmailContainer}>
          <Icon name="email-check" size={24} color={theme.colors.success || '#34C759'} />
          <Text style={styles.verifiedEmailText}>{email}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.backToProfileButton}
        onPress={() => (navigation as any).goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backToProfileButtonText}>{t('emailVerification.backToProfile')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state while checking verification status
  const renderCheckingStatus = () => (
    <View style={styles.checkingContainer}>
      <View style={styles.checkingIconContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
      <Text style={styles.checkingTitle}>{t('emailVerification.checkingStatus')}</Text>
      <Text style={styles.checkingSubtitle}>
        {t('emailVerification.checkingDescription')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      <View style={styles.mainContent}>
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
            <Text style={styles.headerTitle}>{t('emailVerification.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {isCodeSent
                ? t('emailVerification.subtitleCodeSent')
                : t('emailVerification.subtitle')
              }
            </Text>
          </View>
        </Animated.View>

        {/* Main Card */}
        <Animated.View
          style={styles.card}
          entering={FadeInDown.duration(800).delay(200).springify()}
        >
          {checkingStatus ? (
            // Checking verification status
            renderCheckingStatus()
          ) : isAlreadyVerified ? (
            // Already verified
            renderAlreadyVerified()
          ) : !isCodeSent ? (
            // Send Code Button State
            <View style={styles.sendCodeContainer}>
              <View style={styles.emailIconContainer}>
                <Icon name="email" size={48} color={theme.colors.primary} />
              </View>
              <Text style={styles.sendCodeTitle}>{t('emailVerification.verifyEmail')}</Text>
              <Text style={styles.sendCodeSubtitle}>
                {t('emailVerification.sendCodeDescription')}
              </Text>
              {email && (
                <View style={styles.emailDisplayContainer}>
                  <Icon name="email-check" size={20} color={theme.colors.primary} />
                  <Text style={styles.emailDisplayText}>{email}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.sendCodeButton, loading && styles.disabledButton]}
                onPress={() => handleSendCode()}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendCodeButtonText}>{t('emailVerification.sendVerificationCode')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // OTP Input Section
            <View style={styles.otpSection}>
              <View style={styles.otpHeader}>
                <View style={styles.otpIconContainer}>
                  <Icon name="email-outline" size={32} color={theme.colors.primary} />
                </View>
                <Text style={styles.otpTitle}>{t('emailVerification.enterVerificationCode')}</Text>
                <Text style={styles.otpSubtitle}>
                  {t('emailVerification.codeSentDescription')}
                </Text>
              </View>

              {/* OTP Input Display */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => {
                  const isActive = index === currentInputIndex;
                  const isFilled = Boolean(digit);

                  return (
                    <Animated.View
                      key={index}
                      entering={FadeInDown.duration(400).delay(index * 100)}
                      style={[
                        styles.otpInputWrapper,
                        isActive && styles.otpInputWrapperActive,
                        isFilled && styles.otpInputWrapperFilled
                      ]}
                    >
                      <Text style={[
                        styles.otpInputText,
                        isFilled && styles.otpInputTextFilled
                      ]}>
                        {digit || (isActive ? '|' : '')}
                      </Text>
                      {isFilled && (
                        <Animated.View
                          entering={FadeInDown.duration(200)}
                          style={styles.otpInputCheck}
                        >
                          <Icon name="check" size={12} color={theme.colors.primary} />
                        </Animated.View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${(otp.filter(d => d).length / 6) * 100}%` }
                  ]} />
                </View>
                <Text style={styles.progressText}>
                  {otp.filter(d => d).length}/6
                </Text>
              </View>

              {/* Resend Section */}
              <View style={styles.resendContainer}>
                {countdown > 0 ? (
                  <Text style={styles.timerText}>
                    {t('emailVerification.resendCodeAfter')} <Text style={styles.timer}>{countdown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendCode}
                    style={styles.resendButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resendButtonText}>{t('emailVerification.resendCode')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Custom Number Keyboard */}
        {isCodeSent && (
          <Animated.View
            style={styles.keyboardContainer}
            entering={SlideInDown.duration(600).delay(400).springify()}
          >
            <View style={styles.numberPad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(num.toString())}
                  activeOpacity={0.7}
                >
                  <Text style={styles.numberText}>{num}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.numberButton, styles.deleteButton]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Icon name="backspace-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.numberButton, styles.zeroButton]}
                onPress={() => handleNumberPress('0')}
                activeOpacity={0.7}
              >
                <Text style={styles.numberText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.numberButton, styles.verifyButton]}
                onPress={handleVerify}
                disabled={otp.join('').length !== 6 || verifying}
                activeOpacity={0.7}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="check" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
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
  mainContent: {
    flex: 1,
    paddingHorizontal: wp('4%'),
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

  // Send Code State Styles
  sendCodeContainer: {
    alignItems: 'center',
    paddingVertical: hp('2%'),
  },
  emailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  sendCodeTitle: {
    fontSize: wp('5%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginBottom: hp('1%'),
    textAlign: 'center',
  },
  sendCodeSubtitle: {
    fontSize: wp('4%'),
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: wp('5%'),
    marginBottom: hp('2%'),
  },
  emailDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('3%'),
    marginBottom: hp('3%'),
  },
  emailDisplayText: {
    fontSize: wp('4%'),
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginLeft: wp('2%'),
  },
  sendCodeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('8%'),
    borderRadius: wp('3%'),
    minWidth: wp('60%'),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sendCodeButtonText: {
    fontSize: wp('4%'),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: theme.colors.textLight,
    opacity: 0.6,
  },

  // Already Verified Styles
  verifiedContainer: {
    alignItems: 'center',
    paddingVertical: hp('4%'),
  },
  verifiedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: (theme.colors.success || '#34C759') + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  verifiedTitle: {
    fontSize: wp('5%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginBottom: hp('1%'),
    textAlign: 'center',
  },
  verifiedSubtitle: {
    fontSize: wp('4%'),
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: wp('5%'),
    marginBottom: hp('3%'),
  },
  verifiedEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (theme.colors.success || '#34C759') + '10',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('3%'),
    marginBottom: hp('4%'),
  },
  verifiedEmailText: {
    fontSize: wp('4%'),
    color: theme.colors.success || '#34C759',
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginLeft: wp('2%'),
  },
  backToProfileButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('8%'),
    borderRadius: wp('3%'),
    minWidth: wp('50%'),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backToProfileButtonText: {
    fontSize: wp('4%'),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
  },

  // Checking Status Styles
  checkingContainer: {
    alignItems: 'center',
    paddingVertical: hp('4%'),
  },
  checkingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  checkingTitle: {
    fontSize: wp('5%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginBottom: hp('1%'),
  },
  checkingSubtitle: {
    fontSize: wp('4%'),
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: wp('5%'),
  },

  // OTP Section Styles
  otpSection: {
    alignItems: 'center',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  otpIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  otpTitle: {
    fontSize: wp('5%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
    marginBottom: hp('0.5%'),
  },
  otpSubtitle: {
    fontSize: wp('4%'),
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
  },

  // OTP Input Styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('3%'),
    paddingHorizontal: wp('2%'),
  },
  otpInputWrapper: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('3%'),
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  otpInputWrapperActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  otpInputWrapperFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  otpInputText: {
    fontSize: wp('6%'),
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
  otpInputTextFilled: {
    color: theme.colors.primary,
  },
  otpInputCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Progress Bar Styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginRight: wp('3%'),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: wp('3.5%'),
    color: theme.colors.textLight,
  },

  // Resend Section Styles
  resendContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: wp('4%'),
    color: theme.colors.textLight,
  },
  timer: {
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: hp('1%'),
  },
  resendButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: wp('4%'),
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Custom Keyboard Styles
  keyboardContainer: {
    backgroundColor: theme.colors.white,
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('4%'),
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  numberButton: {
    width: '30%',
    aspectRatio: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: wp('3%'),
    marginBottom: hp('1%'),
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  numberText: {
    fontSize: wp('6%'),
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
  },
  zeroButton: {
    // Số 0 ở giữa
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 0,
  },
});

export default EmailVerificationScreen;


