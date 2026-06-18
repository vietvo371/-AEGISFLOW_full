import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme, FONT_SIZE, SPACING, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { useNotifications } from '../../hooks/useNotifications';

const ProfileScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user: contextUser, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [user, setUser] = useState<any>(contextUser);
  const [refreshing, setRefreshing] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [profile, reportsRes] = await Promise.allSettled([
        authService.getProfile(),
        reportService.getMyReports({ per_page: 1 }),
      ]);
      if (profile.status === 'fulfilled') setUser(profile.value);
      if (reportsRes.status === 'fulfilled') {
        const meta = (reportsRes.value as any)?.data;
        setReportCount(meta?.total || 0);
      }
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
      t('citizen.profile.logoutConfirm', 'Bạn có chắc chắn muốn đăng xuất?'),
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

  const currentUser = user || contextUser;
  const fullName = currentUser?.ho_ten || currentUser?.name || '';
  const initials = fullName
    ? fullName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : '?';

  const MENU_GROUP_1 = [
    { id: 'myReports', icon: 'file-document-multiple-outline', label: t('citizen.profile.myReports', 'Phản ánh của tôi'), screen: 'MyReports', badge: reportCount > 0 ? reportCount : undefined },
    { id: 'myRescue', icon: 'lifebuoy', label: t('citizen.profile.myRescue', 'Yêu cầu cứu hộ'), screen: 'MyRescueRequests' },
    { id: 'notifications', icon: 'bell-outline', label: t('citizen.profile.notifications', 'Thông báo'), screen: 'Notifications', badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  const MENU_GROUP_2 = [
    { id: 'notificationSettings', icon: 'bell-cog-outline', label: t('citizen.profile.notificationSettings', 'Cài đặt thông báo'), screen: 'NotificationSettings' },
    { id: 'security', icon: 'lock-outline', label: t('citizen.profile.changePassword', 'Đổi mật khẩu'), screen: 'ChangePasswordLoggedIn' },
    { id: 'about', icon: 'information-outline', label: t('citizen.profile.about', 'Giới thiệu'), screen: 'About' },
  ];

  const renderMenuItem = (item: any, isLast: boolean) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.6}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconWrap, { backgroundColor: theme.colors.primary + '12' }]}>
          <Icon name={item.icon} size={ICON_SIZE.sm} color={theme.colors.primary} />
        </View>
        <Text style={styles.menuLabel}>{item.label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {item.badge && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{item.badge}</Text>
          </View>
        )}
        <Icon name="chevron-right" size={ICON_SIZE.sm} color={theme.colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{fullName || t('common.user', 'Người dùng')}</Text>
          <Text style={styles.userEmail}>{currentUser?.email || ''}</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('UserProfile', { userId: currentUser?.id })}
          >
            <Icon name="pencil-outline" size={ICON_SIZE.xs} color={theme.colors.text} />
            <Text style={styles.editBtnText}>{t('citizen.profile.editProfile', 'Chỉnh sửa')}</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Group 1 */}
        <View style={styles.menuCard}>
          {MENU_GROUP_1.map((item, i) => renderMenuItem(item, i === MENU_GROUP_1.length - 1))}
        </View>

        {/* Menu Group 2 */}
        <View style={styles.menuCard}>
          {MENU_GROUP_2.map((item, i) => renderMenuItem(item, i === MENU_GROUP_2.length - 1))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Icon name="logout" size={ICON_SIZE.sm} color={theme.colors.error} />
          <Text style={styles.logoutText}>{t('citizen.profile.logout', 'Đăng xuất')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AegisFlow AI v1.0.0</Text>
        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  scroll: { padding: SCREEN_PADDING.horizontal },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: '700',
    color: theme.colors.textWhite,
  },
  userName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    marginTop: SPACING.xs,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  editBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },

  // Menu
  menuCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  menuBadgeText: {
    fontSize: FONT_SIZE['2xs'],
    fontWeight: '700',
    color: theme.colors.textWhite,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    backgroundColor: theme.colors.errorLight,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.sm,
  },
  logoutText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: theme.colors.error,
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textTertiary,
    marginTop: SPACING.lg,
  },
});

export default ProfileScreen;
