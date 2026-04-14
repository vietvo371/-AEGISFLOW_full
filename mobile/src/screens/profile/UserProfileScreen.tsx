import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../../navigation/types';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import ModalCustom from '../../component/ModalCustom';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING, wp } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { launchImageLibrary } from 'react-native-image-picker';
import { mediaService } from '../../services/mediaService';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

const UserProfileScreen = () => {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    ho_ten: user?.ho_ten || '',
    so_dien_thoai: user?.so_dien_thoai || '',
    anh_dai_dien: user?.anh_dai_dien || '',
  });
  const [errors, setErrors] = useState<{
    ho_ten?: string;
    so_dien_thoai?: string;
  }>({});

  useEffect(() => {
    if (user) {
      setFormData({
        ho_ten: user.ho_ten || '',
        so_dien_thoai: user.so_dien_thoai || '',
        anh_dai_dien: user.anh_dai_dien || '',
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: { ho_ten?: string; so_dien_thoai?: string } = {};

    if (!formData.ho_ten.trim()) {
      newErrors.ho_ten = 'Họ tên không được để trống';
    }

    // Clean phone number: remove spaces, dashes, and other non-digit characters
    const cleanedPhone = formData.so_dien_thoai.replace(/\D/g, '');

    if (formData.so_dien_thoai && cleanedPhone.length > 0 && !/^\d{9,11}$/.test(cleanedPhone)) {
      newErrors.so_dien_thoai = 'Số điện thoại phải có 9-11 chữ số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 512,
        maxHeight: 512,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingAvatar(true);

        try {
          const response = await mediaService.uploadMedia(
            asset,
            'image',
            'phan_anh',
            'Avatar'
          );

          if (response.success && response.data) {
            // Update formData with new avatar URL
            setFormData({ ...formData, anh_dai_dien: response.data.url });
          }
        } catch (error) {
          console.error('Upload avatar error:', error);
          setErrorMessage('Không thể tải ảnh lên. Vui lòng thử lại.');
          setShowErrorModal(true);
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {};

      if (formData.ho_ten !== user?.ho_ten) {
        updateData.ho_ten = formData.ho_ten;
      }
      if (formData.so_dien_thoai !== user?.so_dien_thoai) {
        updateData.so_dien_thoai = formData.so_dien_thoai;
      }
      if (formData.anh_dai_dien !== user?.anh_dai_dien) {
        updateData.anh_dai_dien = formData.anh_dai_dien;
      }

      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        return;
      }

      await authService.updateProfile(updateData);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Update profile error:', error);
      let message = 'Không thể cập nhật thông tin. Vui lòng thử lại.';

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

  const handleCancel = () => {
    setFormData({
      ho_ten: user?.ho_ten || '',
      so_dien_thoai: user?.so_dien_thoai || '',
      anh_dai_dien: user?.anh_dai_dien || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader
        title="Thông tin cá nhân"
        variant="default"
        rightComponent={
          !isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Icon name="pencil" size={ICON_SIZE.md} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {formData.anh_dai_dien ? (
              <Image source={{ uri: formData.anh_dai_dien }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {formData.ho_ten?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            {isEditing && (
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={handlePickImage}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Icon name="camera" size={20} color={theme.colors.white} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <InputCustom
            label="Họ và tên"
            placeholder="Nhập họ và tên"
            value={formData.ho_ten}
            onChangeText={(text) => setFormData({ ...formData, ho_ten: text })}
            error={errors.ho_ten}
            editable={isEditing}
            leftIcon="account-outline"
            containerStyle={styles.input}
          />

          <InputCustom
            label="Email"
            placeholder="Email"
            value={user?.email || ''}
            onChangeText={() => { }} // Read-only field
            editable={false}
            leftIcon="email-outline"
            containerStyle={styles.input}
          />

          <InputCustom
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            value={formData.so_dien_thoai}
            onChangeText={(text) => setFormData({ ...formData, so_dien_thoai: text })}
            error={errors.so_dien_thoai}
            editable={isEditing}
            leftIcon="phone-outline"
            keyboardType="phone-pad"
            containerStyle={styles.input}
          />

          {/* User Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Thống kê</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Icon name="file-document-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{user?.tong_so_phan_anh || 0}</Text>
                <Text style={styles.statLabel}>Báo cáo</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="star-outline" size={24} color={theme.colors.warning} />
                <Text style={styles.statValue}>{user?.diem_thanh_pho || 0}</Text>
                <Text style={styles.statLabel}>Điểm thưởng</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="shield-check-outline" size={24} color={theme.colors.success} />
                <Text style={styles.statValue}>{user?.diem_uy_tin || 0}</Text>
                <Text style={styles.statLabel}>Uy tín</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="percent-outline" size={24} color={theme.colors.info} />
                <Text style={styles.statValue}>{user?.ty_le_chinh_xac || 0}%</Text>
                <Text style={styles.statLabel}>Chính xác</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <ButtonCustom
              title="Hủy"
              onPress={handleCancel}
              variant="outline"
              style={styles.cancelButton}
            />
            <ButtonCustom
              title={loading ? 'Đang lưu...' : 'Lưu'}
              onPress={handleSave}
              disabled={loading}
              style={styles.saveButton}
              icon={loading ? undefined : 'content-save'}
            />
          </View>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Success Modal */}
      <ModalCustom
        isModalVisible={showSuccessModal}
        setIsModalVisible={setShowSuccessModal}
        title="Thành công"
        type="success"
        isClose={false}
        actionText="OK"
        onPressAction={() => {
          setIsEditing(false);
          navigation.goBack();
        }}
      >
        <Text style={{ textAlign: 'center', color: theme.colors.text }}>
          Cập nhật thông tin thành công
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: theme.colors.white,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: wp('30%'),
    height: wp('30%'),
    borderRadius: wp('15%'),
  },
  avatarPlaceholder: {
    width: wp('30%'),
    height: wp('30%'),
    borderRadius: wp('15%'),
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: '700',
    color: theme.colors.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  formSection: {
    backgroundColor: theme.colors.white,
    padding: SCREEN_PADDING.horizontal,
    marginBottom: SPACING.md,
  },
  input: {
    marginBottom: SPACING.md,
  },
  statsSection: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SCREEN_PADDING.horizontal,
    marginBottom: SPACING['xl'],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserProfileScreen;
