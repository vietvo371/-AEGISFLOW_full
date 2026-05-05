import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
  ScrollView, TextInput, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { OPENMAP_STYLE_URL } from '../../config/mapbox';
import { mapService } from '../../services/mapService';
import { reportService } from '../../services/reportService';
import { MapReport, MapBounds } from '../../types/api/map';
// ReportDetail used as 'any' in sheet due to mixed API field names
import { incidentService, Incident } from '../../services/incidentService';

MapboxGL.setAccessToken('');

// ─── Constants ─────────────────────────────────────────────
const DA_NANG_CENTER: [number, number] = [108.2122, 16.0680];

const CITIZEN_CATEGORIES = [
  { id: -1, label: 'Tất cả', icon: 'view-grid-outline' },
  { id: 1, label: 'Giao thông', icon: 'road-variant', color: '#FF9500' },
  { id: 2, label: 'Môi trường', icon: 'tree-outline', color: '#34C759' },
  { id: 3, label: 'Hỏa hoạn', icon: 'fire', color: '#FF3B30' },
  { id: 4, label: 'Rác thải', icon: 'trash-can-outline', color: '#8E6F3E' },
  { id: 5, label: 'Ngập lụt', icon: 'weather-pouring', color: '#007AFF' },
  { id: 6, label: 'Khác', icon: 'alert-circle-outline', color: '#8E8E93' },
];

const EMERGENCY_CATEGORIES = [
  { id: -1, label: 'Tất cả', icon: 'view-grid-outline', color: '#7a5af8' },
  { id: 1, label: 'Ùn tắc', icon: 'car-brake-alert', color: '#F97316' },
  { id: 2, label: 'Tai nạn', icon: 'alert-octagon', color: '#EF4444' },
  { id: 3, label: 'Camera', icon: 'cctv', color: '#06B6D4' },
  { id: 4, label: 'Tuần tra', icon: 'police-badge-outline', color: '#10B981' },
];

const MOCK_CAMERAS = [
  { id: 9001, type: 'camera', title: 'Camera Đầu Cầu Rồng', location: { lat: 16.0610, lng: 108.2272 }, status: 'online', severity: 'low', description: 'Hệ thống phân tích lưu lượng thông minh.' },
  { id: 9002, type: 'camera', title: 'Camera Ngã Tư Hùng Vương', location: { lat: 16.0718, lng: 108.2198 }, status: 'online', severity: 'low', description: 'Góc quét rộng bao quát toàn bộ ngã tư.' },
];

const MOCK_PATROLS = [
  { id: 8001, type: 'patrol', title: 'Tổ Tuần tra CSGT 01', location: { lat: 16.0650, lng: 108.2200 }, status: 'patrolling', severity: 'medium', description: 'Đang di chuyển khu vực Hải Châu.' },
  { id: 8002, type: 'patrol', title: 'Xe Cứu Y tế 115 ĐN', location: { lat: 16.0595, lng: 108.2150 }, status: 'standby', severity: 'low', description: 'Đang túc trực tại cơ sở y tế.' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#EF4444', investigating: '#F59E0B', resolved: '#10B981', closed: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Mở', investigating: 'Đang điều tra', resolved: 'Đã giải quyết', closed: 'Đã đóng',
};

const getCategoryColor = (id: number) => CITIZEN_CATEGORIES.find(c => c.id === id)?.color || '#8E8E93';

// ─── Component ─────────────────────────────────────────────
const MapScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const isEmergency = route.name === 'SituationMap';
  const { isConnected, listen, subscribe, unsubscribe } = useWebSocket();

  const [userLocation, setUserLocation] = useState<number[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(-1);
  const [mapReports, setMapReports] = useState<MapReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);
  const [reportDetail, setReportDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [trafficGeoJSON, setTrafficGeoJSON] = useState<any>(null);
  const [floodZonesGeoJSON, setFloodZonesGeoJSON] = useState<any>(null);
  const [shelters, setShelters] = useState<any[]>([]);
  const [mapIncidents, setMapIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mapIcons, setMapIcons] = useState<Record<string, any>>({});

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ─── Icon Generation ─────────────────────────────────────
  useEffect(() => {
    const iconDefs = [
      { key: 'icon_accident', name: 'alert-octagon', color: '#EF4444' },
      { key: 'icon_congestion', name: 'car-brake-alert', color: '#F97316' },
      { key: 'icon_construction', name: 'hard-hat', color: '#EAB308' },
      { key: 'icon_weather', name: 'weather-lightning-rainy', color: '#3B82F6' },
      { key: 'icon_camera', name: 'cctv', color: '#06B6D4' },
      { key: 'icon_patrol', name: 'police-badge-outline', color: '#10B981' },
      { key: 'icon_traffic', name: 'road-variant', color: '#F97316' },
      { key: 'icon_environment', name: 'tree-outline', color: '#10B981' },
      { key: 'icon_fire', name: 'fire', color: '#EF4444' },
      { key: 'icon_trash', name: 'trash-can-outline', color: '#8B6F4E' },
      { key: 'icon_flood', name: 'weather-pouring', color: '#3B82F6' },
      { key: 'icon_shelter', name: 'home-heart', color: '#10B981' },
      { key: 'icon_default', name: 'alert-circle-outline', color: '#7a5af8' },
    ];
    Promise.all(
      iconDefs.map(d => Icon.getImageSource(d.name, 32, d.color).then(src => ({ key: d.key, src })))
    ).then(results => {
      const icons: Record<string, any> = {};
      results.forEach(({ key, src }) => { icons[key] = src; });
      setMapIcons(icons);
    });
  }, []);

  // ─── Data Fetching ───────────────────────────────────────
  const fetchMapReports = useCallback(async () => {
    if (!mapRef.current) return;
    try {
      setLoading(true);
      const bounds = await mapRef.current.getVisibleBounds();
      if (!bounds || bounds.length < 2) return;

      if (isEmergency) {
        const response = await incidentService.getIncidents({ per_page: 50 });
        if (response.success && response.data) {
          const data = (response.data as any).data || response.data;
          setMapIncidents(Array.isArray(data) ? data : []);
        } else {
          setMapIncidents([]);
        }
        return;
      }

      const ne = bounds[0];
      const sw = bounds[1];
      const mapBounds: MapBounds = { min_lon: sw[0], min_lat: sw[1], max_lon: ne[0], max_lat: ne[1] };
      const filters: any = {};
      if (selectedCategory !== -1) filters.danh_muc = selectedCategory;

      const response = await mapService.getMapReports(mapBounds, filters);
      if (response.success && response.data) {
        const geojson = response.data as any;
        if (geojson.type === 'FeatureCollection' && geojson.features) {
          setMapReports(geojson.features.map((f: any) => ({
            id: f.properties.id,
            tieu_de: f.properties.tieu_de,
            danh_muc: f.properties.danh_muc,
            danh_muc_text: f.properties.danh_muc_text,
            trang_thai: f.properties.trang_thai,
            uu_tien: f.properties.uu_tien,
            marker_color: f.properties.marker_color,
            kinh_do: f.geometry.coordinates[0],
            vi_do: f.geometry.coordinates[1],
            nguoi_dung: f.properties.nguoi_dung,
          } as MapReport)));
        } else {
          setMapReports([]);
        }
      }
    } catch (e) {
      console.error('Error fetching map data:', e);
    } finally {
      setLoading(false);
    }
  }, [isEmergency, selectedCategory]);

  const fetchLayers = useCallback(async () => {
    try {
      const [traffic, flood, shelterRes] = await Promise.allSettled([
        mapService.getTrafficEdges(),
        mapService.getFloodZones(),
        mapService.getShelters(),
      ]);
      if (traffic.status === 'fulfilled' && traffic.value?.type === 'FeatureCollection') setTrafficGeoJSON(traffic.value);
      if (flood.status === 'fulfilled' && flood.value) setFloodZonesGeoJSON(flood.value);
      if (shelterRes.status === 'fulfilled' && (shelterRes.value as any)?.success) setShelters((shelterRes.value as any).data);
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchLayers(); }, []);

  useEffect(() => {
    if (mapLoaded) {
      const timer = setTimeout(fetchMapReports, 500);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (mapLoaded) fetchMapReports();
  }, [selectedCategory]);

  // ─── WebSocket ───────────────────────────────────────────
  useEffect(() => {
    let unmounted = false;
    if (isConnected) {
      try {
        subscribe('public-incidents');
        listen('public-incidents', '.incident.created', () => { if (!unmounted && mapLoaded) fetchMapReports(); });
        listen('public-incidents', '.incident.updated', () => { if (!unmounted && mapLoaded) fetchMapReports(); });
      } catch { /* */ }
    }
    return () => {
      unmounted = true;
      if (isConnected) try { unsubscribe('public-incidents'); } catch { /* */ }
    };
  }, [isConnected, mapLoaded]);

  // ─── Bottom Sheet Animation ──────────────────────────────
  const showSheet = selectedReport || selectedIncident;

  useEffect(() => {
    if (showSheet) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [showSheet]);

  const handleCloseSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 300, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setSelectedReport(null);
      setSelectedIncident(null);
      setReportDetail(null);
    });
  };

  // ─── Handlers ────────────────────────────────────────────
  const centerUserLocation = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: userLocation, zoomLevel: 15, animationDuration: 1000 });
    }
  };

  const handleMarkerSelect = (report: MapReport) => {
    setSelectedReport(report);
    setSelectedIncident(null);
    setReportDetail(null);
    setLoadingDetail(true);
    reportService.getReportDetail(report.id)
      .then(res => { if (res.success) setReportDetail(res.data); })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  };

  // ─── GeoJSON Features ───────────────────────────────────
  const getFeatures = () => {
    if (!isEmergency) {
      return mapReports.map(r => ({
        type: 'Feature' as const,
        id: r.id.toString(),
        geometry: { type: 'Point' as const, coordinates: [r.kinh_do, r.vi_do] },
        properties: { ...r, _isIncident: false },
      }));
    }

    let features: any[] = [];
    let incidents = mapIncidents;
    if (selectedCategory === 1) incidents = mapIncidents.filter(i => i.type === 'congestion');
    else if (selectedCategory === 2) incidents = mapIncidents.filter(i => i.type !== 'congestion');

    if (selectedCategory === -1 || selectedCategory <= 2) {
      features.push(...incidents.map(inc => ({
        type: 'Feature', id: inc.id.toString(),
        geometry: { type: 'Point', coordinates: [inc.location?.lng || 108.2122, inc.location?.lat || 16.0680] },
        properties: {
          ...inc, _isIncident: true,
          _severityColor: SEVERITY_COLORS[inc.severity] || '#10B981',
          _isCritical: inc.severity === 'critical' ? 1 : 0,
        },
      })));
    }
    if (selectedCategory === -1 || selectedCategory === 3) {
      features.push(...MOCK_CAMERAS.map(c => ({
        type: 'Feature', id: c.id.toString(),
        geometry: { type: 'Point', coordinates: [c.location.lng, c.location.lat] },
        properties: { ...c, _isIncident: true, _severityColor: '#06B6D4', _isCritical: 0 },
      })));
    }
    if (selectedCategory === -1 || selectedCategory === 4) {
      features.push(...MOCK_PATROLS.map(p => ({
        type: 'Feature', id: p.id.toString(),
        geometry: { type: 'Point', coordinates: [p.location.lng, p.location.lat] },
        properties: { ...p, _isIncident: true, _severityColor: '#10B981', _isCritical: 0 },
      })));
    }
    return features;
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={OPENMAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => setMapLoaded(true)}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={13}
          centerCoordinate={DA_NANG_CENTER}
          animationMode="flyTo"
          animationDuration={1000}
        />
        <MapboxGL.UserLocation
          visible
          onUpdate={(loc) => { if (loc?.coords) setUserLocation([loc.coords.longitude, loc.coords.latitude]); }}
          showsUserHeadingIndicator
          minDisplacement={10}
        />

        {Object.keys(mapIcons).length > 0 && <MapboxGL.Images images={mapIcons} />}

        {/* Traffic Lines */}
        {trafficGeoJSON && (
          <MapboxGL.ShapeSource id="trafficEdgesSource" shape={trafficGeoJSON}>
            <MapboxGL.LineLayer
              id="trafficLinesLayer"
              style={{
                lineJoin: 'round',
                lineCap: 'round',
                lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 6],
                lineColor: [
                  'interpolate', ['linear'], ['get', 'current_density'],
                  0.0, '#10b981', 0.4, '#eab308', 0.6, '#f97316', 0.8, '#ef4444', 1.0, '#881337',
                ] as any,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Flood Zones */}
        {floodZonesGeoJSON && (
          <MapboxGL.ShapeSource id="floodZonesSource" shape={floodZonesGeoJSON}>
            <MapboxGL.FillLayer
              id="floodZonesFill"
              style={{
                fillColor: ['match', ['get', 'risk_level'], 'High', '#EF4444', 'Medium', '#F59E0B', 'Low', '#3B82F6', '#3B82F6'] as any,
                fillOpacity: 0.4,
                fillOutlineColor: '#ffffff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Markers */}
        <MapboxGL.ShapeSource
          id="reportsSource"
          cluster={false}
          shape={{ type: 'FeatureCollection', features: getFeatures() }}
          onPress={(e) => {
            const f = e.features[0];
            if (f?.properties) {
              if (f.properties._isIncident) {
                setSelectedIncident(f.properties as any);
                setSelectedReport(null);
              } else {
                handleMarkerSelect(f.properties as MapReport);
              }
            }
          }}
        >
          {isEmergency ? (
            <MapboxGL.CircleLayer
              id="criticalRing"
              filter={['==', ['get', '_isCritical'], 1]}
              belowLayerID="markerCircles"
              style={{ circleRadius: 22, circleColor: 'transparent', circleStrokeWidth: 3, circleStrokeColor: '#EF444480' }}
            />
          ) : (
            <MapboxGL.CircleLayer id="criticalRingPlaceholder" style={{ circleRadius: 0, circleOpacity: 0 }} />
          )}
          <MapboxGL.CircleLayer
            id="markerCircles"
            style={{
              circleRadius: ['interpolate', ['linear'], ['zoom'], 10, isEmergency ? 8 : 6, 14, isEmergency ? 14 : 11] as any,
              circleColor: isEmergency
                ? (['get', '_severityColor'] as any)
                : (['match', ['get', 'danh_muc'], 1, '#FF9500', 2, '#34C759', 3, '#FF3B30', 4, '#8E6F3E', 5, '#007AFF', '#8E8E93'] as any),
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#ffffff',
              circleOpacity: 0.95,
            }}
          />
          <MapboxGL.SymbolLayer
            id="reportsLayer"
            style={{
              iconImage: isEmergency
                ? (['match', ['get', 'type'], 'accident', 'icon_accident', 'congestion', 'icon_congestion', 'construction', 'icon_construction', 'weather', 'icon_weather', 'camera', 'icon_camera', 'patrol', 'icon_patrol', 'icon_default'] as any)
                : (['match', ['get', 'danh_muc'], 1, 'icon_traffic', 2, 'icon_environment', 3, 'icon_fire', 4, 'icon_trash', 5, 'icon_flood', 7, 'icon_shelter', 'icon_default'] as any),
              iconSize: isEmergency ? 0.45 : 0.5,
              iconAllowOverlap: true,
              iconAnchor: 'center',
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </View>
      )}

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm địa điểm..."
              placeholderTextColor={theme.colors.textTertiary}
            />
            <TouchableOpacity onPress={fetchMapReports} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="refresh" size={20} color={isEmergency ? '#EF4444' : theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(isEmergency ? EMERGENCY_CATEGORIES : CITIZEN_CATEGORIES).map(cat => {
            const isActive = selectedCategory === cat.id;
            const color = cat.color || theme.colors.primary;
            const count = isEmergency
              ? (cat.id === -1 ? mapIncidents.length + MOCK_CAMERAS.length + MOCK_PATROLS.length
                : cat.id === 1 ? mapIncidents.filter(i => i.type === 'congestion').length
                : cat.id === 2 ? mapIncidents.filter(i => i.type !== 'congestion').length
                : cat.id === 3 ? MOCK_CAMERAS.length : MOCK_PATROLS.length)
              : (cat.id === -1 ? mapReports.length : mapReports.filter(r => r.danh_muc === cat.id).length);

            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Icon name={cat.icon} size={14} color={isActive ? '#fff' : color} />
                <Text style={[styles.chipText, { color: isActive ? '#fff' : color }]}>{cat.label}</Text>
                {count > 0 && cat.id !== -1 && (
                  <View style={[styles.chipBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : color + '20' }]}>
                    <Text style={[styles.chipBadgeText, { color: isActive ? '#fff' : color }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* GPS FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={centerUserLocation}>
          <Icon name="crosshairs-gps" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      {showSheet && (
        <>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseSheet} />
          </Animated.View>

          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.handle} />

            {selectedReport ? (
              <ReportSheet
                report={selectedReport}
                detail={reportDetail}
                loading={loadingDetail}
                onClose={handleCloseSheet}
                onNavigate={(id) => { handleCloseSheet(); navigation.navigate('ReportDetail', { id }); }}
              />
            ) : selectedIncident ? (
              <IncidentSheet
                incident={selectedIncident}
                onClose={handleCloseSheet}
                onNavigate={(id) => { handleCloseSheet(); navigation.navigate('IncidentDetail', { id }); }}
              />
            ) : null}
          </Animated.View>
        </>
      )}
    </View>
  );
};

// ─── Report Bottom Sheet ───────────────────────────────────
const ReportSheet = ({ report, detail, loading, onClose, onNavigate }: {
  report: MapReport; detail: any; loading: boolean;
  onClose: () => void; onNavigate: (id: number) => void;
}) => {
  const catColor = getCategoryColor(report.danh_muc);
  return (
    <>
      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle} numberOfLines={2}>{report.tieu_de}</Text>
          <Text style={styles.sheetSub}>#{report.id}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: catColor + '15' }]}>
          <Text style={[styles.badgeText, { color: catColor }]}>{report.danh_muc_text || 'Báo cáo'}</Text>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
      ) : detail ? (
        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          {detail.mo_ta && <Text style={styles.descText} numberOfLines={3}>{detail.mo_ta}</Text>}

          {detail.hinh_anhs && detail.hinh_anhs.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {detail.hinh_anhs.map((img: any) => (
                <Image key={img.id} source={{ uri: img.duong_dan_hinh_anh }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}

          {detail.dia_chi && (
            <View style={styles.infoRow}>
              <Icon name="map-marker" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{detail.dia_chi}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate(report.id)}>
            <Icon name="information-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </>
  );
};

// ─── Incident Bottom Sheet ─────────────────────────────────
const IncidentSheet = ({ incident, onClose, onNavigate }: {
  incident: Incident; onClose: () => void; onNavigate: (id: number) => void;
}) => {
  const sevColor = SEVERITY_COLORS[incident.severity] || '#10B981';
  const statColor = STATUS_COLORS[incident.status] || '#6B7280';

  return (
    <>
      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle} numberOfLines={2}>{incident.title || 'Sự cố'}</Text>
          <Text style={styles.sheetSub}>#{incident.id}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: sevColor + '15' }]}>
          <Text style={[styles.badgeText, { color: sevColor }]}>{incident.severity?.toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statColor + '15' }]}>
          <View style={[styles.dot, { backgroundColor: statColor }]} />
          <Text style={[styles.badgeText, { color: statColor }]}>{STATUS_LABELS[incident.status] || incident.status}</Text>
        </View>
      </View>

      {incident.description && (
        <Text style={styles.descText} numberOfLines={3}>{incident.description}</Text>
      )}

      {/* AI Panel */}
      <View style={styles.aiPanel}>
        <View style={styles.aiHeader}>
          <Icon name="brain" size={16} color="#9b8afb" />
          <Text style={styles.aiTitle}>AI Analysis</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.aiRow}>
          <Icon name="trending-up" size={14} color="#F59E0B" />
          <Text style={styles.aiText}>
            Dự đoán: Nguy cơ gia tăng {incident.severity === 'critical' ? '80%' : '30%'} trong 15 phút tới
          </Text>
        </View>
      </View>

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate(incident.id)}>
          <Icon name="shield-alert-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Chi tiết sự cố</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16,
  },
  searchRow: { marginTop: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.text },

  filterRow: { paddingTop: 10, paddingBottom: 4, gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  chipBadgeText: { fontSize: 10, fontWeight: '800' },

  fabContainer: {
    position: 'absolute', bottom: Platform.select({ ios: 100, android: 80 }), right: 16,
  },
  fab: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },

  loadingOverlay: { position: 'absolute', top: 140, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  loadingBox: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, elevation: 3 },
  loadingText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 12 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: Platform.select({ ios: 34, android: 20 }),
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginVertical: 12 },

  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  sheetSub: { fontSize: 12, color: theme.colors.textSecondary },
  closeBtn: { padding: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  descText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
  thumb: { width: 160, height: 100, borderRadius: 10, marginRight: 10, backgroundColor: '#F3F4F6' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 12, backgroundColor: theme.colors.primary + '10', borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },

  aiPanel: {
    backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#7a5af830',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#E0E7FF' },
  liveBadge: { backgroundColor: '#EF444420', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#EF4444' },
  liveText: { fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 1 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 6, backgroundColor: '#F59E0B08' },
  aiText: { flex: 1, fontSize: 12, color: '#D1D5DB', lineHeight: 16 },

  sheetActions: { marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default MapScreen;
