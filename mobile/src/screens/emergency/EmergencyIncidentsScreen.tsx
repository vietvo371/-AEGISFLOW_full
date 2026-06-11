import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    StatusBar,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../../component/PageHeader';
import {
    theme,
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
    SCREEN_PADDING,
    ICON_SIZE,
} from '../../theme';
import NotificationBellButton from '../../component/NotificationBellButton';
import env from '../../config/env';
import { incidentService, Incident, IncidentFilterParams } from '../../services/incidentService';
import { useWebSocket } from '../../contexts/WebSocketContext';

import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
    open: { color: '#EF4444', icon: 'alert-circle' },
    reported: { color: '#EF4444', icon: 'alert-circle' },
    verified: { color: '#3B82F6', icon: 'check-circle' },
    responding: { color: '#F59E0B', icon: 'run' },
    investigating: { color: '#F59E0B', icon: 'magnify' },
    resolved: { color: '#10B981', icon: 'check-circle' },
    closed: { color: '#6B7280', icon: 'close-circle' },
};

const SEVERITY_CONFIG: Record<string, { color: string }> = {
    low: { color: '#10B981' },
    medium: { color: '#3B82F6' },
    high: { color: '#F59E0B' },
    critical: { color: '#EF4444' },
};

const TYPE_CONFIG: Record<string, { icon: string }> = {
    flood: { icon: 'home-flood' },
    heavy_rain: { icon: 'weather-pouring' },
    landslide: { icon: 'slope-downhill' },
    dam_failure: { icon: 'waves' },
    congestion: { icon: 'traffic-light' },
    accident: { icon: 'car-crash' },
    other: { icon: 'alert-circle-outline' },
};

const FILTER_TABS = [
    { key: 'all' },
    { key: 'open' },
    { key: 'investigating' },
    { key: 'resolved' },
];

const TYPE_FILTER_TABS = [
    { key: 'all', icon: 'view-grid-outline' },
    { key: 'flood', icon: 'home-flood' },
    { key: 'heavy_rain', icon: 'weather-pouring' },
    { key: 'landslide', icon: 'slope-downhill' },
    { key: 'dam_failure', icon: 'waves' },
    { key: 'congestion', icon: 'traffic-light' },
    { key: 'accident', icon: 'car-crash' },
];

const SEVERITY_ORDER: Record<string, number> = {
    critical: 0, high: 1, medium: 2, low: 3,
};

const EmergencyIncidentsScreen = () => {
    const navigation = useNavigation();
    const { listen } = useWebSocket();
    const { t, i18n } = useTranslation();
    const { isEmergency } = useAuth();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeTypeFilter, setActiveTypeFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Sort incidents: critical first, then by created_at
    const sortedIncidents = [...incidents].sort((a, b) => {
        const severityDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const openCount = incidents.filter(i => i.status === 'open').length;

    const fetchIncidents = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);

            const params: IncidentFilterParams = {
                per_page: 50,
                sort_by: 'created_at',
            };
            if (activeFilter !== 'all') params.status = activeFilter;
            if (activeTypeFilter !== 'all') params.type = activeTypeFilter;

            const response = await incidentService.getIncidents(params);
            if (response.success && response.data) {
                const data = (response.data as any).data || response.data;
                setIncidents(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching incidents:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter, activeTypeFilter]);

    // WebSocket: channel 'traffic' (xem routes/channels.php)
    useEffect(() => {
        listen('traffic', 'IncidentCreated', (data: any) => {
            const newIncident: Incident = data.incident || data;
            setIncidents(prev => {
                const exists = prev.some(i => i.id === newIncident.id);
                return exists ? prev : [newIncident, ...prev];
            });
        });
    }, [listen]);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    const handleUpdateStatus = async (incident: Incident, newStatus: 'investigating' | 'resolved') => {
        const statusLabel = t(`incidents.${newStatus}`);

        Alert.alert(
            t('incidents.updateStatus'),
            `${t('incidents.confirmUpdate')} "${incident.title}" -> "${statusLabel}"?`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            setUpdatingId(incident.id);
                            await incidentService.updateIncident(incident.id, { status: newStatus });
                            // Update local state
                            setIncidents(prev =>
                                prev.map(i =>
                                    i.id === incident.id ? { ...i, status: newStatus } : i
                                )
                            );
                        } catch (error) {
                            console.error('Error updating incident:', error);
                            Alert.alert(t('common.error'), t('incidents.updateFailed'));
                        } finally {
                            setUpdatingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleIncidentPress = useCallback((incident: Incident) => {
        (navigation as any).navigate('IncidentDetail', { id: incident.id, isRescue: isEmergency });
    }, [navigation, isEmergency]);

    const renderFilterTabs = () => (
        <View>
            {/* Status filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
                style={styles.filterContainer}
            >
                {FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.filterTab,
                            activeFilter === tab.key && styles.filterTabActive,
                        ]}
                        onPress={() => setActiveFilter(tab.key)}
                    >
                        {tab.key !== 'all' && (
                            <View
                                style={[
                                    styles.filterDot,
                                    { backgroundColor: STATUS_CONFIG[tab.key]?.color || theme.colors.primary },
                                    activeFilter === tab.key && styles.filterDotActive,
                                ]}
                            />
                        )}
                        <Text
                            style={[
                                styles.filterTabText,
                                activeFilter === tab.key && styles.filterTabTextActive,
                            ]}
                        >
                            {tab.key === 'all' ? t('common.all') : t(`incidents.${tab.key}`)}
                            {tab.key === 'open' && openCount > 0 ? ` (${openCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Type filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
                style={[styles.filterContainer, styles.typeFilterContainer]}
            >
                {TYPE_FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.filterTab,
                            styles.typeFilterTab,
                            activeTypeFilter === tab.key && styles.typeFilterTabActive,
                        ]}
                        onPress={() => setActiveTypeFilter(tab.key)}
                    >
                        <Icon
                            name={tab.icon}
                            size={13}
                            color={activeTypeFilter === tab.key ? '#fff' : theme.colors.textSecondary}
                        />
                        <Text
                            style={[
                                styles.filterTabText,
                                activeTypeFilter === tab.key && styles.typeFilterTabTextActive,
                            ]}
                        >
                            {tab.key === 'all' ? t('incidents.allTypes', 'All Types') : t(`incidents.type.${tab.key}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'flood':
                return { bg: '#E0F2FE', color: '#0284C7' };
            case 'heavy_rain':
                return { bg: '#DBEAFE', color: '#2563EB' };
            case 'landslide':
                return { bg: '#FEF3C7', color: '#D97706' };
            case 'dam_failure':
                return { bg: '#E0E7FF', color: '#4F46E5' };
            case 'congestion':
                return { bg: '#FEE2E2', color: '#EF4444' };
            case 'accident':
                return { bg: '#FFF7ED', color: '#EA580C' };
            default:
                return { bg: '#F1F5F9', color: '#64748B' };
        }
    };

    const renderIncidentCard = ({ item }: { item: Incident }) => {
        const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
        const severityConf = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
        const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
        const isUpdating = updatingId === item.id;
        const typeStyle = getTypeStyle(item.type);

        return (
            <TouchableOpacity
                style={[styles.card, !['resolved', 'closed'].includes(item.status) && styles.cardActive]}
                onPress={() => handleIncidentPress(item)}
                activeOpacity={0.7}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={[styles.typeIcon, { backgroundColor: typeStyle.bg }]}>
                            <Icon name={typeConf.icon} size={22} color={typeStyle.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <View style={styles.cardMetaRow}>
                                <Text style={styles.cardMetaId}>#{item.id}</Text>
                                <View style={styles.dot} />
                                <Text style={styles.cardMetaTime}>
                                    {new Date(item.created_at).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <View style={styles.dot} />
                                <Text style={styles.cardMetaLocation} numberOfLines={1}>{item.location_name || t('incidents.unknownLocation', 'Unknown location')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Badges */}
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: statusConf.color + '15' }]}>
                        <Icon name={statusConf.icon} size={14} color={statusConf.color} />
                        <Text style={[styles.badgeText, { color: statusConf.color }]}>
                            {t(`incidents.${item.status}`)}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: severityConf.color + '15' }]}>
                        <Text style={[styles.badgeText, { color: severityConf.color }]}>
                            {t(`incidents.severity.${item.severity}`)}
                        </Text>
                    </View>
                    {item.source === 'citizen' && (
                        <View style={[styles.badge, { backgroundColor: '#7a5af815' }]}>
                            <Icon name="account" size={14} color="#7a5af8" />
                            <Text style={[styles.badgeText, { color: '#7a5af8' }]}>{t('incidents.source.citizen')}</Text>
                        </View>
                    )}
                </View>

                {/* Description */}
                {item.description && (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                {/* Quick Actions */}
                {(item.status === 'open' || item.status === 'investigating') && (
                    <View style={styles.quickActions}>
                        {item.status === 'open' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionInvestigate]}
                                onPress={() => handleUpdateStatus(item, 'investigating')}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color="#F59E0B" />
                                ) : (
                                    <>
                                        <Icon name="magnify" size={16} color="#F59E0B" />
                                        <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
                                            {t('incidents.investigating')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionResolve]}
                            onPress={() => handleUpdateStatus(item, 'resolved')}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                                <>
                                    <Icon name="check-circle" size={16} color="#10B981" />
                                    <Text style={[styles.actionBtnText, { color: '#10B981' }]}>
                                        {t('incidents.resolved')}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmpty = useCallback(() => {
        if (loading) {
            return (
                <View style={[styles.loadingContainer, { paddingVertical: SPACING['4xl'] }]}>
                    <ActivityIndicator size="large" color="#EF4444" />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            );
        }
        const tabLabel = activeFilter === 'all' ? t('common.all') : t(`incidents.${activeFilter}`);
        return (
            <View style={styles.emptyContainer}>
                <Icon name="shield-check-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>{t('incidents.noIncidents')}</Text>
                <Text style={styles.emptyText}>
                    {activeFilter === 'all'
                        ? t('incidents.noIncidentsDesc', 'No incidents reported yet')
                        : `${t('incidents.noIncidentsDesc', 'No incidents')} (${tabLabel})`}
                </Text>
            </View>
        );
    }, [loading, activeFilter, t]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <PageHeader 
                title={t('incidents.title')} 
                subtitle={t('incidents.subtitle', 'Real-time monitoring from AI Digital Twin')}
                variant="default"
                showNotification={true}
            />

            {/* Open count banner */}
            {openCount > 0 && (
                <View style={styles.openBanner}>
                    <View style={styles.openBannerContent}>
                        <Icon name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.openBannerText}>
                            {t('incidents.openCountBanner', '{{count}} open incidents — immediate action required', { count: openCount })}
                        </Text>
                    </View>
                </View>
            )}

            {renderFilterTabs()}

            <FlatList
                data={sortedIncidents}
                renderItem={renderIncidentCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchIncidents(true)}
                        colors={['#EF4444']}
                        tintColor={'#EF4444'}
                    />
                }
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />
            </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    openBanner: {
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: SPACING.md,
    },
    openBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: BORDER_RADIUS.lg,
        gap: 8,
    },
    openBannerText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: '#B91C1C',
    },
    filterContainer: {
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
    },
    filterScrollContent: {
        gap: SPACING.xs,
        paddingRight: SCREEN_PADDING.horizontal,
    },
    typeFilterContainer: {
        paddingTop: 0,
        paddingBottom: SPACING.sm,
    },
    typeFilterTab: {
        backgroundColor: theme.colors.backgroundSecondary,
    },
    typeFilterTabActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF444430',
        ...theme.shadows.none,
    },
    typeFilterTabTextActive: {
        color: '#fff',
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 6,
        ...theme.shadows.sm,
    },
    filterTabActive: {
        backgroundColor: '#EF444415',
        borderColor: '#EF444430',
        ...theme.shadows.none,
    },
    filterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.textTertiary,
    },
    filterDotActive: {
        backgroundColor: '#EF4444',
    },
    filterTabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    filterTabTextActive: {
        color: '#EF4444',
    },
    listContent: {
        padding: SCREEN_PADDING.horizontal,
        paddingBottom: 100,
        flexGrow: 1,
    },
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: '#CBD5E1', // Default resolved color
        ...theme.shadows.sm,
    },
    cardActive: {
        borderLeftColor: '#EF4444',
        shadowColor: '#EF4444',
        shadowOpacity: 0.1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        gap: SPACING.sm,
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: '#1E293B',
        lineHeight: 22,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    cardMetaId: {
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: '#94A3B8',
        fontWeight: '700',
    },
    cardMetaTime: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    cardMetaLocation: {
        fontSize: 11,
        color: '#64748B',
        flex: 1,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#CBD5E1',
        marginHorizontal: 6,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        gap: 4,
        backgroundColor: theme.colors.surface,
    },
    badgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    cardDescription: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.sm,
        backgroundColor: theme.colors.background,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    quickActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        paddingTop: SPACING.sm,
        marginTop: SPACING.xs,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        gap: 6,
    },
    actionInvestigate: {
        backgroundColor: '#F59E0B15',
        borderWidth: 1,
        borderColor: '#F59E0B30',
    },
    actionResolve: {
        backgroundColor: '#10B98115',
        borderWidth: 1,
        borderColor: '#10B98130',
    },
    actionBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZE.md,
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING['4xl'],
    },
    emptyTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    emptyText: {
        fontSize: FONT_SIZE.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: SPACING.xl,
    },
});

export default EmergencyIncidentsScreen;
