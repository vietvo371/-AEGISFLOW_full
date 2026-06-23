import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';

import { SPACING, FONT_SIZE } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { mediaService } from '../../services/mediaService';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import { useAppTheme } from '../../contexts/ThemeContext';

const UserProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors, isDark, theme } = useAppTheme();
  const styles = getStyles(colors, isDark);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: (user as any)?.name || '',
    phone: (user as any)?.phone || '',
    avatar: (user as any)?.avatar || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: (user as any)?.name || '',
        phone: (user as any)?.phone || '',
        avatar: (user as any)?.avatar || '',
      });
    }
  }, [user]);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 512,
        maxHeight: 512,
      });

      if (result.assets && result.assets.length > 0) {
        setUploadingAvatar(true);
        try {
          const response = await mediaService.uploadMedia(
            result.assets[0],
            'image',
            'phan_anh',
            'Avatar'
          );
          if (response.success && response.data) {
            setFormData(prev => ({ ...prev, avatar: response.data.url }));
          }
        } catch (error) {
          console.error('Upload avatar error:', error);
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('Pick image error:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);
    try {
      await authService.updateProfile({
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar,
      } as any);
      setIsEditing(false);
    } catch (error) {
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initials = formData.name
    ? formData.name
        .split(' ')
        .map((w: string) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('citizen.profile.manageProfile', 'Thông tin cá nhân')}
        showNotification={false}
        showBack={true}
        rightComponent={
          !isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>{t('common.edit', 'Sửa')}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {formData.avatar ? (
              <Image source={{ uri: formData.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            {isEditing && (
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handlePickImage}
                disabled={uploadingAvatar}
                activeOpacity={0.8}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="camera" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
          {!isEditing && <Text style={styles.nameDisplay}>{formData.name}</Text>}
          {!isEditing && <Text style={styles.emailDisplay}>{(user as any)?.email}</Text>}
        </View>

        {/* Form / Details Section */}
        {!isEditing ? (
          <View style={styles.card}>
            <DetailRow
              icon="account"
              iconColor={colors.primary}
              iconBg={isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.08)'}
              label={t('citizen.profile.fullName', 'Họ và tên')}
              value={formData.name}
              borderStyle={styles.detailBorder}
              styles={styles}
            />
            <DetailRow
              icon="email"
              iconColor={isDark ? '#60A5FA' : '#3B82F6'}
              iconBg={isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.08)'}
              label={t('citizen.profile.email', 'Email')}
              value={(user as any)?.email || ''}
              borderStyle={styles.detailBorder}
              styles={styles}
            />
            <DetailRow
              icon="phone"
              iconColor={colors.success}
              iconBg={isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(23, 178, 106, 0.08)'}
              label={t('citizen.profile.phone', 'Số điện thoại')}
              value={formData.phone}
              borderStyle={styles.detailBorder}
              styles={styles}
              last
            />
          </View>
        ) : (
          <View style={styles.editForm}>
            <InputCustom
              placeholder={t('citizen.profile.fullName', 'Họ và tên')}
              value={formData.name}
              onChangeText={text => setFormData(p => ({ ...p, name: text }))}
              leftIcon="account-outline"
              containerStyle={styles.inputSpacing}
              required
            />

            <View style={styles.disabledInputContainer}>
              <InputCustom
                placeholder={t('citizen.profile.email', 'Email')}
                value={(user as any)?.email || ''}
                onChangeText={() => {}}
                leftIcon="email-outline"
                containerStyle={styles.inputSpacing}
                editable={false}
              />
              <Text style={styles.helperText}>
                {t('profile.emailDisabledHelp', 'Email liên kết với tài khoản không thể thay đổi')}
              </Text>
            </View>

            <InputCustom
              placeholder={t('citizen.profile.phone', 'Số điện thoại')}
              value={formData.phone}
              onChangeText={text => setFormData(p => ({ ...p, phone: text }))}
              leftIcon="phone-outline"
              containerStyle={styles.inputSpacing}
              keyboardType="phone-pad"
            />

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setIsEditing(false);
                  if (user) {
                    setFormData({
                      name: (user as any)?.name || '',
                      phone: (user as any)?.phone || '',
                      avatar: (user as any)?.avatar || '',
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{t('common.cancel', 'Hủy')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtnWrapper}
                onPress={handleSave}
                disabled={loading || !formData.name.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    loading || !formData.name.trim()
                      ? [colors.disabled, colors.disabled]
                      : colors.gradientPrimary
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Icon name="check-circle-outline" size={18} color="#fff" style={styles.saveBtnIcon} />
                      <Text style={styles.saveText}>{t('profile.saveChanges', 'Lưu thay đổi')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Sub-component for viewing user details
interface DetailRowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  borderStyle: any;
  styles: any;
  last?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  borderStyle,
  styles,
  last,
}) => (
  <View style={styles.detailRow}>
    <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={[styles.detailContent, !last && borderStyle]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  </View>
);

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  scroll: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarWrap: {
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0 : 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: isDark ? 0 : 6,
      },
    }),
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.card,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.card,
    ...Platform.select({
      ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  nameDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emailDisplay: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingLeft: 12,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: isDark ? 0 : 1,
      },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
  },
  detailBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  editForm: {
    gap: 12,
  },
  inputSpacing: {
    marginBottom: 0,
  },
  disabledInputContainer: {
    gap: 4,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 8,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: isDark ? colors.backgroundSecondary : '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveBtnWrapper: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  saveBtnIcon: {
    marginRight: 6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default UserProfileScreen;
