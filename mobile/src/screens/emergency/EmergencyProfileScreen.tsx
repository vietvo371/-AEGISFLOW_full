import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { FONT_SIZE, SPACING, wp, BORDER_RADIUS, SCREEN_PADDING, theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';

const EmergencyProfileScreen = () => {
    const { user, signOut } = useAuth();
    const [isOnDuty, setIsOnDuty] = useState(true);
    const navigation = useNavigation();

    const toggleDuty = () => setIsOnDuty(previousState => !previousState);

    const currentUser: any = user;
    const isRescue = currentUser?.roles?.includes('rescue_team');

    const profileTitle  = isRescue ? 'Hồ sơ Cứu hộ' : 'Hồ sơ Tác nhân';
    const profileSub    = isRescue ? 'Lực lượng Phản ứng nhanh' : 'Trung tâm Điều phối Đô thị';
    const defaultName   = isRescue ? 'Đội viên Cứu hộ' : 'Tác nhân Hệ thống';
    const roleName      = isRescue ? 'Thành viên Đội cứu hộ' : 'Chuyên viên Điều phối';
    const badgeName     = isRescue ? 'Cơ động' : 'Hạng S';
    const section1Title = isRescue ? 'Hiệu suất cứu hộ' : 'Chỉ số hiệu suất';
    const section2Title = isRescue ? 'Quản lý Cứu hộ' : 'Quản lý Nghiệp vụ';
    const historyText   = isRescue ? 'Lịch sử cứu hộ' : 'Lịch sử điều phối';

    const operatorStats = isRescue 
        ? [
            { id: 1, label: 'Đang xử lý', value: '2', icon: 'run-fast', color: '#3B82F6' },
            { id: 2, label: 'Đã cứu hộ', value: '15', icon: 'lifebuoy', color: '#10B981' },
            { id: 3, label: 'Quãng đường', value: '45km', icon: 'map-marker-distance', color: '#F59E0B' },
            { id: 4, label: 'Đánh giá', value: '4.9', icon: 'star', color: '#7a5af8' },
        ]
        : [
            { id: 1, label: 'Đang xử lý', value: '12', icon: 'clock-outline', color: '#F59E0B' },
            { id: 2, label: 'Hoàn thành ca', value: '8', icon: 'check-circle-outline', color: '#10B981' },
            { id: 3, label: 'Tốc độ phản hồi', value: '2.5m', icon: 'lightning-bolt-outline', color: '#3B82F6' },
            { id: 4, label: 'Độ tin cậy', value: '98%', icon: 'shield-check-outline', color: '#7a5af8' },
        ];

    const handleLogout = () => {
        Alert.alert(
            'Xác nhận đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống làm việc không? Mọi ca trực chưa đóng sẽ bị tạm dừng.',
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: () => signOut() },
            ]
        );
    };

    const handleShowRankDetails = () => {
        if (isRescue) {
            Alert.alert(
                'Hệ thống Cấp bậc & Tích điểm AegisFlow',
                `Quy chế tích điểm và thăng hạng dành cho Đội viên Cứu hộ:\n\n` +
                `• Nhận & hoàn thành nhiệm vụ: +100 XP\n` +
                `• Xử lý sự cố nghiêm trọng (Critical): +150 XP\n` +
                `• Mỗi km quãng đường di chuyển: +10 XP\n` +
                `• Đạt đánh giá phản hồi từ người dân 5★: +50 XP\n\n` +
                `Hạng hiện tại của bạn: Cơ động Tinh nhuệ (Cấp 4) - Đã hoàn thành 15 vụ cứu hộ, di chuyển 45km, tích lũy 1,950 XP!`,
                [{ text: 'Đóng', style: 'cancel' }]
            );
        } else {
            Alert.alert('Thông báo', 'Tính năng xem hiệu suất chi tiết đang được phát triển.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Design Hero Area */}
            <View style={[styles.heroBackground, isRescue && styles.heroBackgroundRescue]}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.heroHeader}>
                        <View>
                            <Text style={styles.heroTitle}>{profileTitle}</Text>
                            <Text style={styles.heroSubtitle}>{profileSub}</Text>
                        </View>
                        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                            <Icon name="bell-outline" size={22} color="white" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Card Refined */}
                <View style={styles.profileFloatCard}>
                    <View style={styles.avatarContainer}>
                        {currentUser?.anh_dai_dien ? (
                            <Image source={{ uri: currentUser.anh_dai_dien }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, isRescue && styles.avatarRescue]}>
                                <Text style={styles.avatarText}>{currentUser?.ho_ten?.charAt(0) || 'E'}</Text>
                            </View>
                        )}
                        <View style={[styles.statusDot, { backgroundColor: isOnDuty ? '#10B981' : '#6B7280' }]} />
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {currentUser?.ho_ten || defaultName}
                            </Text>
                            <View style={[styles.badge, isRescue && styles.badgeRescue]}>
                                <Text style={[styles.badgeText, isRescue && styles.badgeTextRescue]}>{badgeName}</Text>
                            </View>
                        </View>
                        <Text style={styles.userRole}>{roleName}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>{currentUser?.email}</Text>
                    </View>
                </View>

                {/* Duty Toggle Card */}
                <View style={[styles.card, styles.dutyCard]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: isOnDuty ? '#10B98115' : '#f1f5f9' }]}>
                            <Icon name={isOnDuty ? 'shield-check' : 'shield-off-outline'} size={24} color={isOnDuty ? '#10B981' : '#64748b'} />
                        </View>
                        <View style={styles.cardHeaderText}>
                            <Text style={styles.cardTitle}>Trạng thái hoạt động</Text>
                            <Text style={styles.cardDesc}>
                                {isOnDuty ? 'Đang trong ca trực • Sẵn sàng' : 'Ngoại tuyến • Đang nghỉ ca'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        trackColor={{ false: '#cbd5e1', true: '#10B98150' }}
                        thumbColor={isOnDuty ? '#10B981' : '#f4f3f4'}
                        onValueChange={toggleDuty}
                        value={isOnDuty}
                    />
                </View>

                {/* Stats Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section1Title}</Text>
                    <TouchableOpacity onPress={handleShowRankDetails}>
                        <Text style={styles.seeDetail}>Chi tiết</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                    {operatorStats.map((stat) => (
                        <View key={stat.id} style={styles.statCard}>
                            <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}15` }]}>
                                <Icon name={stat.icon} size={22} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Cấp độ & Điểm thưởng Cứu hộ (Gamification Card) */}
                {isRescue && (
                    <View style={styles.rewardCard}>
                        <View style={styles.rewardHeader}>
                            <View style={styles.rewardHeaderLeft}>
                                <View style={styles.rankBadge}>
                                    <Icon name="medal" size={24} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={styles.rankTitle}>Cấp độ Cứu hộ: Cấp 4</Text>
                                    <Text style={styles.rankSubtitle}>Đội viên Cơ động Tinh nhuệ</Text>
                                </View>
                            </View>
                            <Text style={styles.pointsText}>1,950 XP</Text>
                        </View>
                        
                        {/* Progress bar to Level 5 */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: '90%' }]} />
                            </View>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressLabelText}>450 / 500 XP để lên Cấp 5</Text>
                                <Text style={styles.progressPercentText}>90%</Text>
                            </View>
                        </View>

                        {/* Badges Row */}
                        <Text style={styles.badgesLabel}>Huy hiệu đã đạt:</Text>
                        <View style={styles.badgesContainer}>
                            <View style={styles.badgeItem}>
                                <View style={[styles.badgeIconBg, { backgroundColor: '#EFF6FF' }]}>
                                    <Icon name="shield-star" size={18} color="#2563EB" />
                                </View>
                                <Text style={styles.badgeItemText} numberOfLines={1}>Dũng sĩ lũ</Text>
                            </View>
                            <View style={styles.badgeItem}>
                                <View style={[styles.badgeIconBg, { backgroundColor: '#FEF3C7' }]}>
                                    <Icon name="lightning-bolt" size={18} color="#D97706" />
                                </View>
                                <Text style={styles.badgeItemText} numberOfLines={1}>Phản ứng nhanh</Text>
                            </View>
                            <View style={styles.badgeItem}>
                                <View style={[styles.badgeIconBg, { backgroundColor: '#ECFDF5' }]}>
                                    <Icon name="map-marker-path" size={18} color="#059669" />
                                </View>
                                <Text style={styles.badgeItemText} numberOfLines={1}>Băng vạn dặm</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Action Menu */}
                <Text style={styles.sectionTitle}>{section2Title}</Text>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => (navigation as any).navigate('Incidents')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#3B82F615' }]}>
                                <Icon name="history" size={20} color="#3B82F6" />
                            </View>
                            <Text style={styles.menuText}>{historyText}</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => (navigation as any).navigate('MyReports')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#F59E0B15' }]}>
                                <Icon name="file-document-edit-outline" size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.menuText}>Báo cáo giao ban</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => (navigation as any).navigate('UserProfile')}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#7a5af815' }]}>
                                <Icon name="shield-key-outline" size={20} color="#7a5af8" />
                            </View>
                            <Text style={styles.menuText}>Bảo mật & Tài khoản</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button at bottom */}
                <TouchableOpacity style={styles.logoutBtnFull} onPress={handleLogout}>
                    <Icon name="logout-variant" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>AegisFlow AI • Phiên bản 2.4.0 (Enterprise)</Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    heroBackground: {
        backgroundColor: '#1e293b', // Dark Slate 900
        paddingBottom: 60,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroBackgroundRescue: {
        backgroundColor: '#2563EB', // Blue 600 for rescue
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: SPACING.md,
    },
    heroTitle: {
        fontSize: FONT_SIZE['2xl'],
        fontWeight: 'bold',
        color: 'white',
    },
    heroSubtitle: {
        fontSize: FONT_SIZE.sm,
        color: '#e2e8f0', // Lighter text
        marginTop: 2,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginTop: -40,
    },
    scrollContent: {
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingBottom: 40,
    },
    profileFloatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: SPACING.xl,
        borderRadius: 24,
        ...theme.shadows.md,
        marginBottom: SPACING.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: SPACING.lg,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: '#f1f5f9',
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarRescue: {
        backgroundColor: '#3B82F6',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    statusDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: 'white',
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    userName: {
        flex: 1,
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    badge: {
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeRescue: {
        backgroundColor: '#EFF6FF',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#D97706',
    },
    badgeTextRescue: {
        color: '#2563EB',
    },
    userRole: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        ...theme.shadows.sm,
        marginBottom: SPACING.lg,
    },
    dutyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardHeader: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardHeaderText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cardDesc: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
        letterSpacing: 0.3,
    },
    seeDetail: {
        fontSize: 13,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    statIconWrap: {
        padding: 10,
        borderRadius: 14,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
        fontWeight: '500',
    },
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        ...theme.shadows.sm,
        marginBottom: SPACING.xl,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '600',
    },
    logoutBtnFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        paddingVertical: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        gap: 10,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#DC2626',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 24,
    },
    rewardCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: SPACING.lg,
        ...theme.shadows.sm,
    },
    rewardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    rewardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rankBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    rankTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    rankSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    pointsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D97706',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBackground: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#F59E0B',
        borderRadius: 4,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    progressLabelText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    progressPercentText: {
        fontSize: 11,
        color: '#D97706',
        fontWeight: '700',
    },
    badgesLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 10,
    },
    badgesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    badgeItem: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    badgeIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    badgeItemText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
        textAlign: 'center',
    }
});

export default EmergencyProfileScreen;
