import * as React from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import api from '../../utils/Api';
import { useTranslation } from '../../hooks/useTranslation';

const UpdatePasswordScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = t('changePassword.currentPasswordRequired');
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = t('changePassword.newPasswordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('changePassword.passwordMinLength');
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('changePassword.confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('changePassword.passwordsNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return null;
    if (password.length < 6) return { level: 'weak', color: '#FF6B6B' };
    if (password.length < 10) return { level: 'medium', color: '#FFA726' };
    return { level: 'strong', color: '#4CAF50' };
  };

  const performUpdatePassword = async () => {
    setLoading(true);
    try {
      const response = await api.post('/client/update-password', {
        current_password: currentPassword.trim(),
        new_password: newPassword.trim(),
        new_password_confirmation: confirmPassword.trim()
      });

      console.log('Update password response:', response.data);

      if (response.data.status) {
        Alert.alert(
          t('common.success'),
          t('changePassword.passwordChanged'),
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('', response.data.message || t('changePassword.passwordChangeFailed'));
      }

    } catch (error: any) {
      console.log('Update password error:', error);

      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors || {};
        const formattedErrors: { [key: string]: string } = {};
        Object.keys(validationErrors).forEach(key => {
          if (Array.isArray(validationErrors[key])) {
            formattedErrors[key] = validationErrors[key][0];
          } else {
            formattedErrors[key] = validationErrors[key];
          }
        });
        setErrors(formattedErrors);
        const firstError = Object.values(formattedErrors)[0];
        Alert.alert(t('common.error'), String(firstError));
      } else {
        let errorMessage = t('changePassword.passwordChangeFailed');
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        Alert.alert(t('common.error'), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = () => {
    setErrors({});
    if (!validateForm()) return;
    performUpdatePassword();
  };

  const renderPasswordInput = (
    fieldKey: string,
    label: string,
    value: string,
    placeholder: string,
    showPassword: boolean,
    onToggleVisibility: () => void
  ) => {
    const passwordStrength = fieldKey === 'newPassword' ? getPasswordStrength(value) : null;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              errors[fieldKey] && styles.inputError
            ]}
            value={value}
            onChangeText={(text) => {
              switch (fieldKey) {
                case 'currentPassword':
                  setCurrentPassword(text);
                  break;
                case 'newPassword':
                  setNewPassword(text);
                  break;
                case 'confirmPassword':
                  setConfirmPassword(text);
                  break;
              }
              if (errors[fieldKey]) {
                setErrors(prev => ({ ...prev, [fieldKey]: '' }));
              }
            }}
            placeholder={placeholder}
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={onToggleVisibility}
          >
            <Icon
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {errors[fieldKey] && <Text style={styles.errorText}>{errors[fieldKey]}</Text>}

        {passwordStrength && (
          <View style={styles.passwordStrengthContainer}>
            <Text style={styles.passwordStrengthLabel}>
              {t('changePassword.passwordStrength')}:
            </Text>
            <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
              {t(`changePassword.${passwordStrength.level}`)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('changePassword.title')}</Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderPasswordInput(
          'currentPassword',
          t('changePassword.currentPassword'),
          currentPassword,
          t('changePassword.enterCurrentPassword'),
          showPasswords.current,
          () => setShowPasswords(prev => ({ ...prev, current: !prev.current }))
        )}

        {renderPasswordInput(
          'newPassword',
          t('changePassword.newPassword'),
          newPassword,
          t('changePassword.enterNewPassword'),
          showPasswords.new,
          () => setShowPasswords(prev => ({ ...prev, new: !prev.new }))
        )}

        {renderPasswordInput(
          'confirmPassword',
          t('changePassword.confirmNewPassword'),
          confirmPassword,
          t('changePassword.enterConfirmPassword'),
          showPasswords.confirm,
          () => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))
        )}

        <View style={styles.infoBox}>
          <Icon name="information" size={20} color="#666" />
          <Text style={styles.infoText}>
            {t('changePassword.enterStrongPassword')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: wp('4%'),
    color: '#4A90E2',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: wp('3.5%'),
    color: '#000',
    fontWeight: '500',
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    padding: 12,
    paddingRight: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: wp('4%'),
    color: '#000',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  errorText: {
    fontSize: wp('3%'),
    color: '#FF6B6B',
    marginTop: 4,
    marginLeft: 4,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  passwordStrengthLabel: {
    fontSize: wp('3%'),
    color: '#666',
    marginRight: 8,
  },
  passwordStrengthText: {
    fontSize: wp('3%'),
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: wp('3.5%'),
    color: '#666',
    marginLeft: 8,
  },
});

export default UpdatePasswordScreen;
