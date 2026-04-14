import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    StatusBar,
    Alert,
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
import { rescueService, RescueRequest } from '../../services/rescueService';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'Chờ xử lý', color: '#EF4444', icon: 'clock-outline' },
    assigned: { label: 'Đã phân công', color: '#F59E0B', icon: 'account-check' },
    in_progress: { label: 'Đang thực hiện', color: '#1E40AF', icon: 'run' },
    completed: { label: 'Hoàn thành', color: '#10B981', icon: 'check-circle' },
    cancelled: { label: 'Đã hủy', color: '#6B7280', icon: 'close-circle' },
};

const MissionListScreen = () => {
    const navigation = useNavigation();
    const [requests, setRequests] = useState<RescueRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMissions = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const data = await rescueService.getRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error fetching missions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMissions();
    }, [fetchMissions]);

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await rescueService.updateStatus(id, status);
            fetchMissions();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
        }
    };

    const renderMissionCard = ({ item }: { item: RescueRequest }) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => (navigation as any).navigate('IncidentDetail', { id: item.id, isRescue: true })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
                        <Icon name={config.icon} size={14} color={config.color} />
                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                    <Text style={styles.timeText}>
                        {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                
                <Text style={styles.title} numberOfLines={2}>{item.description}</Text>
                
                <View style={styles.footer}>
                    <View style={styles.locationContainer}>
                        <Icon name="map-marker" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'critical' ? '#EF4444' : '#F59E0B' }]}>
                        <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <PageHeader 
                title="Nhiệm vụ cứu hộ" 
                subtitle="Danh sách yêu cầu cứu trợ khẩn cấp"
                variant="default"
            />

            <FlatList
                data={requests}
                renderItem={renderMissionCard}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchMissions(true)} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="shield-check-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={styles.emptyTitle}>Sẵn sàng</Text>
                        <Text style={styles.emptyText}>Hiện chưa có yêu cầu cứu hộ nào mới</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        padding: SCREEN_PADDING.horizontal,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BORDER_RADIUS.full,
        gap: 6,
    },
    statusText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    timeText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
    },
    title: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: '#1E293B',
        lineHeight: 22,
        marginBottom: SPACING.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: SPACING.sm,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    locationText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: SPACING.lg,
    },
    emptyText: {
        fontSize: FONT_SIZE.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
});

export default MissionListScreen;
