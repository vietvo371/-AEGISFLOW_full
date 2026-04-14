import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from 'react-native-geolocation-service';
import {
    theme,
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
    SCREEN_PADDING,
    ICON_SIZE,
    wp,
    hp,
} from '../../theme';
import env from '../../config/env';
import PageHeader from '../../component/PageHeader';
import NotificationBellButton from '../../component/NotificationBellButton';
import { incidentService, Incident } from '../../services/incidentService';

MapboxGL.setAccessToken(env.MAPBOX_ACCESS_TOKEN);

const SEVERITY_COLORS: Record<string, string> = {
    low: '#10B981',
    medium: '#3B82F6',
    high: '#F59E0B',
    critical: '#EF4444',
};

const TYPE_ICONS: Record<string, string> = {
    accident: 'car-emergency',
    congestion: 'car-multiple',
    construction: 'hard-hat',
    weather: 'weather-lightning-rainy',
    other: 'alert-circle-outline',
};

const PriorityRouteScreen = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<number[] | null>(null);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [sendingPriority, setSendingPriority] = useState(false);
    const cameraRef = useRef<MapboxGL.Camera>(null);
    const mapRef = useRef<MapboxGL.MapView>(null);

    const fetchActiveIncidents = useCallback(async () => {
        try {
            setLoading(true);
            const response = await incidentService.getIncidents({
                status: 'open',
                per_page: 50,
            });
            if (response.success && response.data) {
                const data = (response.data as any).data || response.data;
                const incidentsWithLocation = (Array.isArray(data) ? data : []).filter(
                    (i: Incident) => i.location && i.location.lat && i.location.lng
                );
                setIncidents(incidentsWithLocation);
            }
        } catch (error) {
            console.error('Error fetching incidents:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveIncidents();
    }, [fetchActiveIncidents]);

    useEffect(() => {
        Geolocation.getCurrentPosition(
            position => {
                setUserLocation([position.coords.longitude, position.coords.latitude]);
            },
            error => console.error('Location error:', error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    }, []);

    const fetchRoute = async (incident: Incident) => {
        if (!userLocation || !incident.location) return;

        setLoadingRoute(true);
        setSelectedIncident(incident);

        try {
            const origin = `${userLocation[0]},${userLocation[1]}`;
            const dest = `${incident.location.lng},${incident.location.lat}`;
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${dest}?geometries=geojson&overview=full&access_token=${env.MAPBOX_ACCESS_TOKEN}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                setRouteGeoJSON({
                    type: 'Feature',
                    geometry: route.geometry,
                    properties: {},
                });

                const distKm = (route.distance / 1000).toFixed(1);
                const durMin = Math.round(route.duration / 60);
                setRouteInfo({
                    distance: `${distKm} km`,
                    duration: `${durMin} phút`,
                });

                // Fit camera to route
                if (cameraRef.current) {
                    const coords = route.geometry.coordinates;
                    const lngs = coords.map((c: number[]) => c[0]);
                    const lats = coords.map((c: number[]) => c[1]);

                    cameraRef.current.fitBounds(
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)],
                        [80, 80, 200, 80],
                        1000
                    );
                }
            }
        } catch (error) {
            console.error('Error fetching route:', error);
        } finally {
            setLoadingRoute(false);
        }
    };

    const clearRoute = () => {
        setSelectedIncident(null);
        setRouteGeoJSON(null);
        setRouteInfo(null);
    };

    const handleSendPriority = async () => {
        if (!selectedIncident) return;
        
        try {
            setSendingPriority(true);
            // Simulate network request to send push notification & priority signal
            await new Promise(resolve => setTimeout(() => resolve(true), 1500));
            
            Alert.alert(
                'Thành công',
                `Đã phát lệnh ưu tiên lưu thông trên tuyến đường đến sự cố #${selectedIncident.id}. Lực lượng CSGT và đèn tín hiệu đã được nhận tín hiệu cập nhật.`,
                [{ text: 'Đóng' }]
            );
            clearRoute();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi lệnh ưu tiên. Vui lòng thử lại.');
        } finally {
            setSendingPriority(false);
        }
    };

    const centerUserLocation = () => {
        if (userLocation && cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: userLocation,
                zoomLevel: 13,
                animationDuration: 1000,
            });
        }
    };

    const renderIncidentListItem = ({ item }: { item: Incident }) => {
        const severityColor = SEVERITY_COLORS[item.severity] || '#6B7280';
        const typeIcon = TYPE_ICONS[item.type] || 'alert-circle-outline';
        const isSelected = selectedIncident?.id === item.id;

        return (
            <TouchableOpacity
                style={[styles.listCard, isSelected && styles.listCardSelected]}
                onPress={() => {
                    if (viewMode === 'list') {
                        setViewMode('map');
                    }
                    fetchRoute(item);
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.listIcon, { backgroundColor: severityColor + '15' }]}>
                    <Icon name={typeIcon} size={22} color={severityColor} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.listMeta}>
                        {item.location_name || `${item.location?.lat.toFixed(4)}, ${item.location?.lng.toFixed(4)}`}
                    </Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: severityColor + '15' }]}>
                    <Text style={[styles.severityText, { color: severityColor }]}>
                        {item.severity.toUpperCase()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <PageHeader 
                title="Tuyến đường ưu tiên" 
                subtitle={viewMode === 'map' ? "Điều phối giao thông thời gian thực" : "Danh sách điểm nóng cần hỗ trợ"}
                variant="default"
                showBack={true}
                showNotification={true}
                rightComponent={
                    <TouchableOpacity
                        style={styles.headerToggleBtn}
                        onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                    >
                        <Icon name={viewMode === 'map' ? "format-list-bulleted" : "map-outline"} size={22} color={theme.colors.primary} />
                    </TouchableOpacity>
                }
            />

            {viewMode === 'map' ? (
                <View style={{ flex: 1 }}>
                    <MapboxGL.MapView
                        ref={mapRef}
                        style={styles.map}
                        styleURL={MapboxGL.StyleURL.Street}
                        logoEnabled={false}
                        attributionEnabled={false}
                    >
                        <MapboxGL.Camera
                            ref={cameraRef}
                            zoomLevel={13}
                            centerCoordinate={userLocation || [106.7009, 10.7769]}
                            animationMode="flyTo"
                            animationDuration={1000}
                        />

                        <MapboxGL.UserLocation
                            visible={true}
                            showsUserHeadingIndicator
                            minDisplacement={10}
                        />

                        {incidents.map(incident => {
                            if (!incident.location) return null;
                            const color = SEVERITY_COLORS[incident.severity] || '#6B7280';
                            return (
                                <MapboxGL.PointAnnotation
                                    key={`incident-${incident.id}`}
                                    id={`incident-${incident.id}`}
                                    coordinate={[incident.location.lng, incident.location.lat]}
                                    onSelected={() => fetchRoute(incident)}
                                >
                                    <View style={[styles.markerContainer, { borderColor: color }]}>
                                        <Icon
                                            name={TYPE_ICONS[incident.type] || 'alert-circle'}
                                            size={16}
                                            color={color}
                                        />
                                    </View>
                                </MapboxGL.PointAnnotation>
                            );
                        })}

                        {routeGeoJSON && (
                            <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
                                <MapboxGL.LineLayer
                                    id="routeLine"
                                    style={{
                                        lineColor: '#6366F1',
                                        lineWidth: 6,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                        lineOpacity: 0.85,
                                    }}
                                />
                            </MapboxGL.ShapeSource>
                        )}
                    </MapboxGL.MapView>

                    <View style={styles.fabContainer}>
                        <TouchableOpacity style={styles.fab} onPress={centerUserLocation}>
                            <Icon name="crosshairs-gps" size={ICON_SIZE.lg} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.fab}
                            onPress={fetchActiveIncidents}
                        >
                            <Icon name="refresh" size={ICON_SIZE.lg} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {selectedIncident && (
                        <View style={styles.routeCard}>
                            <View style={styles.routeCardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.routeCardTitle} numberOfLines={1}>
                                        {selectedIncident.title}
                                    </Text>
                                    {loadingRoute ? (
                                        <ActivityIndicator size="small" color="#6366F1" />
                                    ) : routeInfo ? (
                                        <View style={styles.routeInfoRow}>
                                            <View style={styles.routeInfoItem}>
                                                <Icon name="map-marker-distance" size={14} color="#64748B" />
                                                <Text style={styles.routeInfoText}>{routeInfo.distance}</Text>
                                            </View>
                                            <View style={styles.routeInfoItem}>
                                                <Icon name="clock-outline" size={14} color="#64748B" />
                                                <Text style={styles.routeInfoText}>{routeInfo.duration}</Text>
                                            </View>
                                        </View>
                                    ) : null}
                                </View>
                                <TouchableOpacity onPress={clearRoute} style={styles.closeBtn}>
                                    <Icon name="close" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity 
                                style={[styles.dispatchTouch, sendingPriority && { opacity: 0.8 }]} 
                                onPress={handleSendPriority}
                                disabled={sendingPriority}
                            >
                                <LinearGradient
                                    colors={['#6366F1', '#4F46E5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.dispatchGradient}
                                >
                                    {sendingPriority ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <View style={styles.dispatchIconCircle}>
                                                <Icon name="bullhorn-variant" size={18} color="#4F46E5" />
                                            </View>
                                            <Text style={styles.dispatchBtnText}>PHÁT LỆNH ƯU TIÊN</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!selectedIncident && (
                        <View style={styles.countChip}>
                            <Icon name="alert-circle" size={16} color="#6366F1" />
                            <Text style={styles.countText}>
                                {loading ? '...' : `${incidents.length} điểm cần theo dõi`}
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.listContainer}>
                    <View style={styles.listSubHeader}>
                         <Text style={styles.listSubTitle}>{incidents.length} sự cố đang hoạt động</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366F1" />
                        </View>
                    ) : (
                        <FlatList
                            data={incidents}
                            renderItem={renderIncidentListItem}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={false}
                                    onRefresh={fetchActiveIncidents}
                                    colors={['#6366F1']}
                                    tintColor={'#6366F1'}
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Icon name="shield-check" size={64} color="#CBD5E1" />
                                    <Text style={styles.emptyText}>Không có sự cố đang mở</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC', 
    },
    map: {
        flex: 1,
    },
    headerToggleBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabContainer: {
        position: 'absolute',
        right: SCREEN_PADDING.horizontal,
        bottom: 220,
        gap: SPACING.md,
    },
    fab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    markerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.white,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    routeCard: {
        position: 'absolute',
        bottom: 24,
        left: SCREEN_PADDING.horizontal,
        right: SCREEN_PADDING.horizontal,
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        ...theme.shadows.lg,
    },
    routeCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    closeBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: BORDER_RADIUS.full,
        padding: 4,
    },
    routeCardTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    routeInfoRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    routeInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    routeInfoText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: '#64748B',
    },
    dispatchTouch: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    dispatchGradient: {
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    dispatchIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dispatchBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: FONT_SIZE.md,
        letterSpacing: 1,
    },
    countChip: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BORDER_RADIUS.full,
        gap: 8,
        ...theme.shadows.md,
    },
    countText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: '#1E293B',
    },
    listSubHeader: {
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    listSubTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: '#64748B',
    },
    listContent: {
        padding: SCREEN_PADDING.horizontal,
        paddingBottom: 40,
        flexGrow: 1,
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
        ...theme.shadows.sm,
    },
    listCardSelected: {
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    listIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: '#1E293B',
    },
    listMeta: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    severityText: {
        fontSize: 10,
        fontWeight: '800',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING['4xl'],
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZE.md,
        color: theme.colors.textSecondary,
    },
});

export default PriorityRouteScreen;
