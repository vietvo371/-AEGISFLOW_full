import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
  ScrollView, TextInput, Animated, Image, Linking, Alert, PermissionsAndroid,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import MapboxGL from '@rnmapbox/maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme, cardStyles } from '../../theme';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { OPENMAP_STYLE_URL, ndaDirectionsURL } from '../../config/mapbox';
import env from '../../config/env';
import { mapService } from '../../services/mapService';
import { reportService } from '../../services/reportService';
import { MapReport, MapBounds } from '../../types/api/map';
import { incidentService, Incident } from '../../services/incidentService';
import { useTranslation } from '../../hooks/useTranslation';

MapboxGL.setAccessToken('');

// ─── Layer Types ─────────────────────────────────────────────
type LayerKey = 'alerts' | 'shelters' | 'flood_zones' | 'flood_points' | 'flood_streets';

const LAYER_CONFIGS: Array<{ key: LayerKey; label: string; color: string; icon: string }> = [
  { key: 'flood_zones',   label: 'Vùng ngập',     color: '#EF4444', icon: 'map-marker-radius' },
  { key: 'flood_streets', label: 'Đường ngập',    color: '#3B82F6', icon: 'waves' },
  { key: 'flood_points',  label: 'Điểm ngập',     color: '#3B82F6', icon: 'water' },
  { key: 'alerts',        label: 'Cảnh báo',       color: '#EF4444', icon: 'alert' },
  { key: 'shelters',      label: 'Trú ẩn',         color: '#16A34A', icon: 'home-heart' },
];

// ─── Constants ─────────────────────────────────────────────
const DA_NANG_CENTER: [number, number] = [108.2122, 16.0680];

const CITIZEN_CATEGORIES = [
  { id: -1, label: 'Tất cả', icon: 'view-grid-outline' },
  { id: 5, label: 'Ngập lụt', icon: 'weather-pouring', color: '#007AFF' },
  { id: 6, label: 'Khác', icon: 'alert-circle-outline', color: '#8E8E93' },
];

const EMERGENCY_CATEGORIES = [
  { id: -1, label: 'Tất cả', icon: 'view-grid-outline', color: '#7a5af8' },
  { id: 3, label: 'Camera', icon: 'cctv', color: '#06B6D4' },
  { id: 4, label: 'Tuần tra', icon: 'police-badge-outline', color: '#10B981' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#3B82F6',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng', high: 'Cao', medium: 'Trung bình', low: 'Thấp',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#EF4444',
  reported: '#EF4444',
  verified: '#3B82F6',
  responding: '#F59E0B',
  investigating: '#F59E0B',
  resolved: '#10B981',
  closed: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Mở',
  reported: 'Mới báo cáo',
  verified: 'Đã xác minh',
  responding: 'Đang ứng phó',
  investigating: 'Đang xử lý',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng',
};

const getCategoryColor = (id: number) => CITIZEN_CATEGORIES.find(c => c.id === id)?.color || '#8E8E93';

const getSeverityColor = (severity: string) => SEVERITY_COLORS[severity] || '#6B7280';

const FALLBACK_INCIDENT_IMAGES: Record<string, any> = {
  traffic: require('../../assets/images/started/map.jpg'),
  congestion: require('../../assets/images/started/map.jpg'),
  accident: require('../../assets/images/started/security.jpg'),
  construction: require('../../assets/images/started/community.jpg'),
  flood: require('../../assets/images/started/map.jpg'),
  heavy_rain: require('../../assets/images/started/map.jpg'),
  weather: require('../../assets/images/started/AiGreen.jpg'),
  environment: require('../../assets/images/started/community.jpg'),
  trash: require('../../assets/images/started/community.jpg'),
  fire: require('../../assets/images/started/security.jpg'),
  other: require('../../assets/images/started/welcome.jpg'),
};

const normalizeImageUrl = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    if (value.startsWith('http') || value.startsWith('file://') || value.startsWith('data:')) return value;
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${env.API_URL}${path}`;
  }
  if (typeof value === 'object') {
    return normalizeImageUrl(
      value.url ||
      value.uri ||
      value.thumbnail_url ||
      value.duong_dan_hinh_anh ||
      value.image_url ||
      value.path
    );
  }
  return null;
};

const getIncidentImageSources = (incident: Incident): any[] => {
  const payload = incident as any;
  const metadata = payload.metadata || {};
  const candidates = [
    payload.photo_urls,
    payload.image_urls,
    payload.images,
    payload.media,
    payload.hinh_anhs,
    metadata.photo_urls,
    metadata.image_urls,
    metadata.images,
    metadata.media,
    metadata.thumbnail_url,
    metadata.image_url,
  ].flat().filter(Boolean);

  const urls = Array.from(new Set(candidates.map(normalizeImageUrl).filter(Boolean))) as string[];
  if (urls.length > 0) {
    return urls.map(uri => ({ uri }));
  }

  return [FALLBACK_INCIDENT_IMAGES[incident.type] || FALLBACK_INCIDENT_IMAGES.other];
};

type ShelterRouteTarget = {
  id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
};

const isFiniteNumber = (value: any): value is number => typeof value === 'number' && Number.isFinite(value);
const isValidCoordinate = (coordinate: any): coordinate is [number, number] => (
  Array.isArray(coordinate) &&
  coordinate.length >= 2 &&
  isFiniteNumber(coordinate[0]) &&
  isFiniteNumber(coordinate[1])
);
const toCoordinate = (longitude: any, latitude: any): [number, number] | null => {
  const lng = Number(longitude);
  const lat = Number(latitude);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
};

const getFirstCoordinate = (geometry: any): [number, number] | null => {
  const coords = geometry?.coordinates;
  if (!Array.isArray(coords)) return null;
  if (isValidCoordinate(coords)) return coords;
  if (geometry?.type === 'LineString') {
    return coords.find(isValidCoordinate) || null;
  }
  return null;
};

const DANANG_BOUNDS = {
  minLng: 108.02,
  maxLng: 108.29,
  minLat: 15.82,
  maxLat: 16.16,
};

const DANANG_LAND_POLYGONS: [number, number][][] = [
  [
    [108.020, 15.820],
    [108.225, 15.820],
    [108.235, 16.065],
    [108.205, 16.092],
    [108.165, 16.120],
    [108.055, 16.155],
    [108.020, 16.155],
  ],
  [
    [108.205, 16.070],
    [108.235, 16.055],
    [108.285, 16.070],
    [108.292, 16.122],
    [108.255, 16.150],
    [108.215, 16.130],
    [108.195, 16.098],
  ],
  [
    [108.205, 15.850],
    [108.275, 15.850],
    [108.275, 16.070],
    [108.225, 16.070],
    [108.205, 15.980],
  ],
];

const DANANG_WATER_POLYGONS: [number, number][][] = [
  [
    [108.165, 16.082],
    [108.190, 16.086],
    [108.216, 16.098],
    [108.224, 16.109],
    [108.204, 16.119],
    [108.174, 16.107],
    [108.155, 16.091],
  ],
  [
    [108.168, 16.078],
    [108.190, 16.076],
    [108.210, 16.080],
    [108.224, 16.094],
    [108.216, 16.098],
    [108.190, 16.086],
    [108.165, 16.082],
  ],
];

const pointInPolygon = (lng: number, lat: number, polygon: [number, number][]): boolean => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lngI, latI] = polygon[i];
    const [lngJ, latJ] = polygon[j];
    const intersects = ((latI > lat) !== (latJ > lat))
      && (lng < ((lngJ - lngI) * (lat - latI)) / ((latJ - latI) || 1e-12) + lngI);

    if (intersects) inside = !inside;
  }

  return inside;
};

const isLikelyDaNangLand = (coordinate: any): coordinate is [number, number] => {
  if (!isValidCoordinate(coordinate)) return false;

  const [lng, lat] = coordinate;
  if (
    lng < DANANG_BOUNDS.minLng ||
    lng > DANANG_BOUNDS.maxLng ||
    lat < DANANG_BOUNDS.minLat ||
    lat > DANANG_BOUNDS.maxLat
  ) {
    return false;
  }

  if (DANANG_WATER_POLYGONS.some(polygon => pointInPolygon(lng, lat, polygon))) {
    return false;
  }

  return DANANG_LAND_POLYGONS.some(polygon => pointInPolygon(lng, lat, polygon));
};

const generateSafeArcRoute = (coords: [number, number][]): [number, number][] => {
  if (!coords || coords.length < 2) return coords;
  const start = coords[0];
  const end = coords[coords.length - 1];
  
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  
  const normalX = -dy;
  const normalY = dx;
  
  const bulgeFactor = 0.35; 
  const ctrlX = midX + normalX * bulgeFactor;
  const ctrlY = midY + normalY * bulgeFactor;
  
  const curve: [number, number][] = [];
  const segments = 20;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const t1 = 1 - t;
    const x = t1 * t1 * start[0] + 2 * t1 * t * ctrlX + t * t * end[0];
    const y = t1 * t1 * start[1] + 2 * t1 * t * ctrlY + t * t * end[1];
    curve.push([x, y]);
  }
  return curve;
};

// ─── Component ─────────────────────────────────────────────
const MapScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = route.params as { shelterRoute?: ShelterRouteTarget } | undefined;
  const isEmergency = route.name === 'SituationMap';
  const { isConnected, listen, subscribe, unsubscribe } = useWebSocket();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios'
    ? (insets.top > 0 ? insets.top : 47)
    : (insets.top > 0 ? insets.top : (StatusBar.currentHeight || 24));

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
  const [floodReportsGeoJSON, setFloodReportsGeoJSON] = useState<any>(null);
  const [shelters, setShelters] = useState<any[]>([]);
  const [mapIncidents, setMapIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<any>(null);
  const [mapIcons, setMapIcons] = useState<Record<string, any>>({});
  const [showLayers, setShowLayers] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(
    new Set(['alerts', 'shelters', 'flood_zones', 'flood_streets', 'flood_points'] as LayerKey[])
  );
  const [locating, setLocating] = useState(false);
  const [activeShelterRoute, setActiveShelterRoute] = useState<ShelterRouteTarget | null>(null);
  const [realRouteGeoJSON, setRealRouteGeoJSON] = useState<any>(null);
  const [safeRouteGeoJSON, setSafeRouteGeoJSON] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const routeOffset = activeShelterRoute ? 80 : 0;

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const layerPanelAnim = useRef(new Animated.Value(300)).current;
  const mapFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Location Permission Request ─────────────────────────────
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        return auth === 'granted';
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Quyền truy cập vị trí',
            message: 'AegisFlow AI cần truy cập vị trí của bạn để hiển thị trên bản đồ.',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Hủy',
            buttonPositive: 'Đồng ý',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  useEffect(() => {
    requestLocationPermission().then(granted => {
      if (granted) {
        Geolocation.getCurrentPosition(
          position => {
            setUserLocation([position.coords.longitude, position.coords.latitude]);
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }
    });
  }, []);

  // ─── Layer Toggle ───────────────────────────────────────────
  const toggleLayer = (key: LayerKey) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleLayerPanel = () => {
    const toValue = showLayers ? 300 : 0;
    Animated.spring(layerPanelAnim, {
      toValue,
      tension: 100,
      friction: 12,
      useNativeDriver: true,
    }).start();
    setShowLayers(!showLayers);
  };

  // ─── Icon Generation ─────────────────────────────────────
  useEffect(() => {
    const iconDefs = [
      { key: 'icon_flood', name: 'home-flood', color: '#0284C7' },
      { key: 'icon_heavy_rain', name: 'weather-pouring', color: '#2563EB' },
      { key: 'icon_landslide', name: 'slope-downhill', color: '#D97706' },
      { key: 'icon_dam_failure', name: 'waves', color: '#4F46E5' },
      { key: 'icon_camera', name: 'cctv', color: '#06B6D4' },
      { key: 'icon_patrol', name: 'police-badge-outline', color: '#10B981' },
      { key: 'icon_traffic', name: 'road-variant', color: '#F97316' },
      { key: 'icon_environment', name: 'tree-outline', color: '#10B981' },
      { key: 'icon_fire', name: 'fire', color: '#EF4444' },
      { key: 'icon_trash', name: 'trash-can-outline', color: '#8B6F4E' },
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

      const [reportResult, floodReportResult] = await Promise.allSettled([
        mapService.getMapReports(mapBounds, filters),
        selectedCategory === -1 || selectedCategory === 5
          ? mapService.getFloodReports(mapBounds)
          : Promise.resolve({ type: 'FeatureCollection', features: [] }),
      ]);

      if (floodReportResult.status === 'fulfilled') {
        setFloodReportsGeoJSON(floodReportResult.value);
      } else {
        setFloodReportsGeoJSON({ type: 'FeatureCollection', features: [] });
      }

      const response = reportResult.status === 'fulfilled' ? reportResult.value : null;
      if (response?.success && response.data) {
        const geojson = response.data as any;
        if (geojson.type === 'FeatureCollection' && geojson.features) {
          setMapReports(geojson.features
            .filter((f: any) => isLikelyDaNangLand(f.geometry?.coordinates))
            .map((f: any) => ({
              id: f.properties.id,
              tieu_de: f.properties.tieu_de || f.properties.title,
              danh_muc: f.properties.danh_muc || 5,
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
      } else {
        setMapReports([]);
      }
    } catch (e) {
      console.warn('Network error when fetching map data:', e);
      setMapReports([]);
      setFloodReportsGeoJSON({ type: 'FeatureCollection', features: [] });
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
      if (traffic.status === 'fulfilled' && traffic.value?.type === 'FeatureCollection') {
        setTrafficGeoJSON(traffic.value);
      }
      
      if (flood.status === 'fulfilled' && flood.value) {
        setFloodZonesGeoJSON(flood.value);
      }
      
      if (shelterRes.status === 'fulfilled' && (shelterRes.value as any)?.success) {
        setShelters((shelterRes.value as any).data || []);
      }
    } catch (e) {
      console.warn('Error fetching map layers:', e);
    }
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

  useEffect(() => {
    const target = routeParams?.shelterRoute;
    const destination = target ? toCoordinate(target.longitude, target.latitude) : null;
    if (!target || !destination) return;

    setActiveShelterRoute(target);
    setActiveLayers(prev => new Set([...prev, 'shelters']));

    if (cameraRef.current) {
      const origin = isValidCoordinate(userLocation) ? userLocation : DA_NANG_CENTER;
      const center: [number, number] = [
        (origin[0] + destination[0]) / 2,
        (origin[1] + destination[1]) / 2,
      ];

      cameraRef.current.setCamera({
        centerCoordinate: center,
        zoomLevel: 13,
        animationDuration: 900,
      });
    }
  }, [routeParams?.shelterRoute, userLocation]);

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
  const showSheet = selectedReport || selectedIncident || selectedShelter;

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
      setSelectedShelter(null);
      setReportDetail(null);
    });
  };

  // ─── Fetch real route from NDA API ──────────────────────────
  useEffect(() => {
    if (!activeShelterRoute) {
      setRealRouteGeoJSON(null);
      return;
    }
    const dest = toCoordinate(activeShelterRoute.longitude, activeShelterRoute.latitude);
    if (!dest) { setRealRouteGeoJSON(null); return; }

    const origin: [number, number] = isValidCoordinate(userLocation)
      ? [userLocation![0], userLocation![1]]
      : [108.2122, 16.0680];

    const isFlooded = (coords: [number, number][]) => {
      if (!floodZonesGeoJSON || !floodZonesGeoJSON.features) return false;
      // Kiểm tra mỗi điểm thứ 3 để tối ưu hiệu năng
      for (let i = 0; i < coords.length; i += 3) {
        const [lng, lat] = coords[i];
        for (const f of floodZonesGeoJSON.features) {
          if (f.geometry?.type === 'Polygon') {
            if (pointInPolygon(lng, lat, f.geometry.coordinates[0])) return true;
          } else if (f.geometry?.type === 'MultiPolygon') {
            for (const poly of f.geometry.coordinates) {
              if (pointInPolygon(lng, lat, poly[0])) return true;
            }
          }
        }
      }
      return false;
    };

    const runSafeRouting = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson&alternatives=true`;
        const res = await fetch(url);
        const data = await res.json();
        
        const coords = data?.routes?.[0]?.geometry?.coordinates
          || data?.route?.geometry?.coordinates
          || data?.paths?.[0]?.points?.coordinates
          || null;

        if (!coords || coords.length < 2) {
          // Fallback đường thẳng
          setRealRouteGeoJSON({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: `route_${activeShelterRoute.id}`,
              properties: { name: activeShelterRoute.name },
              geometry: { type: 'LineString', coordinates: [origin, dest] },
            }],
          });
          const safeCoords = generateSafeArcRoute([origin, dest]);
          setSafeRouteGeoJSON({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: `safe_route_${activeShelterRoute.id}`,
              properties: { name: 'Tuyến an toàn vòng cung (AI)' },
              geometry: { type: 'LineString', coordinates: safeCoords },
            }],
          });
          return;
        }

        // Set route ngắn nhất (nguy hiểm)
        setRealRouteGeoJSON({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: `route_${activeShelterRoute.id}`,
            properties: { name: activeShelterRoute.name },
            geometry: { type: 'LineString', coordinates: coords },
          }],
        });

        const setSafe = (safeCoords: [number, number][]) => {
          setSafeRouteGeoJSON({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: `safe_route_${activeShelterRoute.id}`,
              properties: { name: 'Tuyến an toàn vòng cung (AI)' },
              geometry: { type: 'LineString', coordinates: safeCoords },
            }],
          });
        };

        // Nếu tuyến thay thế OSRM an toàn thì dùng luôn
        let altCoords = data?.routes?.[1]?.geometry?.coordinates;
        if (altCoords && altCoords.length >= 2 && !isFlooded(altCoords)) {
          return setSafe(altCoords);
        }

        // AI Probing: Tìm đường vòng với bán kính tăng dần để tìm lộ trình an toàn ngắn nhất
        const dx = dest[0] - origin[0];
        const dy = dest[1] - origin[1];
        
        const candidates = [
          // Lách nhẹ 10%
          [(origin[0] + dest[0])/2 + dy * 0.1, (origin[1] + dest[1])/2 - dx * 0.1],
          [(origin[0] + dest[0])/2 - dy * 0.1, (origin[1] + dest[1])/2 + dx * 0.1],
          // Vòng vừa 20%
          [(origin[0] + dest[0])/2 + dy * 0.2, (origin[1] + dest[1])/2 - dx * 0.2],
          [(origin[0] + dest[0])/2 - dy * 0.2, (origin[1] + dest[1])/2 + dx * 0.2],
          // Vòng trung bình 35%
          [(origin[0] + dest[0])/2 + dy * 0.35, (origin[1] + dest[1])/2 - dx * 0.35],
          [(origin[0] + dest[0])/2 - dy * 0.35, (origin[1] + dest[1])/2 + dx * 0.35],
          // Vòng xa 50%
          [(origin[0] + dest[0])/2 + dy * 0.5, (origin[1] + dest[1])/2 - dx * 0.5],
          [(origin[0] + dest[0])/2 - dy * 0.5, (origin[1] + dest[1])/2 + dx * 0.5],
        ];

        for (const mid of candidates) {
          const r2 = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${mid[0]},${mid[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson`);
          const d2 = await r2.json();
          const sc = d2?.routes?.[0]?.geometry?.coordinates;
          if (sc && sc.length >= 2 && !isFlooded(sc)) {
            return setSafe(sc);
          }
        }

        // Nếu vẫn không né được (vùng ngập quá to), chọn tạm ứng viên đầu tiên
        const bestEffort = candidates[0];
        const r3 = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${bestEffort[0]},${bestEffort[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson`);
        const d3 = await r3.json();
        const fallbackSc = d3?.routes?.[0]?.geometry?.coordinates || generateSafeArcRoute(coords);
        setSafe(fallbackSc);

      } catch (e) {
        // Lỗi mạng fallback đường thẳng
        setRealRouteGeoJSON({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: `route_${activeShelterRoute.id}`,
            properties: {},
            geometry: { type: 'LineString', coordinates: [origin, dest] },
          }],
        });
        setSafeRouteGeoJSON({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            id: `safe_route_${activeShelterRoute.id}`,
            properties: { name: 'Tuyến an toàn vòng cung (AI)' },
            geometry: { type: 'LineString', coordinates: generateSafeArcRoute([origin, dest]) },
          }],
        });
      }
    };

    runSafeRouting();
  }, [activeShelterRoute, userLocation, floodZonesGeoJSON]);

  // ─── Handlers ────────────────────────────────────────────
  const centerUserLocation = async () => {
    if (!userLocation || typeof userLocation[0] !== 'number' || typeof userLocation[1] !== 'number') {
      setLocating(true);
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        Geolocation.getCurrentPosition(
          position => {
            const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
            setUserLocation(coords);
            if (cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: coords,
                zoomLevel: 15,
                animationDuration: 1000
              });
            }
            setLocating(false);
          },
          error => {
            console.warn(error);
            setLocating(false);
            Alert.alert('Không thể xác định vị trí', 'Vui lòng kiểm tra dịch vụ định vị trên thiết bị.');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        setLocating(false);
      }
      return;
    }
    if (cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: userLocation as [number, number], zoomLevel: 15, animationDuration: 1000 });
      setLocating(false);
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    const query = text.toLowerCase();
    const results: any[] = [];

    // 1. Search in shelters
    shelters.forEach(s => {
      if ((s.ten_diem && s.ten_diem.toLowerCase().includes(query)) || 
          (s.dia_chi && s.dia_chi.toLowerCase().includes(query))) {
        results.push({
          id: `shelter_${s.id}`,
          type: 'shelter',
          title: s.ten_diem,
          subtitle: s.dia_chi || 'Điểm trú ẩn sơ tán',
          coordinates: [parseFloat(s.longitude), parseFloat(s.latitude)],
          raw: s,
        });
      }
    });

    // 2. Search in mapIncidents
    mapIncidents.forEach(inc => {
      const coordinate = toCoordinate(inc.location?.lng, inc.location?.lat);
      if (!coordinate || !isLikelyDaNangLand(coordinate)) return;

      if ((inc.title && inc.title.toLowerCase().includes(query)) || 
          (inc.description && inc.description.toLowerCase().includes(query)) ||
          (inc.location_name && inc.location_name.toLowerCase().includes(query))) {
        results.push({
          id: `incident_${inc.id}`,
          type: 'incident',
          title: inc.title,
          subtitle: inc.location_name || 'Sự cố khẩn cấp',
          coordinates: coordinate,
          raw: inc,
        });
      }
    });

    // 3. Search in mapReports
    mapReports.forEach(r => {
      const report = r as MapReport & { dia_chi?: string };
      if ((report.tieu_de && report.tieu_de.toLowerCase().includes(query)) || 
          (report.dia_chi && report.dia_chi.toLowerCase().includes(query))) {
        results.push({
          id: `report_${report.id}`,
          type: 'report',
          title: report.tieu_de,
          subtitle: report.dia_chi || 'Báo cáo từ người dân',
          coordinates: [report.kinh_do, report.vi_do],
          raw: report,
        });
      }
    });

    // 4. Removed mock streets

    setSearchResults(results.slice(0, 10));
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (item: any) => {
    setShowSuggestions(false);
    setSearchQuery(item.title);

    if (cameraRef.current && item.coordinates) {
      cameraRef.current.setCamera({
        centerCoordinate: item.coordinates as [number, number],
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }

    if (item.type === 'report') {
      handleMarkerSelect(item.raw);
    } else if (item.type === 'incident') {
      setSelectedIncident(item.raw);
      setSelectedReport(null);
    } else if (item.type === 'shelter') {
      const s = item.raw;
      setTimeout(() => {
        Alert.alert(
          s.ten_diem || 'Điểm trú ẩn',
          `Địa chỉ: ${s.dia_chi || 'Không rõ'}\nSức chứa: ${s.hien_tai || 0}/${s.suc_chua || 0} người\nTrạng thái: ${s.tinh_trang === 'full' ? 'Đầy' : s.tinh_trang === 'limited' ? 'Hạn chế' : 'Còn chỗ'}`
        );
      }, 500);
    } else if (item.type === 'street') {
      Alert.alert(
        item.title,
        `Trạng thái: Tuyến đường đang ngập nước\nĐộ sâu: ${item.raw.properties.depth}\nMức độ rủi ro: ${item.raw.properties.level === 'High' ? 'Cao (Nguy hiểm)' : item.raw.properties.level === 'Medium' ? 'Trung bình' : 'Thấp'}`
      );
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleMarkerSelect = (report: MapReport) => {
    setSelectedReport(report);
    setSelectedIncident(null);
    setSelectedShelter(null);
    setReportDetail(null);
    setLoadingDetail(true);
    reportService.getReportDetail(report.id)
      .then(res => { if (res.success) setReportDetail(res.data); })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  };

  const handleFloodReportSelect = (feature: any) => {
    const props = feature?.properties || {};
    const coordinate = getFirstCoordinate(feature?.geometry);
    if (!coordinate) return;

    setSelectedReport({
      id: Number(props.id),
      tieu_de: props.street_name || props.address || 'Điểm ngập',
      danh_muc: 5,
      danh_muc_text: props.flood_type === 'street' ? 'Đường ngập' : 'Điểm ngập',
      trang_thai: 2,
      uu_tien: Number(props.water_level_cm) >= 75 ? 4 : Number(props.water_level_cm) >= 50 ? 3 : 2,
      marker_color: props.color || '#3B82F6',
      kinh_do: coordinate[0],
      vi_do: coordinate[1],
      nguoi_dung: props.source || 'Dữ liệu ngập',
    } as MapReport);
    setReportDetail({
      id: Number(props.id),
      is_flood_report: true,
      title: props.street_name || props.address || 'Điểm ngập',
      mo_ta: props.description || [
        props.water_level_cm ? `Mực nước: ${props.water_level_cm} cm` : null,
        props.ward_name,
        props.district_name,
      ].filter(Boolean).join(' · '),
      dia_chi: props.address,
      hinh_anhs: props.image_urls || [],
      water_level_cm: props.water_level_cm,
      district_name: props.district_name,
      ward_name: props.ward_name,
      reported_at: props.reported_at,
      image_urls: props.image_urls,
      flood_type: props.flood_type,
    });
    setSelectedIncident(null);
    setSelectedShelter(null);
    setLoadingDetail(false);
  };

  // ─── GeoJSON Features ───────────────────────────────────
  const getFeatures = () => {
    if (!isEmergency) {
      return mapReports
        .filter(r => {
          if (!isLikelyDaNangLand([r.kinh_do, r.vi_do])) return false;
          if (r.danh_muc === 5) {
            return activeLayers.has('flood_points');
          }
          return activeLayers.has('alerts');
        })
        .map(r => ({
          type: 'Feature' as const,
          id: r.id.toString(),
          geometry: { type: 'Point' as const, coordinates: [r.kinh_do, r.vi_do] },
          properties: { ...r, _isIncident: false },
        }));
    }

    let features: any[] = [];
    let incidents = mapIncidents;
    if (selectedCategory === 1) incidents = mapIncidents.filter(i => (i.type as string) === 'congestion');
    else if (selectedCategory === 2) incidents = mapIncidents.filter(i => (i.type as string) !== 'congestion');

    if (selectedCategory === -1 || selectedCategory <= 2) {
      if (activeLayers.has('alerts')) {
        features.push(...incidents.flatMap(inc => {
          const coordinate = toCoordinate(inc.location?.lng, inc.location?.lat);
          if (!coordinate || !isLikelyDaNangLand(coordinate)) return [];

          return [{
            type: 'Feature',
            id: inc.id.toString(),
            geometry: { type: 'Point', coordinates: coordinate },
            properties: {
              ...inc, _isIncident: true,
              _severityColor: SEVERITY_COLORS[inc.severity] || '#10B981',
              _isCritical: inc.severity === 'critical' ? 1 : 0,
            },
          }];
        }));
      }
    }
    return features;
  };

  // ─── Shelter Features ────────────────────────────────────
  const getShelterFeatures = () => {
    return shelters
      .flatMap(s => {
        const coordinate = toCoordinate(s.longitude, s.latitude);
        if (!coordinate || !isLikelyDaNangLand(coordinate)) return [];

        const statusRaw = s.status || s.tinh_trang;
        const color = statusRaw === 'full' ? '#EF4444' : statusRaw === 'limited' ? '#F59E0B' : '#10B981';

        return [{
          type: 'Feature' as const,
          id: `shelter_${s.id}`,
          geometry: { type: 'Point' as const, coordinates: coordinate },
          properties: {
            ...s,
            _isShelter: true,
            _icon: 'icon_shelter',
            _color: color,
          },
        }];
      });
  };

  const getShelterRouteGeoJSON = () => realRouteGeoJSON;

  const shelterRouteGeoJSON = getShelterRouteGeoJSON();

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
        onRegionDidChange={() => {
          if (!mapLoaded) return;
          if (mapFetchTimer.current) clearTimeout(mapFetchTimer.current);
          mapFetchTimer.current = setTimeout(fetchMapReports, 450);
        }}
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

        {/* Shortest Route (Dangerous/Flooded) */}
        {realRouteGeoJSON && (
          <MapboxGL.ShapeSource id="shortestRouteSource" shape={realRouteGeoJSON}>
            <MapboxGL.LineLayer
              id="shortestRouteLine"
              style={{
                lineColor: '#EF4444',
                lineWidth: 4,
                lineOpacity: 0.6,
                lineDasharray: [2, 2],
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* AI Safe Route */}
        {safeRouteGeoJSON && (
          <MapboxGL.ShapeSource id="safeRouteSource" shape={safeRouteGeoJSON}>
            <MapboxGL.LineLayer
              id="safeRouteShadow"
              style={{
                lineColor: '#ffffff',
                lineWidth: 9,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <MapboxGL.LineLayer
              id="safeRouteLine"
              style={{
                lineColor: '#10B981',
                lineWidth: 5,
                lineOpacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                lineDasharray: [1.2, 1.2],
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Traffic Lines Layer is removed to focus strictly on flood prevention */}

        {/* Flood Zones */}
        {floodZonesGeoJSON && (
          <MapboxGL.ShapeSource id="floodZonesSource" shape={floodZonesGeoJSON}>
            <MapboxGL.FillLayer
              id="floodZonesFill"
              visible={activeLayers.has('flood_zones')}
              style={{
                fillColor: ['match', ['get', 'risk_level'], 'High', '#EF4444', 'Medium', '#F59E0B', 'Low', '#3B82F6', '#3B82F6'] as any,
                fillOpacity: 0.35,
              }}
            />
            <MapboxGL.LineLayer
              id="floodZonesOutline"
              visible={activeLayers.has('flood_zones')}
              style={{
                lineColor: ['match', ['get', 'risk_level'], 'High', '#B91C1C', 'Medium', '#B45309', 'Low', '#1D4ED8', '#1D4ED8'] as any,
                lineWidth: 2,
                lineDasharray: [2, 2],
              }}
            />
            <MapboxGL.SymbolLayer
              id="floodZonesLabel"
              visible={activeLayers.has('flood_zones')}
              style={{
                textField: [
                  'format', 
                  'Vùng ngập ', 
                  ['match', ['get', 'risk_level'], 'High', 'Cao', 'Medium', 'Trung bình', 'Low', 'Thấp', 'Thấp']
                ],
                textSize: 12,
                textColor: '#ffffff',
                textHaloColor: ['match', ['get', 'risk_level'], 'High', '#B91C1C', 'Medium', '#B45309', 'Low', '#1D4ED8', '#1D4ED8'] as any,
                textHaloWidth: 1.5,
                textAnchor: 'center',
                textAllowOverlap: false,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Real flood reports: historical point floods and flooded streets */}
        {floodReportsGeoJSON && (
          <MapboxGL.ShapeSource
            id="floodReportsSource"
            shape={floodReportsGeoJSON}
            onPress={(e) => {
              const feature = e.features?.[0];
              if (feature) handleFloodReportSelect(feature);
            }}
          >
            <MapboxGL.LineLayer
              id="floodReportStreets"
              filter={['==', ['geometry-type'], 'LineString']}
              visible={activeLayers.has('flood_streets')}
              style={{
                lineColor: ['coalesce', ['get', 'color'], '#3B82F6'] as any,
                lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4] as any,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <MapboxGL.CircleLayer
              id="floodReportPoints"
              filter={['==', ['geometry-type'], 'Point']}
              visible={activeLayers.has('flood_points')}
              style={{
                circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 10] as any,
                circleColor: ['coalesce', ['get', 'color'], '#3B82F6'] as any,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
                circleOpacity: 0.95,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Shelter Markers */}
        {shelters.length > 0 && (
          <MapboxGL.ShapeSource
            id="sheltersSource"
            shape={{ type: 'FeatureCollection', features: getShelterFeatures() }}
            onPress={(e) => {
              const f = e.features[0];
              if (f?.properties) {
                setSelectedShelter(f.properties);
                setSelectedIncident(null);
                setSelectedReport(null);
              }
            }}
          >
            <MapboxGL.CircleLayer
              id="shelterCircles"
              visible={activeLayers.has('shelters')}
              style={{
                circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 13] as any,
                circleColor: ['get', '_color'] as any,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
                circleOpacity: 0.95,
              }}
            />
            <MapboxGL.SymbolLayer
              id="shelterIcons"
              visible={activeLayers.has('shelters')}
              style={{
                iconImage: 'icon_shelter',
                iconSize: 0.45,
                iconAllowOverlap: true,
                iconAnchor: 'center',
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
              visible={activeLayers.has('alerts')}
              style={{ circleRadius: 22, circleColor: 'transparent', circleStrokeWidth: 3, circleStrokeColor: '#EF444480' }}
            />
          ) : (
            <MapboxGL.CircleLayer id="criticalRingPlaceholder" style={{ circleRadius: 0, circleOpacity: 0 }} />
          )}
          <MapboxGL.CircleLayer
            id="markerCircles"
            visible={activeLayers.has('alerts') || activeLayers.has('flood_points')}
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
            visible={activeLayers.has('alerts') || activeLayers.has('flood_points')}
            style={{
              iconImage: isEmergency
                ? (['match', ['get', 'type'], 'flood', 'icon_flood', 'heavy_rain', 'icon_heavy_rain', 'landslide', 'icon_landslide', 'dam_failure', 'icon_dam_failure', 'camera', 'icon_camera', 'patrol', 'icon_patrol', 'icon_default'] as any)
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
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </View>
      )}

      {/* Header overlay */}
      <View style={[styles.headerOverlay, { paddingTop: topInset }]} pointerEvents="box-none">
        <View style={styles.searchRow} pointerEvents="box-none">
          <View style={styles.searchBar}>
            <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('citizen.map.searchPlace', 'Tìm kiếm địa điểm, sự cố...')}
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearchTextChange}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={handleClearSearch} style={{ marginRight: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={fetchMapReports} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="refresh" size={20} color={isEmergency ? '#EF4444' : theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {showSuggestions && searchResults.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView 
                keyboardShouldPersistTaps="handled" 
                style={styles.suggestionsScroll}
                contentContainerStyle={styles.suggestionsContent}
              >
                {searchResults.map((item) => {
                  const getIcon = () => {
                    switch (item.type) {
                      case 'shelter': return 'home-heart';
                      case 'incident': return 'alert-decagram';
                      case 'report': return 'file-document-outline';
                      case 'street': return 'water-outline';
                      default: return 'map-marker';
                    }
                  };
                  const getIconColor = () => {
                    switch (item.type) {
                      case 'shelter': return '#10B981';
                      case 'incident': return '#EF4444';
                      case 'report': return '#3B82F6';
                      case 'street': return '#0284C7';
                      default: return theme.colors.textSecondary;
                    }
                  };
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <View style={[styles.suggestionIconBg, { backgroundColor: getIconColor() + '12' }]}>
                        <Icon name={getIcon()} size={16} color={getIconColor()} />
                      </View>
                      <View style={styles.suggestionTextWrap}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={16} color={theme.colors.border} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {activeShelterRoute && (
          <View style={styles.routeBanner}>
            <View style={styles.routeBannerIcon}>
              <Icon name="navigation-variant" size={18} color={theme.colors.white} />
            </View>
            <View style={styles.routeBannerTextWrap}>
              <Text style={styles.routeBannerTitle} numberOfLines={1}>
                Đang dẫn tới {activeShelterRoute.name}
              </Text>
              {!!activeShelterRoute.address && (
                <Text style={styles.routeBannerSub} numberOfLines={1}>
                  {activeShelterRoute.address}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon name="shield-check" size={14} color="#10B981" />
                <Text style={{ fontSize: 12, color: '#10B981', marginLeft: 4, fontWeight: '700' }}>
                  Tuyến vòng cung an toàn (AI)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.routeBannerClose}
              onPress={() => setActiveShelterRoute(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filterScrollView, activeShelterRoute && styles.filterScrollViewWithRoute]}
          contentContainerStyle={styles.filterRow}
        >
          {(isEmergency ? EMERGENCY_CATEGORIES : CITIZEN_CATEGORIES).map(cat => {
            const getCategoryLabel = (c: any) => {
              if (c.id === -1) return t('common.all');
              if (isEmergency) {
                switch (c.id) {
                  case 1: return t('incidents.type.congestion', 'Congestion');
                  case 2: return t('incidents.type.accident', 'Accident');
                  case 3: return t('mapLayers.cameras', 'Cameras');
                  case 4: return t('mapLayers.patrols', 'Patrols');
                  default: return c.label;
                }
              } else {
                switch (c.id) {
                  case 1: return t('mapLayers.traffic', 'Traffic');
                  case 2: return t('reports.categories.environment', 'Environment');
                  case 3: return t('reports.categories.fire', 'Fire');
                  case 4: return t('reports.categories.waste', 'Waste');
                  case 5: return t('reports.categories.flood', 'Flood');
                  case 6: return t('reports.categories.other', 'Other');
                  default: return c.label;
                }
              }
            };
            const isActive = selectedCategory === cat.id;
            const color = cat.color || theme.colors.primary;
            const count = isEmergency
              ? (cat.id === -1 ? mapIncidents.length
                : cat.id === 1 ? mapIncidents.filter(i => (i.type as string) === 'congestion').length
                : cat.id === 2 ? mapIncidents.filter(i => (i.type as string) !== 'congestion').length
                : 0)
              : (cat.id === -1 ? mapReports.length : mapReports.filter(r => r.danh_muc === cat.id).length);

            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Icon name={cat.icon} size={14} color={isActive ? '#fff' : color} />
                <Text style={[styles.chipText, { color: isActive ? '#fff' : color }]}>{getCategoryLabel(cat)}</Text>
                {count > 0 && cat.id !== -1 && (
                  <View style={[styles.chipBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : color + '20' }]}>
                    <Text style={[styles.chipBadgeText, { color: isActive ? '#fff' : color }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* GPS FAB */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity style={styles.fab} onPress={centerUserLocation}>
          <Icon name="crosshairs-gps" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Layer Controls - Top Right */}
      <View style={[styles.layerControlsContainer, { top: topInset + 90 + routeOffset, zIndex: 99 }]} pointerEvents="box-none">
        {/* Locate Button */}
        <TouchableOpacity style={styles.layerBtn} onPress={centerUserLocation}>
          <Icon name="crosshairs-gps" size={20} color={locating ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity style={styles.layerBtn} onPress={fetchMapReports}>
          <Icon name="refresh" size={20} color={loading ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Layers Toggle Button */}
        <TouchableOpacity style={styles.layerBtn} onPress={toggleLayerPanel}>
          <Icon name="layers" size={20} color={showLayers ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Legend Toggle Button */}
        <TouchableOpacity style={styles.legendBtn} onPress={() => setShowLegend(!showLegend)}>
          <Icon name="map-marker" size={18} color={showLegend ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={styles.legendBtnText}>{t('citizen.map.legend', 'Legend')}</Text>
        </TouchableOpacity>
      </View>

      {/* Layer Panel */}
      <Animated.View
        style={[
          styles.layerPanel,
          {
            top: topInset + 90,
            zIndex: 100,
            transform: [{ translateX: layerPanelAnim }]
          }
        ]}
        pointerEvents={showLayers ? "auto" : "none"}
      >
        <View style={styles.layerPanelHeader}>
          <Icon name="layers" size={14} color={theme.colors.primary} />
          <Text style={styles.layerPanelTitle}>{t('citizen.map.layers', 'Map Layers')}</Text>
          <TouchableOpacity onPress={toggleLayerPanel} style={styles.layerPanelClose}>
            <Icon name="close" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {LAYER_CONFIGS.map(cfg => {
          const isActive = activeLayers.has(cfg.key);
          return (
            <TouchableOpacity
              key={cfg.key}
              style={styles.layerItem}
              onPress={() => toggleLayer(cfg.key)}
            >
              <Icon name={cfg.icon} size={18} color={isActive ? cfg.color : theme.colors.textTertiary} />
              <Text style={[styles.layerItemLabel, { color: isActive ? theme.colors.text : theme.colors.textTertiary }]}>
                {cfg.key === 'flood_zones' ? t('citizen.map.floodZones') :
                 cfg.key === 'flood_streets' ? t('citizen.map.floodStreets') :
                 cfg.key === 'flood_points' ? t('citizen.map.floodPoints') :
                 cfg.key === 'alerts' ? t('citizen.map.activeAlerts', 'Alerts') :
                 cfg.key === 'shelters' ? t('citizen.map.shelters') :
                 cfg.label}
              </Text>
              <View style={[
                styles.layerToggle,
                { backgroundColor: isActive ? theme.colors.primary : theme.colors.border }
              ]}>
                <View style={[
                  styles.layerToggleDot,
                  { transform: [{ translateX: isActive ? 12 : 2 }] }
                ]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Legend Panel */}
      {showLegend && (
        <Animated.View style={styles.legendPanel}>
          <Text style={styles.legendTitle}>{t('citizen.map.legend', 'LEGEND').toUpperCase()}</Text>
          <View style={styles.legendContent}>
            {/* Severity levels */}
            <View style={styles.legendSection}>
              <Text style={styles.legendSectionTitle}>{t('reports.severity', 'Severity')}</Text>
              {[
                { color: '#EF4444', key: 'critical' },
                { color: '#F97316', key: 'high' },
                { color: '#F59E0B', key: 'medium' },
                { color: '#3B82F6', key: 'low' },
              ].map(item => (
                <View key={item.color} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendItemText}>{t(`incidents.severity.${item.key}`)}</Text>
                </View>
              ))}
            </View>

            {/* Layer types */}
            <View style={styles.legendSection}>
              <Text style={styles.legendSectionTitle}>{t('priorityRoute.hotspotType', 'Object Type')}</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.legendItemText}>{t('citizen.map.shelters')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendLine} />
                <Text style={styles.legendItemText}>{t('citizen.map.floodStreets')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendItemText}>{t('citizen.map.floodPoints')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

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
            ) : selectedShelter ? (
              <ShelterSheet
                shelter={selectedShelter}
                onClose={handleCloseSheet}
                onNavigate={() => { 
                  handleCloseSheet(); 
                  setActiveShelterRoute({
                    id: selectedShelter.id,
                    name: selectedShelter.name || selectedShelter.ten_diem || 'Điểm trú ẩn',
                    address: selectedShelter.address || selectedShelter.dia_chi || '',
                    latitude: Number(selectedShelter.latitude),
                    longitude: Number(selectedShelter.longitude),
                  });
                }}
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
              {detail.hinh_anhs.map((img: any) => {
                const uri = normalizeImageUrl(img);
                return uri ? (
                  <Image key={img.id || uri} source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ) : null;
              })}
            </ScrollView>
          )}

          {detail.dia_chi && (
            <View style={styles.infoRow}>
              <Icon name="map-marker" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{detail.dia_chi}</Text>
            </View>
          )}

          {detail.water_level_cm != null && (
            <View style={styles.infoRow}>
              <Icon name="waves" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.infoText}>Mực nước: {detail.water_level_cm} cm</Text>
            </View>
          )}

          {(detail.ward_name || detail.district_name) && (
            <View style={styles.infoRow}>
              <Icon name="map-marker-radius" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {[detail.ward_name, detail.district_name].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {!detail.is_flood_report && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate(report.id)}>
              <Icon name="information-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.actionBtnText}>Xem chi tiết</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : null}
    </>
  );
};

// ─── Incident Bottom Sheet ─────────────────────────────────
const IncidentSheet = ({ incident, onClose, onNavigate }: {
  incident: Incident; onClose: () => void; onNavigate: (id: number) => void;
}) => {
  const { t } = useTranslation();
  const sevColor = getSeverityColor(incident.severity);
  const sevLabel = t(`incidents.severity.${incident.severity}`) || SEVERITY_LABELS[incident.severity] || incident.severity || 'Thấp';
  const statColor = STATUS_COLORS[incident.status] || '#6B7280';
  const statLabel = t(`incidents.${incident.status}`) || STATUS_LABELS[incident.status] || incident.status || 'Mở';
  const imageSources = getIncidentImageSources(incident);

  const handleCallEmergency = () => {
    Linking.openURL('tel:113');
  };

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.incidentMediaScroll}>
        {imageSources.map((source, index) => (
          <Image
            key={`${incident.id}-image-${index}`}
            source={source}
            style={styles.incidentHeroImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: sevColor + '18', borderWidth: 1, borderColor: sevColor + '40' }]}>
          <Icon name="alert" size={12} color={sevColor} />
          <Text style={[styles.badgeText, { color: sevColor }]}>{sevLabel.toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statColor + '15' }]}>
          <View style={[styles.dot, { backgroundColor: statColor }]} />
          <Text style={[styles.badgeText, { color: statColor }]}>{statLabel}</Text>
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
        <TouchableOpacity
          style={[styles.actionBtnOutline, { borderColor: theme.colors.border }]}
          onPress={handleCallEmergency}
        >
          <Icon name="phone" size={18} color="#EF4444" />
          <Text style={[styles.actionBtnOutlineText, { color: '#EF4444' }]}>Gọi khẩn cấp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate(incident.id)}>
          <Icon name="shield-alert-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Chi tiết sự cố</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

// ─── Shelter Bottom Sheet ─────────────────────────────────
const ShelterSheet = ({ shelter, onClose, onNavigate }: {
  shelter: any; onClose: () => void; onNavigate: () => void;
}) => {
  const name = shelter.name || shelter.ten_diem || 'Điểm trú ẩn';
  const address = shelter.address || shelter.dia_chi || 'Không rõ';
  const capacity = shelter.capacity || shelter.suc_chua || 0;
  const available = shelter.available_beds ?? shelter.hien_tai ?? 0;
  const statusRaw = shelter.status || shelter.tinh_trang;
  const isFull = statusRaw === 'full';
  
  const statusColor = isFull ? '#EF4444' : '#10B981';
  const statusText = isFull ? 'Đầy' : 'Còn chỗ';

  return (
    <>
      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle} numberOfLines={2}>{name}</Text>
          <Text style={styles.sheetSub} numberOfLines={1}>{address}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: '#10B98115' }]}>
          <Icon name="home-heart" size={14} color="#10B981" />
          <Text style={[styles.badgeText, { color: '#10B981' }]}>Điểm trú ẩn</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <View style={styles.infoRow}>
          <Icon name="account-group" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>Sức chứa: {capacity - available}/{capacity} người</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="bed-empty" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>Còn trống: {available} chỗ</Text>
        </View>
      </View>

      <View style={[styles.sheetActions, { marginTop: 24 }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onNavigate}>
          <Icon name="directions" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Chỉ đường</Text>
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
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginRight: 56,
    backgroundColor: '#fff',
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  routeBannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeBannerTextWrap: { flex: 1 },
  routeBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  routeBannerSub: {
    marginTop: 2,
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  routeBannerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },

  filterScrollView: { marginRight: 60 },
  filterScrollViewWithRoute: { marginTop: 4 },
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
  incidentMediaScroll: { marginBottom: 12 },
  incidentHeroImage: {
    width: 280,
    height: 132,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },

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

  sheetActions: { marginTop: 4, gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },

  // ─── Layer Controls ────────────────────────────────────────
  layerControlsContainer: {
    position: 'absolute',
    top: Platform.select({ ios: 100, android: 90 }),
    right: 12,
    alignItems: 'center',
    gap: 8,
  },
  layerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  legendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  legendBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  // ─── Layer Panel ──────────────────────────────────────────
  layerPanel: {
    position: 'absolute',
    top: Platform.select({ ios: 100, android: 90 }),
    right: 64,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    overflow: 'hidden',
  },
  layerPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  layerPanelTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  layerPanelClose: {
    padding: 4,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  layerItemLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  layerToggle: {
    width: 32,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  layerToggleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  // ─── Legend Panel ─────────────────────────────────────────
  legendPanel: {
    position: 'absolute',
    bottom: Platform.select({ ios: 110, android: 90 }),
    left: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
    maxWidth: 200,
    overflow: 'hidden',
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  legendContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  legendSection: {
    marginBottom: 10,
  },
  legendSectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3B82F6',
  },
  legendItemText: {
    fontSize: 11,
    color: theme.colors.text,
  },

  // ─── Search Suggestions Dropdown ──────────────────────────
  suggestionsContainer: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    zIndex: 9999,
  },
  suggestionsScroll: {
    maxHeight: 280,
  },
  suggestionsContent: {
    paddingVertical: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  suggestionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
});

export default MapScreen;
