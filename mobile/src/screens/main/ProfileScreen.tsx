import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, RefreshControl, ActivityIndicator, FlatList, Modal, Animated, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import {
  theme,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ICON_SIZE,
  SCREEN_PADDING,
  wp,
  hp,
} from '../../theme';
import ModalCustom from '../../component/ModalCustom';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { User } from '../../types/api/auth';
import { Report } from '../../types/api/report';
import ReportCard from '../../components/reports/ReportCard';
import { AlertService } from '../../services/AlertService';
import {
  getStatusText,
  getStatusColor,
  getReportTags,
  isReportUrgent
} from '../../utils/reportUtils';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user: contextUser, signOut } = useAuth();
  const [user, setUser] = useState<User | null>(contextUser);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [openMenuReportId, setOpenMenuReportId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Animation refs for menu modal
  const slideAnim = useRef(new Animated.Value(500)).current; // Start off-screen
  const backdropAnim = useRef(new Animated.Value(0)).current; // Start transparent

  const fetchProfile = useCallback(async () => {
    try {
      const profileData = await authService.getProfile();
      console.log('Profile data:', profileData);
      setUser(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyReports = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        isRefresh ? setRefreshing(true) : setReportsLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await reportService.getMyReports({
        page,
        per_page: 10,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      if (response.success && response.data) {
        const reportsData = (response.data as any).data || response.data;
        console.log('reportsData:', reportsData);

        if (page === 1) {
          setMyReports(Array.isArray(reportsData) ? reportsData : []);
        } else {
          setMyReports(prev => [...prev, ...(Array.isArray(reportsData) ? reportsData : [])]);
        }

        if (response.meta || (response.data as any).last_page) {
          const meta = response.meta || response.data;
          setCurrentPage((meta as any).current_page || page);
          setTotalPages((meta as any).last_page || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching my reports:', error);
      setInfoModalTitle('Lỗi');
      setInfoModalMessage('Không thể tải danh sách phản ánh của bạn');
      setShowInfoModal(true);
    } finally {
      setReportsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
      fetchMyReports(1);
    }, [])
  );

  const onRefresh = () => {
    fetchProfile();
    fetchMyReports(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchMyReports(currentPage + 1);
    }
  };

  const menuItems = [
    {
      title: 'Tài khoản',
      items: [
        { id: 'profile', icon: 'account-outline', label: 'Thông tin cá nhân' },
        { id: 'security', icon: 'shield-check-outline', label: 'Bảo mật & Đăng nhập' },
      ]
    },
    {
      title: 'Cài đặt & Hỗ trợ',
      items: [
        { id: 'notifications', icon: 'bell-outline', label: 'Thông báo' },
        { id: 'language', icon: 'translate', label: 'Ngôn ngữ' },
        { id: 'help', icon: 'help-circle-outline', label: 'Trung tâm trợ giúp' },
        { id: 'about', icon: 'information-outline', label: 'Về ứng dụng' },
      ]
    },
    {
      title: '',
      items: [
        { id: 'logout', icon: 'logout', label: 'Đăng xuất' },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      await signOut();
      setShowLogoutModal(false);

    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuPress = (itemId: string) => {
    handleCloseMenuModal();

    setTimeout(() => {
      switch (itemId) {
        case 'profile':
          (navigation as any).navigate('UserProfile', { userId: user?.id });
          break;
        case 'security':
          (navigation as any).navigate('ChangePasswordLoggedIn');
          break;
        case 'notifications':
          (navigation as any).navigate('NotificationSettings');
          break;
        case 'language':
          (navigation as any).navigate('LanguageSettings');
          break;
        case 'help':
          (navigation as any).navigate('HelpCenter');
          break;
        case 'about':
          (navigation as any).navigate('About');
          break;
        case 'logout':
          setShowLogoutModal(true);
          break;
        default:
          break;
      }
    }, 300);
  };

  const handleCloseMenuModal = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMenuModal(false);
    });
  };

  // Animate in when menu modal appears
  useEffect(() => {
    if (showMenuModal) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMenuModal]);

  const handleReportPress = (report: Report) => {
    (navigation as any).navigate('IncidentDetail', { id: report.id });
  };

  const handleEditReport = (report: Report) => {
    // Only allow editing if status is pending (0) or confirmed (1)
    if (report.trang_thai <= 1) {
      (navigation as any).navigate('EditReport', { id: report.id });
    } else {
      setInfoModalTitle('Không thể chỉnh sửa');
      setInfoModalMessage('Phản ánh này đang được xử lý hoặc đã hoàn thành nên không thể chỉnh sửa.');
      setShowInfoModal(true);
    }
  };

  const handleDeleteReport = (reportId: number) => {
    setSelectedReportId(reportId);
    setShowDeleteModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!selectedReportId) return;

    try {
      const response = await reportService.deleteReport(selectedReportId);
      if (response.success) {
        // Remove from list
        setMyReports(prev => prev.filter(r => r.id !== selectedReportId));
        // Update user stats
        if (user) {
          setUser({ ...user });
        }
        setShowDeleteModal(false);
        setSelectedReportId(null);

        // Show success message
        setInfoModalTitle('Thành công');
        setInfoModalMessage('Đã xóa phản ánh');
        setShowInfoModal(true);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      setShowDeleteModal(false);
      setSelectedReportId(null);

      setInfoModalTitle('Lỗi');
      setInfoModalMessage('Không thể xóa phản ánh. Vui lòng thử lại.');
      setShowInfoModal(true);
    }
  };

  const formatPoints = (points: number) => {
    return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={styles.reportCardWrapper}>
      <ReportCard
        report={item}
        onPress={() => handleReportPress(item)}
        renderAction={() => (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuIconButton}
              onPress={() => setOpenMenuReportId(openMenuReportId === item.id ? null : item.id)}
            >
              <Icon name="dots-vertical" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {openMenuReportId === item.id && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    setOpenMenuReportId(null);
                    handleEditReport(item);
                  }}
                >
                  <Icon name="pencil" size={20} color={theme.colors.primary} />
                  <Text style={styles.menuOptionText}>Sửa</Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    setOpenMenuReportId(null);
                    handleDeleteReport(item.id);
                  }}
                >
                  <Icon name="delete" size={20} color={theme.colors.error} />
                  <Text style={styles.menuOptionText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon name="notebook-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>Chưa có phản ánh nào</Text>
      <Text style={styles.emptyStateText}>
        Hãy tạo phản ánh đầu tiên của bạn để cải thiện thành phố
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => (navigation as any).navigate('CreateReport')}
      >
        <Icon name="plus-circle" size={20} color={theme.colors.white} />
        <Text style={styles.createButtonText}>Tạo phản ánh mới</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const ListHeaderComponent = () => (
    <>
      {/* Header Profile */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={styles.headerContainer}>
          {/* Colored Background */}
          <View style={styles.headerBackground}>
            {/* Settings Button */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowMenuModal(true)}
            >
              <Icon name="cog-outline" size={24} color={theme.colors.white} />
            </TouchableOpacity>

            <View style={styles.profileContent}>
              <View style={styles.avatarWrapper}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <Icon name="check-decagram" size={16} color={theme.colors.primary} />
                </View>
              </View>

              <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
              <Text style={styles.userRole}>Cư dân TP.HCM</Text>
            </View>
          </View>

          {/* Floating Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{myReports.length}</Text>
              <Text style={styles.statLabel}>Báo cáo</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {user?.roles?.join(', ') || 'citizen'}
              </Text>
              <Text style={styles.statLabel}>Vai trò</Text>
            </View>
          </View>
        </View>
      )}

      {/* My Reports Title */}
      <View style={styles.reportsHeader}>
        <Text style={styles.reportsTitle}>Phản ánh của tôi</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {reportsLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={myReports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onScroll={() => {
            if (openMenuReportId) {
              setOpenMenuReportId(null);
            }
          }}
          scrollEventThrottle={16}
        />
      )}

      {/* Menu Modal - Animated Bottom Sheet */}
      {showMenuModal && (
        <>
          {/* Backdrop */}
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim,
              }
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleCloseMenuModal}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.menuModalContent,
              {
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.menuModalHeader}>
              <Text style={styles.menuModalTitle}>Cài đặt</Text>
              <TouchableOpacity onPress={handleCloseMenuModal}>
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {menuItems.map((section, index) => (
                <View key={index} style={styles.menuSection}>
                  {section.title ? <Text style={styles.menuSectionTitle}>{section.title}</Text> : null}
                  <View style={styles.menuSectionContent}>
                    {section.items.map((item, idx) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.menuModalItem,
                          idx === section.items.length - 1 && styles.lastMenuItem
                        ]}
                        onPress={() => handleMenuPress(item.id)}
                      >
                        <View style={styles.menuIconBox}>
                          <Icon
                            name={item.icon}
                            size={ICON_SIZE.md}
                            color={item.id === 'logout' ? theme.colors.error : theme.colors.text}
                          />
                        </View>
                        <Text style={[
                          styles.menuLabel,
                          item.id === 'logout' && { color: theme.colors.error }
                        ]}>
                          {item.label}
                        </Text>
                        <Icon name="chevron-right" size={ICON_SIZE.md} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* Logout Confirmation Modal */}
      <ModalCustom
        isModalVisible={showLogoutModal}
        setIsModalVisible={setShowLogoutModal}
        title="Đăng xuất"
        onPressAction={handleLogout}
      >
        <Text style={styles.modalMessage}>
          Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?
        </Text>
      </ModalCustom>

      {/* Delete Confirmation Modal */}
      <ModalCustom
        isModalVisible={showDeleteModal}
        setIsModalVisible={setShowDeleteModal}
        title="Xóa phản ánh"
        onPressAction={confirmDeleteReport}
      >
        <Text style={styles.modalMessage}>
          Bạn có chắc chắn muốn xóa phản ánh này? Hành động này không thể hoàn tác.
        </Text>
      </ModalCustom>

      {/* Info Modal */}
      <ModalCustom
        isModalVisible={showInfoModal}
        setIsModalVisible={setShowInfoModal}
        title={infoModalTitle}
        onPressAction={() => setShowInfoModal(false)}
        actionText="Đóng"
        isClose={false}
      >
        <Text style={styles.modalMessage}>
          {infoModalMessage}
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
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: SPACING.lg,
  },
  headerBackground: {
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: SPACING['3xl'] + SPACING.lg, // Extra padding for floating card overlap
    paddingHorizontal: SCREEN_PADDING.horizontal,
    alignItems: 'center',
    borderBottomLeftRadius: BORDER_RADIUS['2xl'],
    borderBottomRightRadius: BORDER_RADIUS['2xl'],
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + SPACING.md : SPACING.xl,
    right: SCREEN_PADDING.horizontal,
    padding: SPACING.xs,
    zIndex: 10,
  },
  profileContent: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.sm,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: wp('12%'),
  },
  avatar: {
    width: wp('22%'),
    height: wp('22%'),
    borderRadius: wp('11%'),
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  avatarPlaceholder: {
    width: wp('22%'),
    height: wp('22%'),
    borderRadius: wp('11%'),
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  avatarText: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: '700',
    color: theme.colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userName: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: 4,
  },
  userRole: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SCREEN_PADDING.horizontal,
    marginTop: -SPACING['3xl'], // Negative margin to overlap
    ...theme.shadows.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: theme.colors.borderLight,
    alignSelf: 'center',
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.background,
    marginBottom: SPACING.xs,
  },
  reportsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  logoutText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.error,
  },
  reportCardWrapper: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    marginBottom: SPACING.sm,
  },
  menuContainer: {
    position: 'relative',
  },
  menuIconButton: {
    padding: SPACING.xs,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  menuOptionText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING['3xl'],
    minHeight: 300,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['3xl'],
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  menuModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    maxHeight: '80%',
    paddingBottom: SPACING.xl,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  menuModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SCREEN_PADDING.horizontal,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  menuModalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  menuSection: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    marginTop: SPACING.lg,
  },
  menuSectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuSectionContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  menuModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  modalMessage: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
    lineHeight: 22,
  },
});

export default ProfileScreen;


