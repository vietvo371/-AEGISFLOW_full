import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import ModalCustom from '../../component/ModalCustom';
import { SPACING, FONT_SIZE, SCREEN_PADDING } from '../../theme';
import { authService } from '../../services/authService';
import { useAppTheme } from '../../contexts/ThemeContext';

const ChangePasswordLoggedInScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { colors, isDark } = useAppTheme();
    const styles = getStyles(colors, isDark);
    const [loading, setLoading] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        mat_khau_cu: '',
        mat_khau_moi: '',
        mat_khau_moi_confirmation: '',
    });

    const [errors, setErrors] = useState<{
        mat_khau_cu?: string;
        mat_khau_moi?: string;
        mat_khau_moi_confirmation?: string;
    }>({});

    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
        if (strength <= 2) return { text: t('auth.weak', 'Yếu'), color: colors.error };
        if (strength <= 4) return { text: t('auth.medium', 'Trung bình'), color: colors.warning };
        return { text: t('auth.strong', 'Mạnh'), color: colors.success };
    };

    const validateForm = () => {
        const newErrors: {
            mat_khau_cu?: string;
            mat_khau_moi?: string;
            mat_khau_moi_confirmation?: string;
        } = {};

        if (!formData.mat_khau_cu) {
            newErrors.mat_khau_cu = t('changePassword.errors.currentPasswordRequired', 'Vui lòng nhập mật khẩu cũ');
        }

        if (!formData.mat_khau_moi) {
            newErrors.mat_khau_moi = t('changePassword.errors.newPasswordRequired', 'Vui lòng nhập mật khẩu mới');
        } else if (formData.mat_khau_moi.length < 6) {
            newErrors.mat_khau_moi = t('changePassword.errors.newPasswordLength', 'Mật khẩu phải có ít nhất 6 ký tự');
        } else if (formData.mat_khau_moi === formData.mat_khau_cu) {
            newErrors.mat_khau_moi = t('changePassword.errors.newPasswordDifferent', 'Mật khẩu mới phải khác mật khẩu cũ');
        }

        if (!formData.mat_khau_moi_confirmation) {
            newErrors.mat_khau_moi_confirmation = t('changePassword.errors.confirmPasswordRequired', 'Vui lòng xác nhận mật khẩu mới');
        } else if (formData.mat_khau_moi !== formData.mat_khau_moi_confirmation) {
            newErrors.mat_khau_moi_confirmation = t('changePassword.errors.passwordsNotMatch', 'Mật khẩu xác nhận không khớp');
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
            await authService.changePassword({
                current_password: formData.mat_khau_cu,
                password: formData.mat_khau_moi,
                password_confirmation: formData.mat_khau_moi_confirmation,
            });
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Change password error:', error);
            let message = t('changePassword.passwordChangeFailed', 'Không thể thay đổi mật khẩu. Vui lòng thử lại.');

            if (error.response?.data?.message) {
                message = error.response.data.message;
            } else if (error.message) {
                message = error.message;
            }

            setErrorMessage(message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <PageHeader title={t('changePassword.title', 'Đổi mật khẩu')} variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.formSection}>
                    <Text style={styles.description}>
                        {t('changePassword.description', 'Để bảo mật tài khoản, vui lòng nhập mật khẩu cũ và mật khẩu mới của bạn.')}
                    </Text>

                    <InputCustom
                        label={t('changePassword.currentPassword', 'Mật khẩu cũ')}
                        placeholder={t('changePassword.currentPasswordPlaceholder', 'Nhập mật khẩu cũ')}
                        value={formData.mat_khau_cu}
                        onChangeText={(text) => setFormData({ ...formData, mat_khau_cu: text })}
                        secureTextEntry={!showOldPassword}
                        error={errors.mat_khau_cu}
                        leftIcon="lock-outline"
                        rightIcon={showOldPassword ? 'eye-off-outline' : 'eye-outline'}
                        onRightIconPress={() => setShowOldPassword(!showOldPassword)}
                        containerStyle={styles.input}
                    />

                    <InputCustom
                        label={t('changePassword.newPassword', 'Mật khẩu mới')}
                        placeholder={t('changePassword.newPasswordPlaceholder', 'Nhập mật khẩu mới')}
                        value={formData.mat_khau_moi}
                        onChangeText={(text) => {
                            setFormData({ ...formData, mat_khau_moi: text });
                            setPasswordStrength(calculatePasswordStrength(text));
                        }}
                        secureTextEntry={!showNewPassword}
                        error={errors.mat_khau_moi}
                        leftIcon="lock-outline"
                        rightIcon={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        onRightIconPress={() => setShowNewPassword(!showNewPassword)}
                        containerStyle={styles.input}
                    />

                    {/* Password Strength Indicator */}
                    {formData.mat_khau_moi.length > 0 && (
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
                                {t('changePassword.strengthText', 'Độ mạnh')}: {getPasswordStrengthText(passwordStrength).text}
                            </Text>
                        </View>
                    )}

                    <InputCustom
                        label={t('changePassword.confirmNewPassword', 'Xác nhận mật khẩu mới')}
                        placeholder={t('changePassword.confirmNewPasswordPlaceholder', 'Nhập lại mật khẩu mới')}
                        value={formData.mat_khau_moi_confirmation}
                        onChangeText={(text) => setFormData({ ...formData, mat_khau_moi_confirmation: text })}
                        secureTextEntry={!showConfirmPassword}
                        error={errors.mat_khau_moi_confirmation}
                        leftIcon="lock-check-outline"
                        rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        containerStyle={styles.input}
                    />

                    <ButtonCustom
                        title={loading ? t('changePassword.changingPassword', 'Đang xử lý...') : t('changePassword.title', 'Đổi mật khẩu')}
                        onPress={handleChangePassword}
                        disabled={loading}
                        style={styles.submitButton}
                        icon="check-circle"
                    />

                    <View style={styles.tipsSection}>
                        <Text style={styles.tipsTitle}>{t('changePassword.tipsTitle', '💡 Lưu ý khi tạo mật khẩu:')}</Text>
                        <Text style={styles.tipText}>{t('changePassword.tipMinLength', '• Sử dụng ít nhất 8 ký tự')}</Text>
                        <Text style={styles.tipText}>{t('changePassword.tipCombine', '• Kết hợp chữ hoa, chữ thường')}</Text>
                        <Text style={styles.tipText}>{t('changePassword.tipSpecialChars', '• Bao gồm số và ký tự đặc biệt')}</Text>
                        <Text style={styles.tipText}>{t('changePassword.tipNoPersonalInfo', '• Không sử dụng thông tin cá nhân dễ đoán')}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Success Modal */}
            <ModalCustom
                isModalVisible={showSuccessModal}
                setIsModalVisible={setShowSuccessModal}
                title={t('common.success', 'Thành công')}
                type="success"
                isClose={false}
                actionText="OK"
                onPressAction={() => navigation.goBack()}
            >
                <Text style={{ textAlign: 'center', color: colors.text }}>
                    {t('changePassword.passwordChanged', 'Mật khẩu đã được thay đổi thành công')}
                </Text>
            </ModalCustom>

            {/* Error Modal */}
            <ModalCustom
                isModalVisible={showErrorModal}
                setIsModalVisible={setShowErrorModal}
                title={t('common.error', 'Lỗi')}
                type="error"
                isClose={false}
                actionText="OK"
            >
                <Text style={{ textAlign: 'center', color: colors.text }}>
                    {errorMessage}
                </Text>
            </ModalCustom>
        </View>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    content: {
        flex: 1,
    },
    formSection: {
        backgroundColor: colors.card,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
    },
    description: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: 20,
    },
    input: {
        marginBottom: SPACING.md,
    },
    passwordStrengthContainer: {
        marginTop: -SPACING.sm,
        marginBottom: SPACING.md,
    },
    passwordStrengthBar: {
        height: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: SPACING.xs,
    },
    passwordStrengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    passwordStrengthText: {
        fontSize: FONT_SIZE.xs,
        textAlign: 'right',
    },
    submitButton: {
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
    },
    tipsSection: {
        backgroundColor: colors.backgroundSecondary,
        padding: SPACING.md,
        borderRadius: 8,
    },
    tipsTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: colors.text,
        marginBottom: SPACING.sm,
    },
    tipText: {
        fontSize: FONT_SIZE.xs,
        color: colors.textSecondary,
        marginBottom: 4,
        lineHeight: 18,
    },
});

export default ChangePasswordLoggedInScreen;
