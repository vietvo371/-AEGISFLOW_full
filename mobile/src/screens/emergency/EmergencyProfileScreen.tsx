import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { FONT_SIZE, SPACING, wp, BORDER_RADIUS, SCREEN_PADDING, theme } from '../../theme';
import { AlertService } from '../../services/AlertService';
import { useNavigation } from '@react-navigation/native';

const EmergencyProfileScreen = () => {
    const { user, signOut } = useAuth();
    const [isOnDuty, setIsOnDuty] = useState(true);
    const navigation = useNavigation();

    const toggleDuty = () => setIsOnDuty(previousState => !previousState);

    const currentUser: any = user;

    const operatorStats = [
        { id: 1, label: 'Đang xử lý', value: '12', icon: 'clock-outline', color: '#F59E0B' },
        { id: 2, label: 'Hoàn thành ca', value: '8', icon: 'check-circle-outline', color: '#10B981' },
        { id: 3, label: 'Tốc độ phản hồi', value: '2.5m', icon: 'lightning-bolt-outline', color: '#3B82F6' },
        { id: 4, label: 'Độ tin cậy', value: '98%', icon: 'shield-check-outline', color: '#7a5af8' },
    ];

    const handleLogout = () => {
        AlertService.confirm(
            'Xác nhận đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống làm việc không? Mọi ca trực chưa đóng sẽ bị tạm dừng.',
            () => signOut(),
            () => console.log('Hủy đăng xuất')
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Design Hero Area */}
            <View style={styles.heroBackground}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.heroHeader}>
                        <View>
                            <Text style={styles.heroTitle}>Hồ sơ Tác nhân</Text>
                            <Text style={styles.heroSubtitle}>Trung tâm Điều phối Đô thị</Text>
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
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{currentUser?.ho_ten?.charAt(0) || 'E'}</Text>
                            </View>
                        )}
                        <View style={[styles.statusDot, { backgroundColor: isOnDuty ? '#10B981' : '#6B7280' }]} />
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName}>{currentUser?.ho_ten || 'Tác nhân Hệ thống'}</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Hạng S</Text>
                            </View>
                        </View>
                        <Text style={styles.userRole}>Chuyên viên Điều phối</Text>
                        <Text style={styles.userEmail}>{currentUser?.email}</Text>
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
                    <Text style={styles.sectionTitle}>Chỉ số hiệu suất</Text>
                    <TouchableOpacity>
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

                {/* Action Menu */}
                <Text style={styles.sectionTitle}>Quản lý Nghiệp vụ</Text>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#3B82F615' }]}>
                                <Icon name="history" size={20} color="#3B82F6" />
                            </View>
                            <Text style={styles.menuText}>Lịch sử điều phối</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#F59E0B15' }]}>
                                <Icon name="file-document-edit-outline" size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.menuText}>Báo cáo giao ban</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
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
        color: '#94a3b8',
        marginTop: 2,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
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
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#f1f5f9',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    statusDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
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
        marginBottom: 2,
    },
    userName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    badge: {
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#D97706',
    },
    userRole: {
        fontSize: FONT_SIZE.sm,
        color: '#64748b',
        fontWeight: '600',
    },
    userEmail: {
        fontSize: FONT_SIZE.xs,
        color: '#94a3b8',
        marginTop: 2,
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
        fontSize: FONT_SIZE.md,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cardDesc: {
        fontSize: FONT_SIZE.xs,
        color: '#64748b',
        marginTop: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.sm,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: 'bold',
        color: '#475569',
        letterSpacing: 0.5,
    },
    seeDetail: {
        fontSize: FONT_SIZE.xs,
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
        fontSize: FONT_SIZE.xl,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: FONT_SIZE.xs,
        color: '#64748b',
        marginTop: 2,
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
        fontSize: FONT_SIZE.md,
        color: '#334155',
        fontWeight: '600',
    },
    logoutBtnFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF444410',
        paddingVertical: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#EF444425',
        gap: 10,
    },
    logoutText: {
        fontSize: FONT_SIZE.md,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    versionText: {
        textAlign: 'center',
        fontSize: FONT_SIZE.xs,
        color: '#94a3b8',
        marginTop: 24,
    }
});

export default EmergencyProfileScreen;
