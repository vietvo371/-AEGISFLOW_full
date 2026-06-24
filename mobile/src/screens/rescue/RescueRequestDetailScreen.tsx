import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, Linking, Platform,
    Animated,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import PageHeader from '../../component/PageHeader';
import { useTranslation } from '../../hooks/useTranslation';
import {
    theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING,
} from '../../theme';
import { rescueService, RescueRequestItem } from '../../services/rescueService';
import { RootStackParamList } from '../../navigation/types';
import { OPENMAP_STYLE_URL } from '../../config/mapbox';
import { useAuth } from '../../contexts/AuthContext';

MapboxGL.setAccessToken('');

type RouteProps = RouteProp<RootStackParamList, 'RescueRequestDetail'>;

// ─── Configs ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pending:     { label: 'Chờ xử lý',     color: '#EF4444', icon: 'clock-outline' },
    assigned:    { label: 'Đã phân công',   color: '#F59E0B', icon: 'account-check' },
    in_progress: { label: 'Đang thực hiện', color: '#10B981', icon: 'run' },
    completed:   { label: 'Hoàn thành',     color: '#6366F1', icon: 'check-circle' },
    cancelled:   { label: 'Đã hủy',         color: '#6B7280', icon: 'close-circle' },
};

const URGENCY_COLOR: Record<string, string> = {
    critical: '#EF4444',
    high:     '#F97316',
    medium:   '#F59E0B',
    low:      '#10B981',
};

const CATEGORY_LABEL: Record<string, string> = {
    medical:    '🏥 Y tế khẩn cấp',
    food:       '🍱 Lương thực',
    water:      '💧 Nước sạch',
    rescue:     '🚨 Cứu hộ',
    evacuation: '🏃 Di tản',
    shelter:    '🏠 Nơi trú ẩn',
    other:      '❓ Khác',
};

const MISSION_STEPS = [
    { icon: 'navigation',           color: '#3B82F6', label: 'Di chuyển đến điểm cứu hộ',      sub: 'Bật chỉ đường và di chuyển an toàn' },
    { icon: 'account-group',        color: '#F59E0B', label: 'Tiếp cận & đánh giá tình hình',  sub: 'Liên lạc người gọi, xác định số người' },
    { icon: 'ambulance',            color: '#EF4444', label: 'Hỗ trợ / Sơ tán người bị nạn',   sub: 'Thực hiện cứu hộ, cấp cứu nếu cần' },
    { icon: 'check-circle-outline', color: '#10B981', label: 'Báo cáo hoàn thành nhiệm vụ',    sub: 'Bấm "Hoàn thành" để kết thúc nhiệm vụ' },
];

const TABS = [
    { key: 'route',  label: 'Chỉ đường', icon: 'navigation' },
    { key: 'info',   label: 'Thông tin', icon: 'information' },
    { key: 'action', label: 'Hành động', icon: 'lightning-bolt' },
];

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

// Simulator fallback: nearby An Hải/Đà Nẵng location used when GPS is unavailable.
const FALLBACK_USER_LOCATION: [number, number] = [108.24535, 16.068882];

const getDistanceKm = (from: [number, number], to: [number, number]) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(to[1] - from[1]);
    const dLng = toRad(to[0] - from[0]);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.sin(dLng / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Component ────────────────────────────────────────────────────────────────

const RescueRequestDetailScreen = () => {
    const route      = useRoute<RouteProps>();
    const navigation = useNavigation();
    const { isEmergency } = useAuth();
    const { t }      = useTranslation();
    const { id }     = route.params;

    const [activeTab, setActiveTab]     = useState<'route' | 'info' | 'action'>(isEmergency ? 'route' : 'info');
    const [request, setRequest]         = useState<RescueRequestItem | null>(null);
    const [loading, setLoading]         = useState(true);
    const [updating, setUpdating]       = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
    const [routeInfo, setRouteInfo]     = useState<{ distance: string; duration: string } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);

    const cameraRef  = useRef<MapboxGL.Camera>(null);
    const indicatorX = useRef(new Animated.Value(0)).current;

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchRequest = useCallback(async () => {
        try {
            setLoading(true);
            const data = await rescueService.getRequest(id);
            setRequest(data);
        } catch {
            Alert.alert('Lỗi', 'Không thể tải thông tin yêu cầu cứu hộ.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchRequest(); }, [fetchRequest]);

    // ─── Geolocation ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isEmergency) return;
        Geolocation.getCurrentPosition(
            pos => {
                const { longitude, latitude } = pos.coords;
                
                // Check if coordinates are within Da Nang bounds
                const isWithinDaNang = (
                  longitude >= 108.02 &&
                  longitude <= 108.29 &&
                  latitude >= 15.82 &&
                  latitude <= 16.16
                );

                setUserLocation(
                  longitude && latitude && isWithinDaNang
                    ? [longitude, latitude]
                    : FALLBACK_USER_LOCATION
                );
            },
            err => {
                console.log('Location error:', err);
                setUserLocation(FALLBACK_USER_LOCATION);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
    }, [isEmergency]);

    // ─── Route (OSRM) ─────────────────────────────────────────────────────────
    const fetchRoute = useCallback(async (req: RescueRequestItem, userLoc: [number, number]) => {
        if (!req.latitude || !req.longitude) return;
        const destCoordinate: [number, number] = [req.longitude, req.latitude];

        const applyFallbackRoute = () => {
            const distanceKm = getDistanceKm(userLoc, destCoordinate);
            setRouteGeoJSON({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [userLoc, destCoordinate],
                },
                properties: { fallback: true },
            });
            setRouteInfo({
                distance: `${Math.max(distanceKm, 0.1).toFixed(1)} km`,
                duration: `${Math.max(Math.round((distanceKm / 25) * 60), 1)} phút`,
            });
            cameraRef.current?.fitBounds(
                [Math.min(userLoc[0], destCoordinate[0]), Math.min(userLoc[1], destCoordinate[1])],
                [Math.max(userLoc[0], destCoordinate[0]), Math.max(userLoc[1], destCoordinate[1])],
                [80, 80, 120, 80],
                1000,
            );
        };

        try {
            setLoadingRoute(true);
            const origin = `${userLoc[0]},${userLoc[1]}`;
            const dest   = `${req.longitude},${req.latitude}`;
            const url    = `https://router.project-osrm.org/route/v1/driving/${origin};${dest}?geometries=geojson&overview=full`;
            const res    = await fetch(url);
            const data   = await res.json();
            if (data.routes?.length > 0) {
                const r = data.routes[0];
                setRouteGeoJSON({ type: 'Feature', geometry: r.geometry, properties: {} });
                setRouteInfo({
                    distance: `${(r.distance / 1000).toFixed(1)} km`,
                    duration: `${Math.round(r.duration / 60)} phút`,
                });
                if (cameraRef.current) {
                    const coords = r.geometry.coordinates as number[][];
                    const lngs = coords.map(c => c[0]);
                    const lats = coords.map(c => c[1]);
                    cameraRef.current.fitBounds(
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)],
                        [80, 80, 120, 80], 1000,
                    );
                }
            } else {
                applyFallbackRoute();
            }
        } catch (e) {
            console.log('Route error:', e);
            applyFallbackRoute();
        } finally {
            setLoadingRoute(false);
        }
    }, []);

    useEffect(() => {
        if (isEmergency && request && userLocation) fetchRoute(request, userLocation);
    }, [request, userLocation, fetchRoute, isEmergency]);

    // ─── Tab indicator animation ───────────────────────────────────────────────
    const switchTab = (tab: 'route' | 'info' | 'action') => {
        if (tab === 'action' && !isEmergency) return;
        const availableTabs = isEmergency ? TABS : TABS.filter(t => t.key === 'info');
        const idx = availableTabs.findIndex(t => t.key === tab);
        Animated.spring(indicatorX, {
            toValue: Math.max(idx, 0),
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
        }).start();
        setActiveTab(tab);
    };

    // ─── External maps ────────────────────────────────────────────────────────
    const openExternalMaps = () => {
        if (!request?.latitude || !request?.longitude) return;
        const { latitude: lat, longitude: lng } = request;
        const url = Platform.OS === 'ios'
            ? `maps://?daddr=${lat},${lng}&dirflg=d`
            : `google.navigation:q=${lat},${lng}`;
        Linking.openURL(url).catch(() =>
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
        );
    };

    // ─── Status update ────────────────────────────────────────────────────────
    const handleStatusUpdate = (newStatus: string, label: string) => {
        if (!isEmergency) {
            Alert.alert('Không có quyền', 'Người dân chỉ theo dõi trạng thái yêu cầu. Việc nhận nhiệm vụ dành cho đội cứu hộ.');
            return;
        }

        Alert.alert('Xác nhận', `${label}?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xác nhận',
                onPress: async () => {
                    try {
                        setUpdating(true);
                        await rescueService.updateStatus(id, newStatus);
                        await fetchRequest();
                        Alert.alert('Thành công', 'Đã cập nhật trạng thái.');
                    } catch {
                        Alert.alert('Lỗi', 'Cập nhật thất bại.');
                    } finally {
                        setUpdating(false);
                    }
                },
            },
        ]);
    };

    // ─── Loading / Error ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.container}>
                <PageHeader title="Chi tiết yêu cầu" variant="default" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            </View>
        );
    }

    if (!request) {
        return (
            <View style={styles.container}>
                <PageHeader title="Chi tiết yêu cầu" variant="default" />
                <View style={styles.center}>
                    <Icon name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>Không tìm thấy yêu cầu cứu hộ</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const statusConf   = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const urgency      = request.priority || request.urgency || 'medium';
    const urgencyColor = URGENCY_COLOR[urgency] || URGENCY_COLOR.medium;
    const location     = request.address || (
        request.latitude && request.longitude
            ? `${request.latitude.toFixed(5)}, ${request.longitude.toFixed(5)}`
            : 'Chưa có địa chỉ'
    );
    const hasCoords = !!(request.latitude && request.longitude);
    const isActive  = ['pending', 'assigned', 'in_progress'].includes(request.status);
    const isMission = request.status === 'in_progress';
    const visibleTabs = isEmergency ? TABS : TABS.filter(tab => tab.key === 'info');
    const mapCenter: [number, number] = hasCoords
        ? [request.longitude!, request.latitude!]
        : [108.2022, 16.0544];

    // ─── Render tabs ──────────────────────────────────────────────────────────

    const renderRouteTab = () => (
        <View style={styles.tabContent}>
            {/* Route stats */}
            {routeInfo ? (
                <View style={styles.routeStatsRow}>
                    <View style={[styles.routeStat, { borderColor: '#3B82F620' }]}>
                        <Icon name="road-variant" size={20} color="#3B82F6" />
                        <Text style={styles.routeStatValue}>{routeInfo.distance}</Text>
                        <Text style={styles.routeStatLabel}>Khoảng cách</Text>
                    </View>
                    <View style={[styles.routeStat, { borderColor: '#F59E0B20' }]}>
                        <Icon name="clock-fast" size={20} color="#F59E0B" />
                        <Text style={styles.routeStatValue}>{routeInfo.duration}</Text>
                        <Text style={styles.routeStatLabel}>Thời gian</Text>
                    </View>
                    <View style={[styles.routeStat, { borderColor: '#EF444420' }]}>
                        <Icon name="car-emergency" size={20} color="#EF4444" />
                        <Text style={[styles.routeStatValue, { color: '#EF4444' }]}>ƯU TIÊN</Text>
                        <Text style={styles.routeStatLabel}>Tuyến đường</Text>
                    </View>
                </View>
            ) : loadingRoute ? (
                <View style={styles.routeLoading}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={styles.routeLoadingText}>Đang tính tuyến đường...</Text>
                </View>
            ) : hasCoords && !userLocation ? (
                <View style={styles.routeLoading}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={styles.routeLoadingText}>Đang lấy vị trí hiện tại...</Text>
                </View>
            ) : (
                <View style={styles.routeLoading}>
                    <Icon name="map-marker-off" size={24} color={theme.colors.textSecondary} />
                    <Text style={styles.routeLoadingText}>Không có tọa độ GPS cho điểm này</Text>
                </View>
            )}

            {/* Map */}
            <View style={styles.mapContainer}>
                {loadingRoute && (
                    <View style={styles.mapOverlay}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                )}
                <MapboxGL.MapView
                    style={styles.map}
                    styleURL={OPENMAP_STYLE_URL}
                    scrollEnabled={true}
                    zoomEnabled={true}
                >
                    <MapboxGL.Camera
                        ref={cameraRef}
                        centerCoordinate={mapCenter}
                        zoomLevel={13}
                        animationDuration={500}
                    />

                    {/* User blue dot */}
                    {userLocation && (
                        <MapboxGL.PointAnnotation id="user-loc" coordinate={userLocation}>
                            <View style={styles.userDot}>
                                <View style={styles.userDotInner} />
                            </View>
                            <MapboxGL.Callout title="Vị trí của bạn" />
                        </MapboxGL.PointAnnotation>
                    )}

                    {/* Rescue destination */}
                    {hasCoords && (
                        <MapboxGL.PointAnnotation
                            id="rescue-dest"
                            coordinate={[request.longitude!, request.latitude!]}
                        >
                            <View style={[styles.destMarker, { backgroundColor: urgencyColor }]}>
                                <Icon name="map-marker-alert" size={20} color="#fff" />
                            </View>
                            <MapboxGL.Callout title={request.caller_name || 'Điểm cứu hộ'} />
                        </MapboxGL.PointAnnotation>
                    )}

                    {/* Route polyline */}
                    {routeGeoJSON && (
                        <MapboxGL.ShapeSource id="route-src" shape={routeGeoJSON}>
                            <MapboxGL.LineLayer
                                id="route-line"
                                style={{
                                    lineColor: '#3B82F6',
                                    lineWidth: 5,
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                    lineOpacity: 0.9,
                                }}
                            />
                        </MapboxGL.ShapeSource>
                    )}
                </MapboxGL.MapView>
            </View>

            {/* Destination address */}
            <View style={styles.addressCard}>
                <View style={styles.addressIcon}>
                    <Icon name="map-marker" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>Điểm đến</Text>
                    <Text style={styles.addressText}>{location}</Text>
                </View>
            </View>
        </View>
    );

    const renderInfoTab = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
            {/* Status hero */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: urgencyColor }]}>
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: statusConf.color + '18' }]}>
                        <Icon name={statusConf.icon} size={12} color={statusConf.color} />
                        <Text style={[styles.badgeText, { color: statusConf.color }]}>{statusConf.label.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: urgencyColor + '18' }]}>
                        <Text style={[styles.badgeText, { color: urgencyColor }]}>{t(`incidents.severity.${urgency}`, urgency).toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.heroName}>{request.caller_name}</Text>
                {request.caller_phone && (
                    <TouchableOpacity
                        style={styles.phoneRow}
                        onPress={() => Linking.openURL(`tel:${request.caller_phone}`)}
                    >
                        <View style={styles.phoneIcon}>
                            <Icon name="phone" size={14} color="#10B981" />
                        </View>
                        <Text style={styles.phoneText}>{request.caller_phone}</Text>
                        <View style={styles.callBadge}>
                            <Text style={styles.callBadgeText}>Gọi ngay</Text>
                        </View>
                    </TouchableOpacity>
                )}
                <View style={styles.metaItem}>
                    <Icon name="clock-outline" size={13} color={theme.colors.textSecondary} />
                    <Text style={styles.metaText}>{fmtDate(request.created_at)}</Text>
                </View>
            </View>

            {/* Location */}
            <View style={styles.card}>
                <Text style={styles.cardLabel}>ĐỊA ĐIỂM</Text>
                <TouchableOpacity style={styles.locationRow} onPress={openExternalMaps}>
                    <View style={styles.locationIcon}>
                        <Icon name="map-marker" size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.locationText}>{location}</Text>
                        {request.district && (
                            <Text style={styles.districtText}>{request.district.name}</Text>
                        )}
                    </View>
                    <Icon name="chevron-right" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Description */}
            {request.description ? (
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>MÔ TẢ TÌNH HUỐNG</Text>
                    <Text style={styles.descText}>{request.description}</Text>
                </View>
            ) : null}

            {/* People */}
            <View style={styles.twoCol}>
                <View style={[styles.card, styles.halfCard]}>
                    <Text style={styles.cardLabel}>SỐ NGƯỜI</Text>
                    <View style={styles.bigStat}>
                        <Icon name="account-group" size={22} color="#1E40AF" />
                        <Text style={styles.bigStatText}>{request.people_count || 0}</Text>
                    </View>
                    <Text style={styles.bigStatLabel}>người cần hỗ trợ</Text>
                </View>
                <View style={[styles.card, styles.halfCard]}>
                    <Text style={styles.cardLabel}>ƯU TIÊN</Text>
                    <View style={styles.bigStat}>
                        <Icon name="alert-decagram" size={22} color={urgencyColor} />
                        <Text style={[styles.bigStatText, { color: urgencyColor }]}>
                            {urgency === 'critical' ? 'Nguy cấp' :
                             urgency === 'high'     ? 'Cao' :
                             urgency === 'medium'   ? 'TB' : 'Thấp'}
                        </Text>
                    </View>
                    {request.priority_score != null && (
                        <Text style={styles.bigStatLabel}>điểm: {request.priority_score}</Text>
                    )}
                </View>
            </View>

            {/* Vulnerable groups */}
            {request.vulnerable_groups?.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>NHÓM DỄ BỊ TỔN THƯƠNG</Text>
                    <View style={styles.tagRow}>
                        {request.vulnerable_groups.map((g, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>{t(`citizen.sos.form.${g}`, g)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Assigned team */}
            {request.assigned_team && (
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>ĐỘI ĐƯỢC PHÂN CÔNG</Text>
                    <View style={styles.teamRow}>
                        <View style={styles.teamAvatar}>
                            <Icon name="shield-account" size={20} color="#1E40AF" />
                        </View>
                        <Text style={styles.teamName}>{request.assigned_team.name}</Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );

    const renderActionTab = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
            {/* Mission steps */}
            {isMission && (
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>QUY TRÌNH NHIỆM VỤ</Text>
                    {MISSION_STEPS.map((step, i) => (
                        <View key={i} style={styles.stepOuter}>
                            <View style={styles.stepTimeline}>
                                <View style={[styles.stepDot, { backgroundColor: step.color }]}>
                                    <Icon name={step.icon} size={14} color="#fff" />
                                </View>
                                {i < MISSION_STEPS.length - 1 && (
                                    <View style={[styles.stepLine, { backgroundColor: MISSION_STEPS[i + 1].color + '40' }]} />
                                )}
                            </View>
                            <View style={styles.stepBody}>
                                <Text style={styles.stepLabel}>{step.label}</Text>
                                <Text style={styles.stepSub}>{step.sub}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Action buttons */}
            {isActive ? (
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>HÀNH ĐỘNG</Text>

                    {request.status === 'pending' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => handleStatusUpdate('in_progress', 'Nhận và bắt đầu xử lý yêu cầu cứu hộ này')}
                            disabled={updating}
                        >
                            {updating
                                ? <ActivityIndicator size="small" color="#fff" />
                                : (<>
                                    <Icon name="hand-okay" size={22} color="#fff" />
                                    <Text style={styles.actionBtnText}>Nhận nhiệm vụ</Text>
                                </>)}
                        </TouchableOpacity>
                    )}

                    {request.status === 'in_progress' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.completeBtn]}
                            onPress={() => handleStatusUpdate('completed', 'Xác nhận hoàn thành nhiệm vụ cứu hộ này')}
                            disabled={updating}
                        >
                            {updating
                                ? <ActivityIndicator size="small" color="#fff" />
                                : (<>
                                    <Icon name="check-circle" size={22} color="#fff" />
                                    <Text style={styles.actionBtnText}>Hoàn thành nhiệm vụ</Text>
                                </>)}
                        </TouchableOpacity>
                    )}

                    {(request.status === 'pending' || request.status === 'assigned') && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.cancelBtn]}
                            onPress={() => handleStatusUpdate('cancelled', 'Từ chối yêu cầu cứu hộ này')}
                            disabled={updating}
                        >
                            <Icon name="close-circle-outline" size={20} color="#6B7280" />
                            <Text style={[styles.actionBtnText, { color: '#6B7280' }]}>Từ chối yêu cầu</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={[styles.card, { alignItems: 'center', paddingVertical: SPACING.xl }]}>
                    <Icon
                        name={request.status === 'completed' ? 'check-circle' : 'close-circle'}
                        size={48} color={statusConf.color}
                    />
                    <Text style={[styles.resolvedTitle, { color: statusConf.color }]}>
                        {statusConf.label}
                    </Text>
                    <Text style={styles.resolvedSub}>
                        {request.status === 'completed'
                            ? 'Nhiệm vụ đã được hoàn thành thành công!'
                            : 'Yêu cầu này đã bị hủy.'}
                    </Text>
                </View>
            )}
        </ScrollView>
    );

    // ─── Main render ──────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <PageHeader
                title={`YC Cứu hộ #${request.id}`}
                subtitle={CATEGORY_LABEL[request.category] || request.category}
                variant="default"
                showNotification={true}
            />

            {/* Status strip */}
            <View style={[styles.statusStrip, { backgroundColor: statusConf.color }]}>
                <Icon name={statusConf.icon} size={14} color="#fff" />
                <Text style={styles.statusStripText}>{statusConf.label.toUpperCase()}</Text>
                <View style={[styles.urgencyPill, { backgroundColor: '#ffffff30' }]}>
                    <Text style={styles.urgencyPillText}>{t(`incidents.severity.${urgency}`, urgency).toUpperCase()}</Text>
                </View>
            </View>

            {/* Tab bar */}
            {isEmergency && (
                <View style={styles.tabBar}>
                    {visibleTabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.tabItem}
                                onPress={() => switchTab(tab.key as any)}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name={tab.icon}
                                    size={18}
                                    color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                                />
                                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                    {tab.label}
                                </Text>
                                {isActive && <View style={styles.tabIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Tab content */}
            {activeTab === 'route'  && renderRouteTab()}
            {activeTab === 'info'   && renderInfoTab()}
            {activeTab === 'action' && isEmergency && renderActionTab()}
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    loadingText: { marginTop: SPACING.md, color: theme.colors.textSecondary, fontSize: FONT_SIZE.sm },
    emptyText:   { marginTop: SPACING.md, color: theme.colors.textSecondary, fontSize: FONT_SIZE.md },
    backBtn: {
        marginTop: SPACING.md, paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm, backgroundColor: theme.colors.primary, borderRadius: BORDER_RADIUS.md,
    },
    backBtnText: { color: '#fff', fontWeight: '700' },

    // Status strip
    statusStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: 8,
        paddingHorizontal: SCREEN_PADDING.horizontal,
    },
    statusStripText: { fontSize: 12, fontWeight: '800', color: '#fff', flex: 1, letterSpacing: 0.5 },
    urgencyPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
    urgencyPillText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        gap: 3,
        position: 'relative',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    tabLabelActive: {
        color: theme.colors.primary,
        fontWeight: '800',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '15%',
        right: '15%',
        height: 3,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
    },

    // Tab content
    tabContent: { flex: 1 },
    tabScrollContent: {
        padding: SCREEN_PADDING.horizontal,
        paddingTop: SPACING.md,
        paddingBottom: 60,
    },

    // Route tab
    routeStatsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        padding: SCREEN_PADDING.horizontal,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    routeStat: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        ...theme.shadows.sm,
    },
    routeStatValue: { fontSize: FONT_SIZE.md, fontWeight: '800', color: '#1E293B' },
    routeStatLabel: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },
    routeLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.md,
    },
    routeLoadingText: { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary },

    mapContainer: {
        height: 280,
        marginHorizontal: SCREEN_PADDING.horizontal,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        position: 'relative',
        ...theme.shadows.sm,
    },
    map: { flex: 1 },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F1F5F980',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    // Map markers
    userDot: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#3B82F640',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#3B82F6',
    },
    userDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
    destMarker: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
        ...theme.shadows.sm,
    },

    navigateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginHorizontal: SCREEN_PADDING.horizontal,
        marginTop: SPACING.md,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: '#3B82F6',
        ...theme.shadows.sm,
    },
    navigateBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#fff' },

    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        margin: SCREEN_PADDING.horizontal,
        marginTop: SPACING.sm,
        padding: SPACING.md,
        backgroundColor: '#fff',
        borderRadius: BORDER_RADIUS.xl,
        ...theme.shadows.sm,
    },
    addressIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center', alignItems: 'center',
    },
    addressLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 2 },
    addressText:  { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#1E293B' },

    // Info / Action cards
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...theme.shadows.sm,
    },
    cardLabel: {
        fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
        color: theme.colors.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase',
    },

    // Hero
    badgeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.full,
    },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    heroName: {
        fontSize: FONT_SIZE.xl, fontWeight: '700', color: theme.colors.text,
        lineHeight: 28, marginBottom: SPACING.sm,
    },
    phoneRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm,
    },
    phoneIcon: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center',
    },
    phoneText: { fontSize: FONT_SIZE.md, color: '#10B981', fontWeight: '700', flex: 1 },
    callBadge: {
        backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
    },
    callBadgeText: { fontSize: 10, fontWeight: '800', color: '#10B981' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    metaText:  { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary },

    // Location
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    locationIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center',
    },
    locationText: { fontSize: FONT_SIZE.sm, color: theme.colors.text, fontWeight: '600' },
    districtText: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary, marginTop: 2 },
    descText: { fontSize: FONT_SIZE.md, color: theme.colors.text, lineHeight: 24 },

    // Two col
    twoCol:   { flexDirection: 'row', gap: SPACING.sm },
    halfCard: { flex: 1, marginBottom: SPACING.md },
    bigStat:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.sm },
    bigStatText:  { fontSize: 22, fontWeight: '800', color: '#1E40AF' },
    bigStatLabel: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary },

    // Tags
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    tag: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
    tagText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: '#4F46E5' },

    // Team
    teamRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    teamAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
    teamName:   { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.text },

    // Mission steps
    stepOuter: { flexDirection: 'row', marginBottom: 0 },
    stepTimeline: { width: 36, alignItems: 'center' },
    stepDot: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
    stepBody: { flex: 1, paddingLeft: SPACING.sm, paddingBottom: SPACING.md, paddingTop: 4 },
    stepLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: '#1E293B' },
    stepSub:   { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },

    // Action buttons
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: SPACING.sm, paddingVertical: 16,
        borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.sm,
    },
    acceptBtn:   { backgroundColor: '#10B981' },
    completeBtn: { backgroundColor: '#1E40AF' },
    cancelBtn:   { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    actionBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#fff' },

    resolvedTitle: { fontSize: FONT_SIZE.xl, fontWeight: '800', marginTop: SPACING.md },
    resolvedSub:   { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
});

export default RescueRequestDetailScreen;
