import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { theme } from '../../theme/colors';
import LoadingOverlay from '../../component/LoadingOverlay';
import api from '../../utils/Api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import { StackScreen } from '../../navigation/types';
import { useTranslation } from '../../hooks/useTranslation';

const { width, height } = Dimensions.get('window');
const OTP_LENGTH = 6;

const OTPVerificationScreen: StackScreen<'OTPVerification'> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { identifier, type, flow = 'forgot' } = route.params;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [otpString, setOtpString] = useState('');
  const [hasVerified, setHasVerified] = useState(false);
  
  // Refs for hidden TextInput
  const hiddenTextInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let interval: number;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timer, canResend]);

  // Auto verify when OTP is complete
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === OTP_LENGTH && !loading && !hasVerified) {
      // Add small delay for better UX
      const timer = setTimeout(() => {
        handleVerifyOTP();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [otp, loading, hasVerified]);

  const handleNumberPress = (num: string) => {
    if (currentInputIndex >= OTP_LENGTH) return;

    // Reset verification state when user starts typing
    if (hasVerified) {
      setHasVerified(false);
    }

    const newOtp = [...otp];
    newOtp[currentInputIndex] = num;
    setOtp(newOtp);

    // Move to next input
    if (currentInputIndex < OTP_LENGTH - 1) {
      setCurrentInputIndex(currentInputIndex + 1);
    }
  };

  const handleDelete = () => {
    // Reset verification state when user deletes
    if (hasVerified) {
      setHasVerified(false);
    }

    if (currentInputIndex > 0) {
      const newOtp = [...otp];
      newOtp[currentInputIndex - 1] = '';
      setOtp(newOtp);
      setCurrentInputIndex(currentInputIndex - 1);
    } else if (otp[currentInputIndex]) {
      // If at first input and has digit, clear it
      const newOtp = [...otp];
      newOtp[currentInputIndex] = '';
      setOtp(newOtp);
    }
  };


  // Handle paste from clipboard
  const handlePaste = (text: string) => {
    // Remove non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 0) {
      // Reset verification state when user pastes
      if (hasVerified) {
        setHasVerified(false);
      }

      const newOtp = [...otp];
      const startIndex = currentInputIndex;
      
      // Fill OTP with pasted digits
      for (let i = 0; i < Math.min(numericText.length, OTP_LENGTH - startIndex); i++) {
        newOtp[startIndex + i] = numericText[i];
      }
      
      setOtp(newOtp);
      
      // Move cursor to the end or next empty position
      const nextIndex = Math.min(startIndex + numericText.length, OTP_LENGTH - 1);
      setCurrentInputIndex(nextIndex);
    }
  };

  // Handle text input change (for copy-paste)
  const handleTextChange = (text: string) => {
    setOtpString(text);
    
    // If text is longer than current OTP, it might be a paste
    if (text.length > otp.filter(d => d).length) {
      handlePaste(text);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      Alert.alert(t('common.error'), t('otp.invalidOtp'));
      return;
    }

    // Prevent multiple calls
    if (hasVerified || loading) {
      return;
    }

    setHasVerified(true);
    setLoading(true);
    try {
      let response;
      
      if (flow === 'forgot') {
        // Forgot password flow - use different API endpoint
        console.log('OTP verification for forgot password:', otpString);
        console.log('OTP verification for forgot password:', identifier);
        response = await api.post('/auth/accept-otp-password', {
          username: identifier,
          type: type,
          otp: otpString,
        });
      } else {
        // Register flow - use original API endpoint
        var payload = {
          email: identifier,
          otp: otpString,
        }
        console.log('OTP verification for register:', payload);
        response = await api.post('/auth/verify-email', payload);
      }
      console.log('OTP verification response:', response.data);
      
      if (response.data.status === false) {
        Alert.alert(
          t('otp.verificationFailed'), 
          response.data.message,
          [
            {
              text: t('common.confirm'),
              onPress: () => {
                // Reset verification state to allow retry
                setHasVerified(false);
                setOtp(['', '', '', '', '', '']);
                setCurrentInputIndex(0);
                setOtpString('');
              }
            }
          ]
        );
      } else {
        if (flow === 'forgot') {
          // Navigate to ChangePassword screen for forgot password flow
          Alert.alert(t('otp.verificationSuccessful'), response.data.message,
            [
              {
                text: t('common.confirm'),
                onPress: () => navigation.navigate('ChangePassword', {
                  identifier: identifier,
                  type: type,
                  token: response.data.data?.token || otpString,
                })
              }
            ]
          );
        } else {
          // Navigate to Login for register flow
          Alert.alert(t('otp.verificationSuccessful'), response.data.message,
            [
              {
                text: t('common.confirm'),
                onPress: () => navigation.replace('Login')
              }
            ]
          );
        }
      }
    } catch (error: any) {
      console.log('OTP verification error:', error);
      
      // Handle different error types
      let errorMessage = t('otp.invalidOtp');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.status === false) {
        errorMessage = error.response.data.message || t('otp.invalidOtp');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(t('otp.verificationFailed'), errorMessage, [
        {
          text: t('common.confirm'),
          onPress: () => {
            // Reset verification state to allow retry
            setHasVerified(false);
            setOtp(['', '', '', '', '', '']);
            setCurrentInputIndex(0);
            setOtpString('');
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    // if (!canResend) return;

    setLoading(true);
    try {
      let response;
      
      if (flow === 'forgot') {
        // Forgot password flow - use forgot password resend API
        console.log('Resend OTP for forgot password:', identifier);
        response = await api.post('/auth/forgot-password', {
          username: identifier,
          type: type
        });
      } else {
        // Register flow - use original resend API
        console.log('Resend OTP for register:', identifier);
        response = await api.post('/auth/resend-otp', {
          username: identifier,
          type: type
        });
      }
      
      console.log('Resend OTP response:', response.data);
      
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setCurrentInputIndex(0);
      setOtpString('');
      setHasVerified(false);
      Alert.alert(t('common.success'), t('otp.otpResent'));
    } catch (error: any) {
      console.log('Resend OTP error:', error.data);
      
      let errorMessage = t('otp.failedResend');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.status === false) {
        errorMessage = error.response.data.message || t('otp.failedResend');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatIdentifier = (id: string) => {
    if (type === 'phone') {
      return id.replace(/(\d{3})(\d{3})(\d{4})/, '***-***-$3');
    }
    const [username, domain] = id.split('@');
    return `${username.charAt(0)}***@${domain}`;
  };

  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      <View style={styles.mainContent}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
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
              <Text style={styles.headerTitle}>
                {flow === 'register' ? t('otp.verifyAccount') : flow === 'forgot' ? t('otp.resetPassword') : t('otp.otpVerification')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {flow === 'register' 
                  ? t('otp.enterCodeRegister', { identifier: formatIdentifier(identifier) })
                  : flow === 'forgot'
                  ? t('otp.enterCodeReset', { identifier: formatIdentifier(identifier) })
                  : t('otp.enterCodeGeneric', { identifier: formatIdentifier(identifier) })
                }
              </Text>
            </View>
          </Animated.View>

          {/* OTP Display Section */}
          <Animated.View
            style={styles.otpDisplaySection}
            entering={FadeInDown.duration(800).delay(200).springify()}
          >
            {/* Hidden TextInput for copy-paste support */}
            <TextInput
              ref={hiddenTextInputRef}
              style={styles.hiddenTextInput}
              value={otpString}
              onChangeText={handleTextChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus={false}
              caretHidden={true}
              contextMenuHidden={false}
              selectTextOnFocus={true}
            />
            
            <TouchableOpacity
              style={styles.otpContainer}
              onPress={() => hiddenTextInputRef.current?.focus()}
              activeOpacity={1}
            >
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
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${(otp.filter(d => d).length / OTP_LENGTH) * 100}%` }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {otp.filter(d => d).length}/{OTP_LENGTH}
              </Text>
            </View>

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              {!canResend ? (
                <Animated.View entering={FadeInDown.duration(400).delay(600)}>
                  <Text style={styles.timerText}>
                    {t('otp.resendAfter')} <Text style={styles.timer}>{timer}s</Text>
                  </Text>
                </Animated.View>
              ) : null}
                <Animated.View entering={FadeInDown.duration(400).delay(600)}>
                  <TouchableOpacity 
                    onPress={handleResendOTP}
                    style={styles.resendButton}
                    activeOpacity={0.7}>
                    <Text style={styles.resendButtonText}>{t('otp.resendCode')}</Text>
                  </TouchableOpacity>
                </Animated.View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Custom Number Keyboard */}
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
              onPress={handleVerifyOTP}
              disabled={otp.join('').length !== OTP_LENGTH}
              activeOpacity={0.7}
            >
              <Icon name="check" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      <LoadingOverlay 
        visible={loading} 
        message={
          flow === 'register' 
            ? t('otp.verifyingAccount')
            : flow === 'forgot' 
            ? t('otp.verifyingReset')
            : t('otp.verifyingOtp')
        } 
      />
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
  scrollView: {
    flex: 1,
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

  // OTP Display Section
  otpDisplaySection: {
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

  // Hidden TextInput for copy-paste
  hiddenTextInput: {
    position: 'absolute',
    left: -9999,
    opacity: 0,
    width: 1,
    height: 1,
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

export default OTPVerificationScreen;
