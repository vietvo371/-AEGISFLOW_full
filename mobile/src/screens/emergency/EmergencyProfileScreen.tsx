import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image, Platform, StatusBar, Modal, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme, SCREEN_PADDING } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';

const TAB_VISIBLE_HEIGHT = 56;

const EmergencyProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user: contextUser, signOut } = useAuth();
  const [user, setUser] = useState<any>(contextUser);
  const [refreshing, setRefreshing] = useState(false);
  const { themeMode, setThemeMode, isDark, colors } = useAppTheme();
  const currentTheme = themeMode === 'dark' ? 'dark' : 'light';
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      if (profile) setUser(profile);
    } catch { /* */ }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      t('citizen.profile.logout', 'Đăng xuất'),
      t('citizen.profile.logoutConfirm', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống làm việc?'),
      [
        { text: t('common.cancel', 'Hủy'), style: 'cancel' },
        {
          text: t('citizen.profile.logout', 'Đăng xuất'), style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const handleThemePress = () => {
    setShowThemeModal(true);
  };

  const getLanguageLabel = () => {
    const code = i18n.language || 'vi';
    if (code.startsWith('vi')) return 'Tiếng Việt';
    if (code.startsWith('en')) return 'English';
    return 'Tiếng Việt';
  };

  const currentUser = user || contextUser;
  const fullName = currentUser?.ho_ten || currentUser?.name || 'Đội viên Cứu hộ';
  const roleName = currentUser?.roles?.includes('rescue_team') ? 'Thành viên Đội cứu hộ' : 'Chuyên viên Điều phối';
  const initials = fullName
    ? fullName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'R';

  const PERFORMANCE_GROUP = [
    { 
      id: 'dutyStatus', 
      icon: isOnDuty ? 'shield-check' : 'shield-off-outline', 
      label: 'Trạng thái hoạt động', 
      value: isOnDuty ? 'Sẵn sàng' : 'Ngoại tuyến',
      valueColor: isOnDuty ? colors.success : colors.textSecondary,
      onPress: () => setIsOnDuty(!isOnDuty) 
    },
    { 
      id: 'missionsCompleted', 
      icon: 'lifebuoy', 
      label: 'Nhiệm vụ hoàn thành', 
      value: '15 nhiệm vụ',
      onPress: () => Alert.alert('Thông tin', 'Tính năng đang phát triển.')
    },
    { 
      id: 'distanceTraveled', 
      icon: 'map-marker-distance', 
      label: 'Quãng đường di chuyển', 
      value: '45km',
      onPress: () => Alert.alert('Thông tin', 'Tính năng đang phát triển.')
    },
    { 
      id: 'currentRank', 
      icon: 'medal', 
      label: 'Cấp bậc cứu hộ', 
      value: 'Cơ động Tinh nhuệ (Cấp 4)',
      onPress: () => Alert.alert('Hạng hiện tại', 'Cơ động Tinh nhuệ (Cấp 4) - Đã tích lũy 1,950 XP!')
    },
  ];

  const ACCOUNT_GROUP = [
    { 
      id: 'manageProfile', 
      icon: 'account-outline', 
      label: t('citizen.profile.manageProfile', 'Thông tin cá nhân'), 
      onPress: () => navigation.navigate('UserProfile', { userId: currentUser?.id }) 
    },
    { 
      id: 'security', 
      icon: 'lock-outline', 
      label: t('citizen.profile.changePassword', 'Mật khẩu & Bảo mật'), 
      onPress: () => navigation.navigate('ChangePasswordLoggedIn') 
    },
    { 
      id: 'notificationSettings', 
      icon: 'bell-outline', 
      label: t('citizen.profile.notificationSettings', 'Cài đặt thông báo'), 
      onPress: () => navigation.navigate('NotificationSettings') 
    },
    { 
      id: 'language', 
      icon: 'translate', 
      label: t('language.title', 'Ngôn ngữ'), 
      value: getLanguageLabel(),
      onPress: () => navigation.navigate('LanguageSettings') 
    },
  ];

  const PREFERENCES_GROUP = [
    { 
      id: 'theme', 
      icon: 'palette-outline', 
      label: t('citizen.profile.theme', 'Giao diện'), 
      value: currentTheme === 'light' ? t('theme.light', 'Sáng') : t('theme.dark', 'Tối'),
      onPress: handleThemePress 
    },
  ];

  const SUPPORT_GROUP = [
    { 
      id: 'history', 
      icon: 'history', 
      label: 'Lịch sử cứu hộ', 
      onPress: () => navigation.navigate('Incidents') 
    },
    { 
      id: 'reports', 
      icon: 'file-document-edit-outline', 
      label: 'Báo cáo giao ban', 
      onPress: () => navigation.navigate('MyReports') 
    },
    { 
      id: 'helpCenter', 
      icon: 'help-circle-outline', 
      label: t('citizen.profile.helpCenter', 'Trung tâm trợ giúp'), 
      onPress: () => navigation.navigate('HelpCenter') 
    },
  ];

  const renderGroup = (title: string, items: any[]) => (
    <View style={styles.groupContainer}>
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.menuItemLeft}>
                <Icon name={item.icon} size={22} color={colors.text} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.value && <Text style={[styles.menuValue, { color: item.valueColor || colors.textSecondary }]}>{item.value}</Text>}
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <Icon name="chevron-right" size={20} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const insets = useSafeAreaInsets();
  const scrollBottomPad = TAB_VISIBLE_HEIGHT + (Platform.OS === 'ios' ? Math.max(insets.bottom, 34) : Math.max(insets.bottom, 8)) + 24;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.systemGroupedBackground : '#F2F2F7' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <View style={[styles.header, {
        backgroundColor: isDark ? colors.systemGroupedBackground : '#F2F2F7',
        paddingTop: insets.top,
        height: 52 + insets.top,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
      }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Hồ sơ Cứu hộ</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          {currentUser?.avatar ? (
            <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>{fullName}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{roleName}</Text>
            <Text style={[styles.userEmail, { color: colors.textTertiary }]}>{currentUser?.email || ''}</Text>
          </View>
        </View>

        {renderGroup('Hiệu suất & Hoạt động', PERFORMANCE_GROUP)}
        {renderGroup(t('citizen.profile.groupAccount', 'Tài khoản'), ACCOUNT_GROUP)}
        {renderGroup(t('citizen.profile.groupPreferences', 'Tiện ích & Giao diện'), PREFERENCES_GROUP)}
        {renderGroup(t('citizen.profile.groupSupport', 'Hỗ trợ & Lịch sử'), SUPPORT_GROUP)}

        <TouchableOpacity
          style={[styles.logoutCard, { backgroundColor: colors.card }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={22} color={colors.error} />
          <Text style={[styles.logoutLabel, { color: colors.error }]}>{t('citizen.profile.logout', 'Đăng xuất')}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textTertiary }]}>AegisFlow AI v2.4.0 (Enterprise)</Text>
      </ScrollView>

      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalContentCard, { backgroundColor: colors.card }]}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <Icon name="palette-outline" size={28} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('citizen.profile.theme', 'Giao diện')}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{t('citizen.profile.selectTheme', 'Chọn chế độ hiển thị')}</Text>
            </View>

            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[styles.modalOptionButton, currentTheme === 'light' && styles.modalOptionActive]}
                activeOpacity={0.7}
                onPress={() => { setThemeMode('light'); setShowThemeModal(false); }}
              >
                <View style={styles.modalOptionLeft}>
                  <Icon name="weather-sunny" size={22} color={currentTheme === 'light' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modalOptionText, currentTheme === 'light' && styles.modalOptionTextActive]}>
                    {t('theme.light', 'Giao diện sáng')}
                  </Text>
                </View>
                {currentTheme === 'light' && <Icon name="check-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOptionButton, currentTheme === 'dark' && styles.modalOptionActive]}
                activeOpacity={0.7}
                onPress={() => { setThemeMode('dark'); setShowThemeModal(false); }}
              >
                <View style={styles.modalOptionLeft}>
                  <Icon name="weather-night" size={22} color={currentTheme === 'dark' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modalOptionText, currentTheme === 'dark' && styles.modalOptionTextActive]}>
                    {t('theme.dark', 'Giao diện tối')}
                  </Text>
                </View>
                {currentTheme === 'dark' && <Icon name="check-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              activeOpacity={0.7}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel', 'Hủy')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', 
  },
  header: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingTop: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...theme.shadows.xs,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  profileDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  groupCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuValue: {
    fontSize: 15,
  },
  menuBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    gap: 12,
    marginBottom: 16,
    ...theme.shadows.xs,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 8,
    marginBottom: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 320,
    padding: 20,
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOptions: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  modalOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  modalOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  modalOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

export default EmergencyProfileScreen;
