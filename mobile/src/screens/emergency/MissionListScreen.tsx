import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, RefreshControl, ActivityIndicator,
    Alert, Animated, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING } from '../../theme';
import { rescueService, RescueRequest } from '../../services/rescueService';

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending:     { label: 'Chờ xử lý',     color: '#EF4444', bg: '#FEF2F2', icon: 'clock-alert-outline' },
    assigned:    { label: 'Đã phân công',   color: '#F59E0B', bg: '#FFFBEB', icon: 'account-check-outline' },
    in_progress: { label: 'Đang thực hiện', color: '#2563EB', bg: '#EFF6FF', icon: 'run-fast' },
    completed:   { label: 'Hoàn thành',     color: '#10B981', bg: '#ECFDF5', icon: 'check-circle-outline' },
    cancelled:   { label: 'Đã hủy',         color: '#9CA3AF', bg: '#F9FAFB', icon: 'close-circle-outline' },
};

const URGENCY_CFG: Record<string, { color: string }> = {
    critical: { color: '#EF4444' },
    high:     { color: '#F97316' },
    medium:   { color: '#F59E0B' },
    low:      { color: '#10B981' },
};

const CAT_ICON: Record<string, string> = {
    medical:    'medical-bag',
    food:       'food-apple-outline',
    water:      'water-outline',
    rescue:     'lifebuoy',
    evacuation: 'run-fast',
    shelter:    'home-heart-outline',
    other:      'help-circle-outline',
};

const TABS = [
    { key: 'all',         label: 'Tất cả',    icon: 'apps',                 color: '#6366F1' },
    { key: 'pending',     label: 'Chờ xử lý', icon: 'clock-alert-outline',  color: '#EF4444' },
    { key: 'in_progress', label: 'Đang làm',  icon: 'run-fast',             color: '#2563EB' },
    { key: 'completed',   label: 'Xong',      icon: 'check-circle-outline', color: '#10B981' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const MissionListScreen = () => {
    const navigation  = useNavigation();
    const [all, setAll]               = useState<RescueRequest[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab]   = useState('all');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const tabAnimMap = useRef<Record<string, Animated.Value>>({}).current;

    TABS.forEach(t => {
        if (!tabAnimMap[t.key]) tabAnimMap[t.key] = new Animated.Value(t.key === 'all' ? 1 : 0);
    });

    // ─── Derived ──────────────────────────────────────────────────────────────
    const filtered = all
        .filter(r => activeTab === 'all' || r.status === activeTab)
        .sort((a, b) => {
            const sp: Record<string, number> = { pending: 0, assigned: 1, in_progress: 2, completed: 3, cancelled: 4 };
            const up: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
            const ds = (sp[a.status] ?? 5) - (sp[b.status] ?? 5);
            if (ds !== 0) return ds;
            const du = (up[a.priority || a.urgency || ''] ?? 4) - (up[b.priority || b.urgency || ''] ?? 4);
            if (du !== 0) return du;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    const countOf = (k: string) => k === 'all' ? all.length : all.filter(r => r.status === k).length;

    // ─── Fetch ─────────────────────────────────────────────────────────────────
    const fetchMissions = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const data = await rescueService.getRequests();
            setAll(data || []);
        } catch {
            console.error('Fetch missions failed');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchMissions(); }, [fetchMissions]);

    // ─── Tab switch ────────────────────────────────────────────────────────────
    const switchTab = (key: string) => {
        TABS.forEach(t => {
            Animated.spring(tabAnimMap[t.key], {
                toValue: t.key === key ? 1 : 0,
                useNativeDriver: true,
                speed: 24,
                bounciness: 0,
            }).start();
        });
        setActiveTab(key);
    };

    // ─── Quick action ──────────────────────────────────────────────────────────
    const quickAction = (item: RescueRequest, status: string, msg: string) => {
        Alert.alert('Xác nhận', msg, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đồng ý',
                onPress: async () => {
                    try {
                        setUpdatingId(item.id);
                        await rescueService.updateStatus(item.id, status);
                        await fetchMissions();
                    } catch {
                        Alert.alert('Lỗi', 'Cập nhật thất bại');
                    } finally {
                        setUpdatingId(null);
                    }
                },
            },
        ]);
    };

    // ─── Card renderer ─────────────────────────────────────────────────────────
    const renderCard = ({ item, index }: { item: RescueRequest; index: number }) => {
        const sCfg        = STATUS_CFG[item.status]                   || STATUS_CFG.pending;
        const urgency     = item.priority || item.urgency             || 'medium';
        const uCfg        = URGENCY_CFG[urgency]                      || URGENCY_CFG.medium;
        const catIcon     = CAT_ICON[item.category]                   || CAT_ICON.other;
        const isUpdating  = updatingId === item.id;
        const isPending   = item.status === 'pending' || item.status === 'assigned';
        const isRunning   = item.status === 'in_progress';
        const isDone      = item.status === 'completed' || item.status === 'cancelled';

        const location = item.address
            || (item.latitude && item.longitude
                ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                : 'Chưa có địa chỉ');

        return (
            <TouchableOpacity
                style={[styles.card, isDone && styles.cardDim]}
                onPress={() => (navigation as any).navigate('RescueRequestDetail', { id: item.id })}
                activeOpacity={0.82}
            >
                {/* Solid urgency stripe */}
                <View style={[styles.stripe, { backgroundColor: uCfg.color }]} />

                <View style={styles.cardBody}>
                    {/* ─ Row 1: status badge + time ─ */}
                    <View style={styles.row1}>
                        <View style={[styles.statusChip, { backgroundColor: sCfg.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: sCfg.color }]} />
                            <Text style={[styles.statusLabel, { color: sCfg.color }]}>{sCfg.label}</Text>
                        </View>
                        <Text style={styles.timeText}>
                            {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    {/* ─ Row 2: avatar icon + name + description ─ */}
                    <View style={styles.row2}>
                        <View style={[styles.catAvatar, { backgroundColor: uCfg.color + '15' }]}>
                            <Icon name={catIcon} size={20} color={uCfg.color} />
                        </View>
                        <View style={styles.nameBlock}>
                            <Text style={styles.callerName} numberOfLines={1}>
                                {item.caller_name || 'Yêu cầu cứu hộ'}
                            </Text>
                            {item.description ? (
                                <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                            ) : null}
                        </View>
                    </View>

                    {/* ─ Row 3: people ─ */}
                    {item.people_count > 0 && (
                        <View style={styles.row3}>
                            <Icon name="account-group-outline" size={14} color="#64748B" />
                            <Text style={styles.peopleText}>
                                {item.people_count} người cần hỗ trợ
                                {item.vulnerable_groups?.length > 0
                                    ? ` · ${item.vulnerable_groups.join(', ')}`
                                    : ''}
                            </Text>
                        </View>
                    )}

                    {/* ─ Divider ─ */}
                    <View style={styles.divider} />

                    {/* ─ Row 4: location + urgency ─ */}
                    <View style={styles.row4}>
                        <Icon name="map-marker-outline" size={14} color="#94A3B8" />
                        <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                        <View style={[styles.urgencyBadge, { backgroundColor: uCfg.color }]}>
                            <Text style={styles.urgencyText}>{urgency.toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* ─ Row 5: action buttons ─ */}
                    {!isDone && (
                        <View style={styles.actionRow}>
                            {isPending && (
                                <TouchableOpacity
                                    style={[styles.btnAction, { backgroundColor: '#2563EB' }]}
                                    onPress={() => quickAction(item, 'in_progress', 'Nhận và bắt đầu xử lý yêu cầu này?')}
                                    disabled={isUpdating}
                                >
                                    {isUpdating
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : (<>
                                            <Icon name="hand-wave-outline" size={16} color="#fff" />
                                            <Text style={styles.btnActionTextPrimary}>Nhận nhiệm vụ</Text>
                                        </>)}
                                </TouchableOpacity>
                            )}

                            {isRunning && (
                                <TouchableOpacity
                                    style={[styles.btnAction, styles.btnNav]}
                                    onPress={() => (navigation as any).navigate('RescueRequestDetail', { id: item.id })}
                                >
                                    <Icon name="navigation-variant-outline" size={16} color="#2563EB" />
                                    <Text style={styles.btnNavText}>Chỉ đường</Text>
                                </TouchableOpacity>
                            )}

                            {isRunning && (
                                <TouchableOpacity
                                    style={[styles.btnAction, styles.btnComplete]}
                                    onPress={() => quickAction(item, 'completed', 'Xác nhận hoàn thành nhiệm vụ?')}
                                    disabled={isUpdating}
                                >
                                    {isUpdating
                                        ? <ActivityIndicator size="small" color="#10B981" />
                                        : (<>
                                            <Icon name="check-circle-outline" size={16} color="#10B981" />
                                            <Text style={styles.btnCompleteText}>Hoàn thành</Text>
                                        </>)}
                                </TouchableOpacity>
                            )}

                            {isPending && (
                                <TouchableOpacity
                                    style={[styles.btnAction, styles.btnReject]}
                                    onPress={() => quickAction(item, 'cancelled', 'Từ chối yêu cầu này?')}
                                    disabled={isUpdating}
                                >
                                    <Icon name="close-circle-outline" size={16} color="#94A3B8" />
                                    <Text style={styles.btnRejectText}>Từ chối</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Done state */}
                    {isDone && (
                        <View style={styles.doneRow}>
                            <Icon
                                name={item.status === 'completed' ? 'check-circle' : 'close-circle'}
                                size={16}
                                color={sCfg.color}
                            />
                            <Text style={[styles.doneText, { color: sCfg.color }]}>
                                {item.status === 'completed' ? 'Đã hoàn thành nhiệm vụ' : 'Đã từ chối'}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.container}>
                <PageHeader title="Nhiệm vụ cứu hộ" subtitle="Đang tải..." variant="default" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Đang tải danh sách...</Text>
                </View>
            </View>
        );
    }

    // ─── Main ─────────────────────────────────────────────────────────────────
    const pendingCount = countOf('pending');

    return (
        <View style={styles.container}>
            <PageHeader
                title="Nhiệm vụ cứu hộ"
                subtitle={`${all.length} yêu cầu cứu trợ`}
                variant="default"
            />

            {/* ── Summary banner (nếu có yêu cầu chờ) ── */}
            {pendingCount > 0 && (
                <View style={[styles.summaryBanner, { backgroundColor: '#EF4444' }]}>
                    <View style={styles.summaryIconWrap}>
                        <Icon name="bell-alert" size={20} color="#fff" />
                    </View>
                    <Text style={styles.summaryText}>
                        {pendingCount} yêu cầu đang chờ xử lý
                    </Text>
                    <TouchableOpacity
                        style={styles.summaryAction}
                        onPress={() => switchTab('pending')}
                    >
                        <Text style={styles.summaryActionText}>Xem ngay</Text>
                        <Icon name="chevron-right" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Pill tab bar (Scrollable to prevent overflow) ── */}
            <View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabRow}
                >
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.key;
                        const count    = countOf(tab.key);
                        const scale    = tabAnimMap[tab.key].interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

                        return (
                            <Animated.View key={tab.key} style={{ transform: [{ scale }] }}>
                                <TouchableOpacity
                                    onPress={() => switchTab(tab.key)}
                                    activeOpacity={0.75}
                                >
                                    {isActive ? (
                                        <View style={[styles.tabPillActive, { backgroundColor: tab.color }]}>
                                            <Icon name={tab.icon} size={14} color="#fff" />
                                            <Text style={styles.tabPillActiveText}>{tab.label}</Text>
                                            {count > 0 && (
                                                <View style={styles.tabBadgeActive}>
                                                    <Text style={styles.tabBadgeActiveText}>{count}</Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={styles.tabPill}>
                                            <Icon name={tab.icon} size={14} color="#94A3B8" />
                                            <Text style={styles.tabPillText}>{tab.label}</Text>
                                            {count > 0 && (
                                                <View style={styles.tabBadge}>
                                                    <Text style={styles.tabBadgeText}>{count}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── List ── */}
            <FlatList
                data={filtered}
                renderItem={renderCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchMissions(true)}
                        tintColor="#2563EB"
                        colors={['#2563EB']}
                    />
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={[styles.emptyIcon, { backgroundColor: TABS.find(t => t.key === activeTab)?.color + '15' }]}>
                            <Icon
                                name={TABS.find(t => t.key === activeTab)?.icon || 'apps'}
                                size={44}
                                color={TABS.find(t => t.key === activeTab)?.color || '#6366F1'}
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'all' ? 'Sẵn sàng ứng phó' :
                             activeTab === 'pending' ? 'Không có yêu cầu chờ' :
                             activeTab === 'in_progress' ? 'Không có nhiệm vụ đang làm' :
                             'Chưa có nhiệm vụ hoàn thành'}
                        </Text>
                        <Text style={styles.emptyText}>Hiện không có nhiệm vụ nào trong mục này</Text>
                    </View>
                }
            />
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
    loadingText: { fontSize: FONT_SIZE.sm, color: '#94A3B8', fontWeight: '500' },

    // ── Summary banner ────────────────────────────────────────────────────────
    summaryBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SCREEN_PADDING.horizontal,
        marginTop: SPACING.md,
        marginBottom: 0,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    summaryIconWrap: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#ffffff25',
        justifyContent: 'center', alignItems: 'center',
    },
    summaryText: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '700' },
    summaryAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    summaryActionText: { fontSize: 13, color: '#fff', fontWeight: '700', opacity: 0.9 },

    // ── Tab pills ─────────────────────────────────────────────────────────────
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.md,
    },
    tabPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    tabPillText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    tabBadge: {
        backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: BORDER_RADIUS.full, minWidth: 20, alignItems: 'center',
    },
    tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748B' },

    tabPillActive: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: BORDER_RADIUS.full,
    },
    tabPillActiveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    tabBadgeActive: {
        backgroundColor: '#ffffff35', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: BORDER_RADIUS.full, minWidth: 20, alignItems: 'center',
    },
    tabBadgeActiveText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    // ── List ─────────────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: 0,
        paddingBottom: 48,
        gap: 12,
    },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardDim: { opacity: 0.65 },

    stripe: { width: 5 },

    cardBody: { flex: 1, padding: 16 },

    // Row 1: status + time
    row1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

    // Row 2: avatar + name + desc
    row2: { flexDirection: 'row', gap: 14, marginBottom: 10, alignItems: 'flex-start' },
    catAvatar: {
        width: 44, height: 44, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    nameBlock: { flex: 1 },
    callerName: {
        fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2, lineHeight: 22,
    },
    descText: {
        fontSize: 13, color: '#64748B', lineHeight: 20, marginTop: 4,
    },

    // Row 3: people
    row3: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    peopleText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

    // Divider
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },

    // Row 4: location + urgency
    row4: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    locationText: { fontSize: 13, color: '#64748B', flex: 1, fontWeight: '500' },
    urgencyBadge: {
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    urgencyText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

    // Action row
    actionRow: { flexDirection: 'row', gap: 10 },

    btnAction: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12, borderRadius: 12,
    },
    btnActionTextPrimary: { fontSize: 14, fontWeight: '700', color: '#fff' },

    btnNav: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
    btnNavText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },

    btnComplete: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
    btnCompleteText: { fontSize: 14, fontWeight: '700', color: '#10B981' },

    btnReject: {
        paddingHorizontal: 16, backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#E2E8F0', flex: 0,
    },
    btnRejectText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

    // Done state
    doneRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8, paddingHorizontal: 12,
        backgroundColor: '#F8FAFC', borderRadius: 10,
    },
    doneText: { fontSize: 13, fontWeight: '600' },

    // Empty state
    empty: { alignItems: 'center', paddingVertical: 80 },
    emptyIcon: {
        width: 100, height: 100, borderRadius: 50,
        justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: 18, fontWeight: '800', color: '#1E293B',
        marginBottom: 8, textAlign: 'center',
    },
    emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});

export default MissionListScreen;
