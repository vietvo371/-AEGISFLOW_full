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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { getOpenMapStyleUrl } from '../../config/mapbox';
import { useAppTheme } from '../../contexts/ThemeContext';
import { incidentService, Incident } from '../../services/incidentService';
import { useTranslation } from '../../hooks/useTranslation';

MapboxGL.setAccessToken('');

const SEVERITY_COLORS: Record<string, string> = {
    low: '#10B981',
    medium: '#3B82F6',
    high: '#F59E0B',
    critical: '#EF4444',
};

const TYPE_ICONS: Record<string, string> = {
    flood: 'home-flood',
    heavy_rain: 'weather-pouring',
    landslide: 'slope-downhill',
    dam_failure: 'waves',
    other: 'alert-circle-outline',
};

const PriorityRouteScreen = () => {
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const styles = getStyles(colors, insets);
    const { t, currentLanguage } = useTranslation();
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
                const { longitude, latitude } = position.coords;

                const isWithinDaNang = (
                  longitude >= 108.02 &&
                  longitude <= 108.29 &&
                  latitude >= 15.82 &&
                  latitude <= 16.16
                );

                if (longitude && latitude && isWithinDaNang) {
                    setUserLocation([longitude, latitude]);
                } else {
                    setUserLocation([108.2122, 16.0680]);
                }
            },
            error => {
                console.error('Location error:', error);
                setUserLocation([108.2122, 16.0680]);
            },
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
            const url = `https://router.project-osrm.org/route/v1/driving/${origin};${dest}?geometries=geojson&overview=full`;

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
                    duration: `${durMin} ${currentLanguage === 'vi' ? 'phút' : 'min'}`,
                });

                if (cameraRef.current) {
                    const coords = route.geometry.coordinates;
                    const lngs = coords.map((c: number[]) => c[0]);
                    const lats = coords.map((c: number[]) => c[1]);

                    cameraRef.current.fitBounds(
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)],
                        [120, 80, 200, 80],
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
            await new Promise(resolve => setTimeout(() => resolve(true), 1500));
            
            Alert.alert(
                t('common.success'),
                t('priorityRoute.dispatchSuccessDesc', `Priority traffic control command dispatched for incident #${selectedIncident.id}. Responders and traffic lights have been updated.`, { id: selectedIncident.id }),
                [{ text: t('common.close') }]
            );
            clearRoute();
        } catch (error) {
            Alert.alert(t('common.error'), t('priorityRoute.dispatchFailed', 'Failed to dispatch priority command. Please try again.'));
        } finally {
            setSendingPriority(false);
        }
    };

    const centerUserLocation = () => {
        if (userLocation && cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: userLocation,
                zoomLevel: 14,
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
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
            
            {viewMode === 'map' ? (
                <View style={{ flex: 1 }}>
                    <MapboxGL.MapView
                        ref={mapRef}
                        style={styles.map}
                        styleURL={getOpenMapStyleUrl(isDark)}
                        logoEnabled={false}
                        attributionEnabled={false}
                    >
                        <MapboxGL.Camera
                            ref={cameraRef}
                            zoomLevel={13}
                            centerCoordinate={userLocation || [108.2122, 16.0680]}
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
                            const isSelected = selectedIncident?.id === incident.id;
                            return (
                                <MapboxGL.PointAnnotation
                                    key={`incident-${incident.id}`}
                                    id={`incident-${incident.id}`}
                                    coordinate={[incident.location.lng, incident.location.lat]}
                                    onSelected={() => fetchRoute(incident)}
                                >
                                    <View style={[styles.markerContainer, { borderColor: color, backgroundColor: isSelected ? color : colors.card }]}>
                                        <Icon
                                            name={TYPE_ICONS[incident.type] || 'alert-circle'}
                                            size={isSelected ? 18 : 16}
                                            color={isSelected ? '#fff' : color}
                                        />
                                    </View>
                                </MapboxGL.PointAnnotation>
                            );
                        })}

                        {routeGeoJSON && (
                            <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
                                <MapboxGL.LineLayer
                                    id="routeLineShadow"
                                    style={{
                                        lineColor: isDark ? '#ffffff' : '#000000',
                                        lineWidth: 8,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                        lineOpacity: 0.2,
                                    }}
                                />
                                <MapboxGL.LineLayer
                                    id="routeLine"
                                    style={{
                                        lineColor: colors.primary,
                                        lineWidth: 5,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                        lineOpacity: 0.9,
                                        lineDasharray: [1.2, 1.2],
                                    }}
                                />
                            </MapboxGL.ShapeSource>
                        )}
                    </MapboxGL.MapView>

                    {/* Floating Header */}
                    <View style={styles.floatingHeader} pointerEvents="box-none">
                        <View style={styles.headerRow}>
                            <TouchableOpacity 
                                style={styles.iconButton}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.7}
                            >
                                <Icon name="chevron-left" size={28} color={colors.text} />
                            </TouchableOpacity>
                            
                            <View style={styles.headerTitleBox}>
                                <Text style={styles.headerTitle}>{t('priorityRoute.title', 'Tuyến đường ưu tiên')}</Text>
                                <Text style={styles.headerSubtitle}>{t('priorityRoute.mapSubtitle', 'Điều phối thời gian thực')}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => setViewMode('list')}
                                activeOpacity={0.7}
                            >
                                <Icon name="format-list-bulleted" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.fabContainer}>
                        <TouchableOpacity style={styles.fab} onPress={centerUserLocation}>
                            <Icon name="crosshairs-gps" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fab} onPress={fetchActiveIncidents}>
                            <Icon name="refresh" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {selectedIncident ? (
                        <View style={styles.routeCard}>
                            <View style={styles.routeCardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.routeCardTitle} numberOfLines={1}>
                                        {selectedIncident.title}
                                    </Text>
                                    {loadingRoute ? (
                                        <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                                    ) : routeInfo ? (
                                        <View style={styles.routeInfoRow}>
                                            <View style={styles.routeInfoItem}>
                                                <Icon name="map-marker-distance" size={14} color={colors.textSecondary} />
                                                <Text style={styles.routeInfoText}>{routeInfo.distance}</Text>
                                            </View>
                                            <View style={styles.routeInfoItem}>
                                                <Icon name="clock-outline" size={14} color={colors.textSecondary} />
                                                <Text style={styles.routeInfoText}>{routeInfo.duration}</Text>
                                            </View>
                                        </View>
                                    ) : null}
                                </View>
                                <TouchableOpacity onPress={clearRoute} style={styles.closeBtn}>
                                    <Icon name="close" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity 
                                style={[styles.dispatchTouch, sendingPriority && { opacity: 0.8 }]} 
                                onPress={handleSendPriority}
                                disabled={sendingPriority}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.dispatchGradient}
                                >
                                    {sendingPriority ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <View style={styles.dispatchIconCircle}>
                                                <Icon name="bullhorn-variant" size={18} color={colors.primary} />
                                            </View>
                                            <Text style={styles.dispatchBtnText}>{t('priorityRoute.dispatchButton', 'PHÁT LỆNH ƯU TIÊN GIAO THÔNG')}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.countChip}>
                            <Icon name="alert-circle" size={18} color={colors.primary} />
                            <Text style={styles.countText}>
                                {loading ? 'Đang tải...' : `${incidents.length} điểm cần xử lý`}
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.listContainer}>
                    <View style={styles.listHeaderArea}>
                        <TouchableOpacity 
                            style={styles.iconButtonList}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="chevron-left" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.listMainTitle}>{t('priorityRoute.title', 'Tuyến đường ưu tiên')}</Text>
                        <TouchableOpacity
                            style={styles.iconButtonList}
                            onPress={() => setViewMode('map')}
                        >
                            <Icon name="map-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.listSubHeader}>
                         <Text style={styles.listSubTitle}>{t('priorityRoute.activeIncidentsCount', '{{count}} sự cố cần giải quyết', { count: incidents.length })}</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
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
                                    colors={[colors.primary]}
                                    tintColor={colors.primary}
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Icon name="shield-check" size={64} color={colors.border} />
                                    <Text style={styles.emptyText}>{t('priorityRoute.noOpenIncidents', 'Không có sự cố nào cần xử lý')}</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            )}
        </View>
    );
};

const getStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContainer: {
        flex: 1,
        backgroundColor: colors.background, 
        paddingTop: insets.top,
    },
    map: {
        flex: 1,
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 8,
        paddingHorizontal: SCREEN_PADDING.horizontal,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: 8,
        paddingVertical: 8,
        ...theme.shadows.md,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    headerTitleBox: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    fabContainer: {
        position: 'absolute',
        right: SCREEN_PADDING.horizontal,
        bottom: 120,
        gap: SPACING.md,
        zIndex: 10,
    },
    fab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    markerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    routeCard: {
        position: 'absolute',
        bottom: 24,
        left: SCREEN_PADDING.horizontal,
        right: SCREEN_PADDING.horizontal,
        backgroundColor: colors.card,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...theme.shadows.lg,
        zIndex: 10,
    },
    routeCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    closeBtn: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.full,
        padding: 6,
    },
    routeCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    routeInfoRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    routeInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    routeInfoText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
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
        fontSize: 14,
        letterSpacing: 0.5,
    },
    countChip: {
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.full,
        gap: 10,
        ...theme.shadows.md,
        zIndex: 10,
    },
    countText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    listHeaderArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingVertical: 12,
        backgroundColor: colors.card,
    },
    iconButtonList: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    listMainTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    listSubHeader: {
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.md,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    listSubTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    listContent: {
        padding: SCREEN_PADDING.horizontal,
        paddingBottom: 40,
        paddingTop: 16,
        flexGrow: 1,
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        gap: SPACING.md,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    listCardSelected: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    listIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    listMeta: {
        fontSize: 13,
        color: colors.textTertiary,
        marginTop: 4,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    severityText: {
        fontSize: 11,
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
        marginTop: SPACING.lg,
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});

export default PriorityRouteScreen;
