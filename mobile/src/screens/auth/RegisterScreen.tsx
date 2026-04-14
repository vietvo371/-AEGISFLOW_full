import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { AlertService } from '../../services/AlertService';
import Animated, { FadeInDown, FadeInUp, SlideInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { theme } from '../../theme/colors';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../theme/responsive';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import LoadingOverlay from '../../component/LoadingOverlay';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { signUp } = useAuth();

  const initialFormData = {
    name: '',
    email: '',
    phone: '',
    password: '',
    re_password: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setPasswordStrength(0);
    setCurrentStep(1);
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;


  const validateStep1 = () => {
    const emailError = validateField('email', formData.email);
    const phoneError = validateField('phone', formData.phone);

    const newErrors = {
      ...(emailError ? { email: emailError } : {}),
      ...(phoneError ? { number_phone: phoneError } : {})
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const nameError = validateField('name', formData.name);

    const newErrors = {
      ...(nameError ? { full_name: nameError } : {}),
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const passwordError = validateField('password', formData.password);
    const rePasswordError = validateField('re_password', formData.re_password);

    const newErrors = {
      ...(passwordError ? { password: passwordError } : {}),
      ...(rePasswordError ? { re_password: rePasswordError } : {}),
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      default:
        return false;
    }
  };

  const handleNext = () => {
    const isValid = validateForm();
    if (!isValid) return;

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      setErrors({});
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setErrors({});
    } else {
      navigation.goBack();
    }
  };

  const handleRegister = async () => {
    const isValid = validateForm();
    if (!isValid) {
      return;
    }
    setLoading(true);
    try {
      // Use signUp from AuthContext
      await signUp({
        ho_ten: formData.name,
        email: formData.email,
        mat_khau: formData.password,
        mat_khau_confirmation: formData.re_password,
        so_dien_thoai: formData.phone,
      });

      // Reset form before navigating
      resetForm();

      AlertService.success('Đăng ký thành công', 'Tài khoản của bạn đã được tạo thành công',
        [
          {
            text: 'Xác nhận',
            onPress: () => {
              // Navigate to login sau khi đăng ký thành công
              navigation.navigate('Login');
            }
          }
        ]
      );

    } catch (error: any) {
      console.log('Registration error:', error.response);
      if (error.response?.data?.errors) {
        const fieldMapping: Record<string, string> = {
          email: 'email',
          so_dien_thoai: 'number_phone',
          ho_ten: 'full_name',
          mat_khau: 'password',
          mat_khau_confirmation: 're_password',
        };

        const newErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(([field, messages]) => {
          const mappedField = fieldMapping[field] || field;
          const errorMessage = Array.isArray(messages) ? messages[0] : messages as string;
          newErrors[mappedField] = errorMessage;
        });

        setErrors(newErrors);

        const step1Fields = ['email', 'number_phone'];
        const step2Fields = ['full_name'];
        const step3Fields = ['password', 're_password'];

        const errorFields = Object.keys(newErrors);

        if (errorFields.some(field => step1Fields.includes(field))) {
          setCurrentStep(1);
        } else if (errorFields.some(field => step2Fields.includes(field))) {
          setCurrentStep(2);
        } else if (errorFields.some(field => step3Fields.includes(field))) {
          setCurrentStep(3);
        }

      } else if (error.response?.data?.message) {
        const currentStepFirstField = currentStep === 1 ? 'email' :
          currentStep === 2 ? 'full_name' : 'password';

        setErrors({
          [currentStepFirstField]: error.response.data.message
        });
      } else if (error.message) {
        const currentStepFirstField = currentStep === 1 ? 'email' :
          currentStep === 2 ? 'full_name' : 'password';

        setErrors({
          [currentStepFirstField]: error.message
        });
      } else {
        const currentStepFirstField = currentStep === 1 ? 'email' :
          currentStep === 2 ? 'full_name' : 'password';

        setErrors({
          [currentStepFirstField]: 'Đăng ký thất bại. Vui lòng thử lại.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: string, value: string) => {
    let error = '';

    switch (field) {
      case 'email':
        if (!value) {
          error = 'Vui lòng nhập email';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = 'Email không hợp lệ';
        }
        break;

      case 'phone':
        if (!value) {
          error = 'Vui lòng nhập số điện thoại';
        } else if (!/^[0-9+().\-\s]{7,15}$/.test(value)) {
          error = 'Số điện thoại không hợp lệ';
        }
        break;

      case 'name':
        if (!value) {
          error = 'Vui lòng nhập họ tên';
        } else if (value.length < 2) {
          error = 'Họ tên phải có ít nhất 2 ký tự';
        }
        break;

      case 'password':
        if (!value) {
          error = 'Vui lòng nhập mật khẩu';
        } else if (value.length < 6) {
          error = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        break;

      case 're_password':
        if (!value) {
          error = 'Vui lòng xác nhận mật khẩu';
        } else if (value !== formData.password) {
          error = 'Mật khẩu không khớp';
        }
        break;
    }

    return error;
  };

  const updateFormData = (key: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    if (typeof value === 'string') {
      const error = validateField(key, value);
      setErrors(prev => ({ ...prev, [key]: error }));
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
    if (strength <= 2) return { text: 'Yếu', color: theme.colors.error };
    if (strength <= 4) return { text: 'Trung bình', color: theme.colors.warning };
    return { text: 'Mạnh', color: theme.colors.success };
  };

  const renderStep1 = () => (
    <View style={styles.form}>
      <InputCustom
        label="Email"
        placeholder="Nhập địa chỉ email"
        value={formData.email}
        onChangeText={value => updateFormData('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        required
        leftIcon="email-outline"
        containerStyle={styles.input}
      />

      <InputCustom
        label="Số điện thoại"
        placeholder="Nhập số điện thoại"
        value={formData.phone}
        onChangeText={value => updateFormData('phone', value)}
        keyboardType="phone-pad"
        error={errors.number_phone}
        required
        leftIcon="phone-outline"
        containerStyle={styles.input}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      <InputCustom
        label="Họ và tên"
        placeholder="Nhập họ và tên đầy đủ"
        value={formData.name}
        onChangeText={value => updateFormData('name', value)}
        error={errors.full_name}
        required
        leftIcon="account-outline"
        containerStyle={styles.input}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.form}>
      <InputCustom
        label="Mật khẩu"
        placeholder="Tạo mật khẩu"
        value={formData.password}
        onChangeText={(text) => {
          updateFormData('password', text);
          setPasswordStrength(calculatePasswordStrength(text));
        }}
        secureTextEntry={!showPassword}
        error={errors.password}
        required
        leftIcon="lock-outline"
        rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setShowPassword(!showPassword)}
        containerStyle={styles.input}
      />

      {formData.password.length > 0 && (
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
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu"
        value={formData.re_password}
        onChangeText={value => updateFormData('re_password', value)}
        secureTextEntry={!showConfirmPassword}
        error={errors.re_password}
        required
        leftIcon="lock-check-outline"
        rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
        containerStyle={styles.input}
      />

    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(step => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep === step && styles.stepDotActive,
            currentStep > step && styles.stepDotCompleted
          ]}
        />
      ))}
    </View>
  );

  const renderForm = () => (
    <Animated.View
      style={styles.formContainer}
      entering={SlideInDown.duration(800).delay(800).springify()}
    >
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>
          Đăng ký tài khoản
        </Text>
        <Text style={styles.formSubtitle}>
          Tham gia CityResQ360 để góp phần xây dựng thành phố thông minh
        </Text>
        {renderStepIndicator()}
      </View>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      <View style={styles.buttonContainer}>
        <ButtonCustom
          title={currentStep === 1 ? 'Hủy' : 'Quay lại'}
          onPress={handleBack}
          style={styles.backButton}
          variant="outline"
        />
        <ButtonCustom
          title={currentStep === totalSteps ? 'Đăng ký' : 'Tiếp theo'}
          onPress={handleNext}
          style={styles.nextButton}
          icon={currentStep === totalSteps ? "account-plus" : "chevron-right"}
        />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Help')}
          >
            <Icon name="headset" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View
            style={styles.headerContainer}
            entering={FadeInDown.duration(600).springify()}
          >
            <Animated.Text
              style={styles.welcomeText}
              entering={FadeInDown.duration(800).delay(200).springify()}
            >
              Chào mừng đến với CityResQ360
            </Animated.Text>

            <Animated.Text
              style={styles.title}
              entering={FadeInDown.duration(800).delay(400).springify()}
            >
              Đăng ký tài khoản
            </Animated.Text>
          </Animated.View>

          {/* Form Section */}
          {renderForm()}

          {/* Footer */}
          <Animated.View
            style={styles.footerContainer}
            entering={FadeInUp.duration(600).delay(1200).springify()}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginText}>
                Đã có tài khoản?{' '}
                <Text style={styles.loginLinkText}>Đăng nhập ngay</Text>
              </Text>
            </TouchableOpacity>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <Icon name="shield-check" size={16} color={theme.colors.primary} />
              <Text style={styles.securityText}>
                Dữ liệu được bảo mật và mã hóa
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={loading} message="Đang đăng ký tài khoản..." />

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
  headerIcons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp('9%') : hp('4%'),
    right: SPACING.lg,
    flexDirection: 'column',
    gap: SPACING.md,
    zIndex: 1,
  },
  headerIconButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
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
  decorativeCircle1: {
    position: 'absolute',
    top: hp('-6%'),
    right: wp('-12%'),
    width: wp('37.5%'),
    height: wp('37.5%'),
    borderRadius: wp('18.75%'),
    backgroundColor: theme.colors.primary + '15',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: hp('-4%'),
    left: wp('-7.5%'),
    width: wp('25%'),
    height: wp('25%'),
    borderRadius: wp('12.5%'),
    backgroundColor: theme.colors.secondary + '15',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },

  // Header Styles
  headerContainer: {
    alignItems: 'center',
    paddingTop: hp('8%'),
    paddingBottom: SPACING.xl,
  },
  welcomeText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textLight,
    fontFamily: theme.typography.fontFamily,
    marginBottom: SPACING.xs,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: FONT_SIZE['4xl'],
    color: theme.colors.primary,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: FONT_SIZE.md,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.5,
    paddingHorizontal: SPACING.lg,
  },

  // Form Styles
  formContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  formTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: FONT_SIZE.xl,
    color: theme.colors.text,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: SPACING.lg,
  },

  // Step Indicator Styles
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  stepDot: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
    backgroundColor: theme.colors.border,
  },
  stepDotActive: {
    width: wp('2.5%'),
    height: wp('2.5%'),
    borderRadius: wp('1.25%'),
    backgroundColor: theme.colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: theme.colors.primary,
  },

  // Button Container Styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
    height: hp('6%'),
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  nextButton: {
    flex: 1,
    height: hp('6%'),
    backgroundColor: theme.colors.primary,
  },

  // Password Strength Styles
  passwordStrengthContainer: {
    marginTop: -SPACING.md,
    marginBottom: SPACING.lg,
  },
  passwordStrengthBar: {
    height: wp('1%'),
    backgroundColor: theme.colors.border,
    borderRadius: wp('0.5%'),
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: wp('0.5%'),
  },
  passwordStrengthText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'right',
  },

  // Footer Styles
  footerContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  loginLink: {
    paddingVertical: SPACING.sm,
  },
  loginText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  securityText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
    flex: 1,
  },
});

export default RegisterScreen;