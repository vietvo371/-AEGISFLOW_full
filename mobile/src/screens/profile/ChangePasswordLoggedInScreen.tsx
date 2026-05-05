import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import ModalCustom from '../../component/ModalCustom';
import { theme, SPACING, FONT_SIZE, SCREEN_PADDING } from '../../theme';
import { authService } from '../../services/authService';

const ChangePasswordLoggedInScreen = () => {
    const navigation = useNavigation();
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
        if (strength <= 2) return { text: 'Yếu', color: theme.colors.error };
        if (strength <= 4) return { text: 'Trung bình', color: theme.colors.warning };
        return { text: 'Mạnh', color: theme.colors.success };
    };

    const validateForm = () => {
        const newErrors: {
            mat_khau_cu?: string;
            mat_khau_moi?: string;
            mat_khau_moi_confirmation?: string;
        } = {};

        if (!formData.mat_khau_cu) {
            newErrors.mat_khau_cu = 'Vui lòng nhập mật khẩu cũ';
        }

        if (!formData.mat_khau_moi) {
            newErrors.mat_khau_moi = 'Vui lòng nhập mật khẩu mới';
        } else if (formData.mat_khau_moi.length < 6) {
            newErrors.mat_khau_moi = 'Mật khẩu phải có ít nhất 6 ký tự';
        } else if (formData.mat_khau_moi === formData.mat_khau_cu) {
            newErrors.mat_khau_moi = 'Mật khẩu mới phải khác mật khẩu cũ';
        }

        if (!formData.mat_khau_moi_confirmation) {
            newErrors.mat_khau_moi_confirmation = 'Vui lòng xác nhận mật khẩu mới';
        } else if (formData.mat_khau_moi !== formData.mat_khau_moi_confirmation) {
            newErrors.mat_khau_moi_confirmation = 'Mật khẩu xác nhận không khớp';
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
            let message = 'Không thể thay đổi mật khẩu. Vui lòng thử lại.';

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
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader title="Đổi mật khẩu" variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.formSection}>
                    <Text style={styles.description}>
                        Để bảo mật tài khoản, vui lòng nhập mật khẩu cũ và mật khẩu mới của bạn.
                    </Text>

                    <InputCustom
                        label="Mật khẩu cũ"
                        placeholder="Nhập mật khẩu cũ"
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
                        label="Mật khẩu mới"
                        placeholder="Nhập mật khẩu mới"
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
                                Độ mạnh: {getPasswordStrengthText(passwordStrength).text}
                            </Text>
                        </View>
                    )}

                    <InputCustom
                        label="Xác nhận mật khẩu mới"
                        placeholder="Nhập lại mật khẩu mới"
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
                        title={loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                        onPress={handleChangePassword}
                        disabled={loading}
                        style={styles.submitButton}
                        icon="check-circle"
                    />

                    <View style={styles.tipsSection}>
                        <Text style={styles.tipsTitle}>💡 Lưu ý khi tạo mật khẩu:</Text>
                        <Text style={styles.tipText}>• Sử dụng ít nhất 8 ký tự</Text>
                        <Text style={styles.tipText}>• Kết hợp chữ hoa, chữ thường</Text>
                        <Text style={styles.tipText}>• Bao gồm số và ký tự đặc biệt</Text>
                        <Text style={styles.tipText}>• Không sử dụng thông tin cá nhân dễ đoán</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Success Modal */}
            <ModalCustom
                isModalVisible={showSuccessModal}
                setIsModalVisible={setShowSuccessModal}
                title="Thành công"
                type="success"
                isClose={false}
                actionText="OK"
                onPressAction={() => navigation.goBack()}
            >
                <Text style={{ textAlign: 'center', color: theme.colors.text }}>
                    Mật khẩu đã được thay đổi thành công
                </Text>
            </ModalCustom>

            {/* Error Modal */}
            <ModalCustom
                isModalVisible={showErrorModal}
                setIsModalVisible={setShowErrorModal}
                title="Lỗi"
                type="error"
                isClose={false}
                actionText="OK"
            >
                <Text style={{ textAlign: 'center', color: theme.colors.text }}>
                    {errorMessage}
                </Text>
            </ModalCustom>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
    },
    formSection: {
        backgroundColor: theme.colors.white,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
    },
    description: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.border,
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
        backgroundColor: theme.colors.backgroundSecondary,
        padding: SPACING.md,
        borderRadius: 8,
    },
    tipsTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: SPACING.sm,
    },
    tipText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        lineHeight: 18,
    },
});

export default ChangePasswordLoggedInScreen;
