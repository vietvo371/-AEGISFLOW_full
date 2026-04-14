import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ScrollView, TextInput, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  theme,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ICON_SIZE,
  SCREEN_PADDING,
  wp,
  hp,
  cardStyles,
  textStyles
} from '../../theme';
import NotificationBellButton from '../../component/NotificationBellButton';
import env from '../../config/env';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useWebSocket } from '../../contexts/WebSocketContext';

// Initialize Mapbox
MapboxGL.setAccessToken(env.MAPBOX_ACCESS_TOKEN);

import { mapService } from '../../services/mapService';
import { reportService } from '../../services/reportService';
import { MapReport, MapBounds } from '../../types/api/map';
import { ReportDetail } from '../../types/api/report';
import { incidentService, Incident } from '../../services/incidentService';

// ...

const MapScreen = () => {
  const [userLocation, setUserLocation] = useState<number[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number>(-1);
  const [mapReports, setMapReports] = useState<MapReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [trafficGeoJSON, setTrafficGeoJSON] = useState<any>(null);
  const [floodZonesGeoJSON, setFloodZonesGeoJSON] = useState<any>(null);
  const [shelters, setShelters] = useState<any[]>([]);

  // Emergency specific states
  const [mapIncidents, setMapIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Map icon images generated from MaterialCommunityIcons
  const [mapIcons, setMapIcons] = useState<Record<string, any>>({});

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const isEmergency = route.name === 'SituationMap';
  const { isConnected, listen, subscribe, unsubscribe } = useWebSocket();

  // Generate icon images from MaterialCommunityIcons for MapboxGL
  useEffect(() => {
    const size = 32;
    const iconDefs: Array<{ key: string; name: string; color: string }> = [
      // Emergency icons
      { key: 'icon_accident',     name: 'alert-octagon',              color: '#EF4444' },
      { key: 'icon_congestion',   name: 'car-brake-alert',            color: '#F97316' },
      { key: 'icon_construction', name: 'hard-hat',                   color: '#EAB308' },
      { key: 'icon_weather',      name: 'weather-lightning-rainy',    color: '#3B82F6' },
      { key: 'icon_camera',       name: 'cctv',                       color: '#06B6D4' },
      { key: 'icon_patrol',       name: 'police-badge-outline',       color: '#10B981' },
      // Public report icons
      { key: 'icon_traffic',      name: 'road-variant',               color: '#F97316' },
      { key: 'icon_environment',  name: 'tree-outline',               color: '#10B981' },
      { key: 'icon_fire',         name: 'fire',                       color: '#EF4444' },
      { key: 'icon_trash',        name: 'trash-can-outline',          color: '#8B6F4E' },
      { key: 'icon_flood',        name: 'weather-pouring',            color: '#3B82F6' },
      { key: 'icon_shelter',      name: 'home-heart',                 color: '#10B981' },
      { key: 'icon_default',      name: 'alert-circle-outline',       color: '#8B5CF6' },
    ];

    Promise.all(
      iconDefs.map(def =>
        Icon.getImageSource(def.name, size, def.color).then(src => ({ key: def.key, src }))
      )
    ).then(results => {
      const icons: Record<string, any> = {};
      results.forEach(({ key, src }) => { icons[key] = src; });
      setMapIcons(icons);
    });
  }, []);

  // Animation values
  const slideAnim = useRef(new Animated.Value(500)).current; // Start off-screen
  const backdropAnim = useRef(new Animated.Value(0)).current; // Start transparent

  const categories = [
    { id: -1, label: 'Tất cả', icon: 'view-grid-outline' },
    { id: 1, label: 'Giao thông', icon: 'road-variant' },
    { id: 2, label: 'Môi trường', icon: 'tree-outline' },
    { id: 3, label: 'Hỏa hoạn', icon: 'fire' },
    { id: 4, label: 'Rác thải', icon: 'trash-can-outline' },
    { id: 5, label: 'Ngập lụt', icon: 'weather-pouring' },
    { id: 6, label: 'Khác', icon: 'alert-circle-outline' },
  ];

  const emergencyCategories = [
    { id: 1, label: 'Ùn tắc nghiêm trọng', icon: 'car-brake-alert' },
    { id: 2, label: 'Tai nạn/Sự cố', icon: 'alert-octagon' },
    { id: 3, label: 'Camera giám sát', icon: 'cctv' },
    { id: 4, label: 'Lực lượng cơ động', icon: 'police-badge-outline' },
  ];

  const MOCK_CAMERAS: any[] = [
    { id: 9001, type: 'camera', title: 'Camera Đầu Cầu Rồng', location: { lat: 16.0610, lng: 108.2272 }, status: 'online', severity: 'low', description: 'Trực thuộc hệ thống phân tích lưu lượng thông minh.' },
    { id: 9002, type: 'camera', title: 'Camera Ngã Tư Hùng Vương', location: { lat: 16.0718, lng: 108.2198 }, status: 'online', severity: 'low', description: 'Góc quét rộng bao quát toàn bộ ngã tư.' }
  ];

  const MOCK_PATROLS: any[] = [
    { id: 8001, type: 'patrol', title: 'Tổ Tuần tra CSGT 01', location: { lat: 16.0650, lng: 108.2200 }, status: 'patrolling', severity: 'medium', description: 'Đang di chuyển khu vực Hải Châu.' },
    { id: 8002, type: 'patrol', title: 'Xe Cứu Y tế 115 ĐN', location: { lat: 16.0595, lng: 108.2150 }, status: 'standby', severity: 'low', description: 'Đang túc trực tại cơ sở y tế gần nhất.' }
  ];

  const onUserLocationUpdate = (location: MapboxGL.Location) => {
    if (location?.coords) {
      setUserLocation([location.coords.longitude, location.coords.latitude]);
    }
  };

  const centerUserLocation = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }
  };

  const getCategoryName = (category: number): string => {
    const categories: { [key: number]: string } = {
      1: 'Giao thông',
      2: 'Môi trường',
      3: 'Hỏa hoạn',
      4: 'Rác thải',
      5: 'Ngập lụt',
      6: 'Khác',
    };
    return categories[category] || 'Khác';
  };

  const getStatusColor = (status: number): string => {
    switch (status) {
      case 0: return theme.colors.warning;     // Tiếp nhận
      case 1: return theme.colors.info;        // Đã xác minh
      case 2: return '#8B5CF6';                // Đang xử lý - Purple
      case 3: return theme.colors.success;     // Hoàn thành
      case 4: return theme.colors.error;       // Từ chối
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: number): string => {
    switch (status) {
      case 0: return 'Tiếp nhận';
      case 1: return 'Đã xác minh';
      case 2: return 'Đang xử lý';
      case 3: return 'Hoàn thành';
      case 4: return 'Từ chối';
      default: return 'Khác';
    }
  };

  const getCategoryIcon = (category: number): string => {
    const iconMap: { [key: number]: string } = {
      1: 'road-variant',        // Giao thông
      2: 'tree-outline',        // Môi trường
      3: 'fire',                // Hỏa hoạn
      4: 'trash-can-outline',   // Rác thải
      5: 'weather-pouring',     // Ngập lụt
      6: 'alert-circle',        // Khác
    };
    return iconMap[category] || 'alert-circle';
  };

  const getCategoryColor = (category: number): string => {
    const colorMap: { [key: number]: string } = {
      1: '#FF9500',  // Giao thông - Orange
      2: '#34C759',  // Môi trường - Green
      3: '#FF3B30',  // Hỏa hoạn - Red
      4: '#8E6F3E',  // Rác thải - Brown
      5: '#007AFF',  // Ngập lụt - Blue
      6: '#8E8E93',  // Khác - Gray
    };
    return colorMap[category] || '#8E8E93';
  };

  const fitMapToReports = (reports: MapReport[]) => {
    if (!cameraRef.current || !reports || reports.length === 0) return;

    // Calculate bounds from all reports
    let minLon = reports[0].kinh_do;
    let maxLon = reports[0].kinh_do;
    let minLat = reports[0].vi_do;
    let maxLat = reports[0].vi_do;

    reports.forEach(report => {
      if (report.kinh_do < minLon) minLon = report.kinh_do;
      if (report.kinh_do > maxLon) maxLon = report.kinh_do;
      if (report.vi_do < minLat) minLat = report.vi_do;
      if (report.vi_do > maxLat) maxLat = report.vi_do;
    });

    // Add padding to bounds (20% for better view)
    const lonPadding = Math.max((maxLon - minLon) * 0.2, 0.01); // Minimum padding
    const latPadding = Math.max((maxLat - minLat) * 0.2, 0.01);

    cameraRef.current.fitBounds(
      [minLon - lonPadding, minLat - latPadding], // southwest
      [maxLon + lonPadding, maxLat + latPadding], // northeast
      [80, 80, 80, 80], // padding: top, right, bottom, left (increased)
      1000 // animation duration
    );
  };

  const fetchMapReports = async () => {
    if (!mapRef.current) return;

    try {
      setLoading(true);
      const bounds = await mapRef.current.getVisibleBounds();
      if (!bounds || bounds.length < 2) return;

      if (isEmergency) {
        // Fetch incidents for Command Center
        const params: any = { per_page: 50 };
        if (selectedCategory !== -1) {
          // Map category IDs from emergencyCategories to status/severity if needed
          // For now, let's just fetch all or filter basic types
          // (Assuming category maps are set up differently for emergency)
        }
        const response = await incidentService.getIncidents(params);
        if (response.success && response.data) {
          const data = (response.data as any).data || response.data;
          setMapIncidents(Array.isArray(data) ? data : []);
        } else {
          setMapIncidents([]);
        }
        return;
      }

      // Fetch citizen reports for public MAP
      const ne = bounds[0];
      const sw = bounds[1];

      const mapBounds: MapBounds = {
        min_lon: sw[0],
        min_lat: sw[1],
        max_lon: ne[0],
        max_lat: ne[1],
      };

      const filters: any = {};
      if (selectedCategory !== -1) {
        filters.danh_muc = selectedCategory;
      }

      const response = await mapService.getMapReports(mapBounds, filters);

      if (response.success && response.data) {
        const geojson = response.data as any;
        if (geojson.type === 'FeatureCollection' && geojson.features) {
          const reports: MapReport[] = geojson.features.map((feature: any) => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            return {
              id: props.id,
              tieu_de: props.tieu_de,
              danh_muc: props.danh_muc,
              danh_muc_text: props.danh_muc_text,
              trang_thai: props.trang_thai,
              uu_tien: props.uu_tien,
              marker_color: props.marker_color,
              kinh_do: coords[0],
              vi_do: coords[1],
              nguoi_dung: props.nguoi_dung,
            } as MapReport;
          });
          setMapReports(reports);
        } else {
          setMapReports([]);
        }
      } else {
        setMapReports([]);
      }
    } catch (error) {
      console.error('Error fetching map reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrafficEdges = async () => {
    try {
      const geojson = await mapService.getTrafficEdges();
      if (geojson && geojson.type === 'FeatureCollection') {
        setTrafficGeoJSON(geojson);
      }
    } catch (error) {
      console.error('Error fetching traffic edges:', error);
    }
  };

  useEffect(() => {
    fetchTrafficEdges();
    fetchFloodZones();
    fetchShelters();
  }, []);

  const fetchFloodZones = async () => {
    try {
      const geojson = await mapService.getFloodZones();
      if (geojson) setFloodZonesGeoJSON(geojson);
    } catch (e) { console.error('Error flood zones:', e); }
  };

  const fetchShelters = async () => {
    try {
      const res = await mapService.getShelters();
      if (res.success && res.data) setShelters(res.data);
    } catch (e) { console.error('Error shelters:', e); }
  };

  useEffect(() => {
    // Only fetch after map has loaded
    if (mapLoaded) {
      const timer = setTimeout(() => {
        fetchMapReports();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded]);

  // Re-fetch when category changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      fetchMapReports();
    }
  }, [selectedCategory]);

  // Realtime updates via WebSocket
  useEffect(() => {
    let unmounted = false;

    if (isConnected) {
      try {
        // Subscribe to the channel first!
        subscribe('public-incidents');

        // Then listen to events
        listen('public-incidents', '.incident.created', (data) => {
          if (unmounted) return;
          console.log('WS: New incident, refreshing map...', data);
          if (mapLoaded) fetchMapReports();
        });

        listen('public-incidents', '.incident.updated', (data) => {
          if (unmounted) return;
          console.log('WS: Incident updated, refreshing map...', data);
          if (mapLoaded) fetchMapReports();
        });
      } catch (error) {
        console.error('Error setting up websocket listeners:', error);
      }
    }

    return () => {
      unmounted = true;
      if (isConnected) {
        try {
          unsubscribe('public-incidents');
        } catch (e) { }
      }
    };
  }, [isConnected, mapLoaded]);

  // Fit map to reports when they change and a category is selected
  useEffect(() => {
    if (mapReports && mapReports.length > 0 && selectedCategory !== -1) {
      // Only auto-fit when a specific category is selected (not "All")
      fitMapToReports(mapReports);
    }
  }, [mapReports, selectedCategory]);

  // Fetch report detail when a marker is selected
  const fetchReportDetail = async (reportId: number) => {
    try {
      setLoadingDetail(true);
      const response = await reportService.getReportDetail(reportId);
      if (response.success) {
        setReportDetail(response.data);
      }
    } catch (error) {
      console.error('Error fetching report detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleMarkerSelect = (report: MapReport) => {
    setSelectedReport(report);
    setReportDetail(null); // Reset detail
    fetchReportDetail(report.id);
  };

  const handleCloseSheet = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedReport(null);
      setSelectedIncident(null);
      setReportDetail(null);
    });
  };

  // Animate in when bottom sheet appears
  useEffect(() => {
    if (selectedReport || selectedIncident) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedReport, selectedIncident]);

  const mapEmergencyTypeToIcon = (type: string) => {
    const map: any = {
      accident: 'alert-octagon',
      congestion: 'car-brake-alert',
      construction: 'hard-hat',
      weather: 'weather-lightning-rainy',
      other: 'alert-circle-outline'
    };
    return map[type] || 'alert-circle-outline';
  };

  const mapEmergencySeverityColor = (severity: string) => {
    const map: any = {
      low: '#10B981',
      medium: '#3B82F6',
      high: '#F59E0B',
      critical: '#EF4444'
    };
    return map[severity] || '#3B82F6';
  };

  const mapEmergencyStatusColor = (status: string) => {
    const map: any = {
      open: '#EF4444',
      investigating: '#F59E0B',
      resolved: '#10B981',
      closed: '#6B7280'
    };
    return map[status] || '#6B7280';
  };

  const mapEmergencyStatusLabel = (status: string) => {
    const map: any = {
      open: 'Mở',
      investigating: 'Đang xử lý',
      resolved: 'Đã giải quyết',
      closed: 'Đã đóng'
    };
    return map[status] || 'Không rõ';
  };

  const mapEmergencyTypeLabel = (type: string) => {
    const map: any = {
      accident: 'Tai nạn',
      congestion: 'Ùn tắc',
      construction: 'Thi công',
      weather: 'Thời tiết',
      other: 'Khác'
    };
    return map[type] || 'Khác';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => {
          console.log('Map finished loading');
          setMapLoaded(true);
        }}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={13}
          centerCoordinate={[108.2122, 16.0680]} // Da Nang
          animationMode="flyTo"
          animationDuration={1000}
        />

        <MapboxGL.UserLocation
          visible={true}
          onUpdate={onUserLocationUpdate}
          showsUserHeadingIndicator
          minDisplacement={10}
        />

        {/* Register vector icons into MapboxGL image registry */}
        {Object.keys(mapIcons).length > 0 && (
          <MapboxGL.Images images={mapIcons} />
        )}

        {/* Traffic Lines Layer */}
        {trafficGeoJSON && (
          <MapboxGL.ShapeSource id="trafficEdgesSource" shape={trafficGeoJSON}>
            <MapboxGL.LineLayer
              id="trafficLinesLayer"
              style={{
                lineJoin: 'round',
                lineCap: 'round',
                lineWidth: ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 6],
                lineColor: [
                  'interpolate',
                  ['linear'],
                  ['get', 'current_density'],
                  0.0, '#10b981', // green
                  0.4, '#eab308', // yellow
                  0.6, '#f97316', // orange
                  0.8, '#ef4444', // red
                  1.0, '#881337', // dark red
                ] as any, // Bypass strict RNMapbox types for expression array
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Flood Zones Layer */}
        {floodZonesGeoJSON && (
          <MapboxGL.ShapeSource id="floodZonesSource" shape={floodZonesGeoJSON}>
            <MapboxGL.FillLayer
              id="floodZonesFill"
              style={{
                fillColor: [
                  'match',
                  ['get', 'risk_level'],
                  'High', '#EF4444',
                  'Medium', '#F59E0B',
                  'Low', '#3B82F6',
                  '#3B82F6'
                ] as any,
                fillOpacity: 0.4,
                fillOutlineColor: '#ffffff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        <MapboxGL.ShapeSource
          id="reportsSource"
          cluster={false}
          shape={{
            type: 'FeatureCollection',
            features: (() => {
              if (!isEmergency) {
                return mapReports.map(report => ({
                  type: 'Feature',
                  id: report.id.toString(),
                  geometry: { type: 'Point', coordinates: [report.kinh_do, report.vi_do] },
                  properties: { ...report, _isIncident: false },
                }));
              }

              let features: any[] = [];

              if (selectedCategory === -1 || selectedCategory === 1 || selectedCategory === 2) {
                let incToDisplay = mapIncidents;
                if (selectedCategory === 1) incToDisplay = mapIncidents.filter(i => i.type === 'congestion');
                if (selectedCategory === 2) incToDisplay = mapIncidents.filter(i => i.type !== 'congestion');
                features.push(...incToDisplay.map(incident => ({
                  type: 'Feature',
                  id: incident.id.toString(),
                  geometry: {
                    type: 'Point',
                    coordinates: [incident.location?.lng || 108.2122, incident.location?.lat || 16.0680],
                  },
                  properties: {
                    ...incident, _isIncident: true,
                    _severityColor:
                      incident.severity === 'critical' ? '#EF4444'
                      : incident.severity === 'high'   ? '#F97316'
                      : incident.severity === 'medium' ? '#F59E0B'
                      : '#10B981',
                    _isCritical: incident.severity === 'critical' ? 1 : 0,
                  },
                })));
              }
              if (selectedCategory === -1 || selectedCategory === 3) {
                features.push(...MOCK_CAMERAS.map(cam => ({
                  type: 'Feature', id: cam.id.toString(),
                  geometry: { type: 'Point', coordinates: [cam.location.lng, cam.location.lat] },
                  properties: { ...cam, _isIncident: true, _severityColor: '#06B6D4', _isCritical: 0 },
                })));
              }
              if (selectedCategory === -1 || selectedCategory === 4) {
                features.push(...MOCK_PATROLS.map(patrol => ({
                  type: 'Feature', id: patrol.id.toString(),
                  geometry: { type: 'Point', coordinates: [patrol.location.lng, patrol.location.lat] },
                  properties: { ...patrol, _isIncident: true, _severityColor: '#10B981', _isCritical: 0 },
                })));
              }
              if (selectedCategory === -1 || selectedCategory === 5) {
                // Category 5 is Ngập lụt, show shelters when active or in all
                features.push(...shelters.map(shelter => ({
                  type: 'Feature',
                  id: `shelter-${shelter.id}`,
                  geometry: { type: 'Point', coordinates: [shelter.longitude, shelter.latitude] },
                  properties: { ...shelter, danh_muc: 7, _isIncident: false },
                })));
              }
              return features;
            })(),
          }}
          onPress={(event) => {
            const feature = event.features[0];
            if (feature?.properties) {
              if (feature.properties._isIncident) {
                setSelectedIncident(feature.properties as any);
                setSelectedReport(null);
              } else {
                handleMarkerSelect(feature.properties as MapReport);
                setSelectedIncident(null);
              }
            }
          }}
        >
          {/* Outer pulse ring for critical incidents */}
          {(isEmergency ? (
            <MapboxGL.CircleLayer
              id="criticalRing"
              filter={['==', ['get', '_isCritical'], 1]}
              belowLayerID="incidentCircles"
              style={{
                circleRadius: 22,
                circleColor: 'transparent',
                circleStrokeWidth: 3,
                circleStrokeColor: '#EF444480',
                circlePitchAlignment: 'map',
              }}
            />
          ) : <MapboxGL.CircleLayer id="criticalRingPlaceholder" style={{ circleRadius: 0, circleOpacity: 0 }} />) as any}

          {/* Main severity-colored circles */}
          <MapboxGL.CircleLayer
            id="incidentCircles"
            style={{
              circleRadius: isEmergency ? (
                ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 14] as any
              ) : (
                ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 11] as any
              ),
              circleColor: isEmergency
                ? (['get', '_severityColor'] as any)
                : (['match', ['get', 'danh_muc'],
                    1, '#FF9500', 2, '#34C759', 3, '#FF3B30',
                    4, '#8E6F3E', 5, '#007AFF', '#8E8E93'] as any),
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#ffffff',
              circlePitchAlignment: 'map',
              circleOpacity: 0.95,
            }}
          />

          {/* Icon on top of circles */}
          <MapboxGL.SymbolLayer
            id="reportsLayer"
            style={{
              iconImage: isEmergency ? (['match', ['get', 'type'],
                'accident',    'icon_accident',
                'congestion',  'icon_congestion',
                'construction','icon_construction',
                'weather',     'icon_weather',
                'camera',      'icon_camera',
                'patrol',      'icon_patrol',
                'icon_default'
              ] as any) : (['match', ['get', 'danh_muc'],
                1, 'icon_traffic',  2, 'icon_environment',
                3, 'icon_fire',     4, 'icon_trash',
                5, 'icon_flood',    7, 'icon_shelter',
                'icon_default'
              ] as any),
              iconSize: isEmergency ? 0.45 : 0.5,
              iconAllowOverlap: true,
              iconAnchor: 'center',
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Loading Indicator */}
      {
        loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          </View>
        )
      }


      {/* Header Search Bar */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
      <View style={styles.searchContainer}>
          <View style={styles.searchBarRow}>
            <View style={styles.searchBar}>
              <Icon name="magnify" size={ICON_SIZE.md} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={isEmergency ? "Tra cứu điểm nóng, phương tiện..." : "Tìm kiếm địa điểm, sự cố..."}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TouchableOpacity onPress={fetchMapReports} style={styles.iconButton}>
                <Icon name="refresh" size={ICON_SIZE.md} color={isEmergency ? theme.colors.error : theme.colors.primary} />
              </TouchableOpacity>
              {!isEmergency && (
                <TouchableOpacity style={styles.iconButton}>
                  <Icon name="tune-variant" size={ICON_SIZE.md} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <NotificationBellButton
              style={styles.searchBellButton}
              color={isEmergency ? theme.colors.error : theme.colors.primary}
            />
          </View>
      </View>

        {/* Filter Pills with count badges */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {!isEmergency ? categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.id && {
                    backgroundColor: cat.id === -1 ? theme.colors.primary : getCategoryColor(cat.id)
                  }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Icon
                  name={cat.icon}
                  size={14}
                  color={selectedCategory === cat.id ? '#fff' : (cat.id === -1 ? theme.colors.textSecondary : getCategoryColor(cat.id))}
                />
                <Text style={[
                  styles.filterText,
                  selectedCategory === cat.id && styles.filterTextActive,
                  cat.id !== -1 && selectedCategory !== cat.id && { color: getCategoryColor(cat.id) }
                ]}>
                  {cat.label}
                </Text>
                {/* Count badge */}
                {cat.id !== -1 && mapReports.filter(r => r.danh_muc === cat.id).length > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: selectedCategory === cat.id ? 'rgba(255,255,255,0.3)' : getCategoryColor(cat.id) + '25' }]}>
                    <Text style={[styles.filterBadgeText, { color: selectedCategory === cat.id ? '#fff' : getCategoryColor(cat.id) }]}>
                      {mapReports.filter(r => r.danh_muc === cat.id).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )) : (
              // Emergency mode — type filter with counts
              [{ id: -1, label: 'Tất cả', icon: 'view-grid-outline', type: null, color: '#6366F1' },
               { id: 1, label: 'Ùn tắc', icon: 'car-brake-alert', type: 'congestion', color: '#F97316' },
               { id: 2, label: 'Tai nạn', icon: 'alert-octagon', type: 'accident', color: '#EF4444' },
               { id: 3, label: 'Camera', icon: 'cctv', type: 'camera', color: '#06B6D4' },
               { id: 4, label: 'Tuần tra', icon: 'police-badge-outline', type: 'patrol', color: '#10B981' },
              ].map((cat) => {
                const count = cat.type === 'congestion' ? mapIncidents.filter(i => i.type === 'congestion').length
                  : cat.type === 'accident' ? mapIncidents.filter(i => !['congestion'].includes(i.type)).length
                  : cat.type === 'camera' ? MOCK_CAMERAS.length
                  : cat.type === 'patrol' ? MOCK_PATROLS.length
                  : mapIncidents.length + MOCK_CAMERAS.length + MOCK_PATROLS.length;
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(isActive && cat.id !== -1 ? -1 : cat.id)}
                    style={[
                      styles.filterChip,
                      isActive
                        ? { backgroundColor: cat.color, borderColor: cat.color, borderWidth: 1 }
                        : { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: cat.color + '40', borderWidth: 1 }
                    ]}
                  >
                    <Icon name={cat.icon} size={14} color={isActive ? '#fff' : cat.color} />
                    <Text style={[styles.filterText, { color: isActive ? '#fff' : cat.color, fontWeight: '700' }]}>
                      {cat.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.filterBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : cat.color + '20' }]}>
                        <Text style={[styles.filterBadgeText, { color: isActive ? '#fff' : cat.color }]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={centerUserLocation}
        >
          <Icon name="crosshairs-gps" size={ICON_SIZE.lg} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Report Detail Bottom Sheet */}
      {
        (selectedReport || selectedIncident) && (
          <>
            {/* Backdrop */}
            <Animated.View
              style={[
                styles.backdrop,
                {
                  opacity: backdropAnim,
                }
              ]}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={handleCloseSheet}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <View style={styles.sheetHandle} />

              {selectedReport ? (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetTitle} numberOfLines={2}>
                        {selectedReport.tieu_de}
                      </Text>
                      <Text style={styles.sheetId}>#{selectedReport.id}</Text>
                    </View>
                    <TouchableOpacity onPress={handleCloseSheet}>
                      <Icon name="close" size={ICON_SIZE.md} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.sheetScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Badges */}
                    <View style={styles.sheetRow}>
                      <View style={[
                        styles.sheetBadge,
                        { backgroundColor: getCategoryColor(selectedReport.danh_muc) + '15' }
                      ]}>
                        <Icon
                          name={getCategoryIcon(selectedReport.danh_muc)}
                          size={16}
                          color={getCategoryColor(selectedReport.danh_muc)}
                        />
                        <Text style={[
                          styles.sheetBadgeText,
                          { color: getCategoryColor(selectedReport.danh_muc) }
                        ]}>
                          {selectedReport.danh_muc_text || getCategoryName(selectedReport.danh_muc)}
                        </Text>
                      </View>

                      <View style={[styles.sheetBadge, {
                        backgroundColor: getStatusColor(selectedReport.trang_thai) + '15'
                      }]}>
                        <Text style={[styles.sheetBadgeText, {
                          color: getStatusColor(selectedReport.trang_thai)
                        }]}>
                          {getStatusLabel(selectedReport.trang_thai)}
                        </Text>
                      </View>
                    </View>

                    {loadingDetail ? (
                      <View style={styles.detailLoading}>
                        <Text style={styles.detailLoadingText}>Đang tải thông tin...</Text>
                      </View>
                    ) : reportDetail ? (
                      <>
                        {/* Description */}
                        {reportDetail.mo_ta && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>Mô tả</Text>
                            <Text style={styles.detailText} numberOfLines={3}>
                              {reportDetail.mo_ta}
                            </Text>
                          </View>
                        )}

                        {/* Media Gallery */}
                        {reportDetail.hinh_anhs && reportDetail.hinh_anhs.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>Hình ảnh</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                              {reportDetail.hinh_anhs.map((item) => (
                                <TouchableOpacity key={item.id} activeOpacity={0.9}>
                                  <Image
                                    source={{ uri: item.duong_dan_hinh_anh }}
                                    style={styles.mediaImage}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}

                        {/* Address & Time */}
                        <View style={styles.detailSection}>
                          <View style={styles.detailRow}>
                            <Icon name="map-marker" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.detailTextSmall} numberOfLines={1}>
                              {reportDetail.dia_chi}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Icon name="clock-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.detailTextSmall}>
                              {new Date(reportDetail.created_at).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.sheetActions}>
                          <TouchableOpacity
                            style={styles.sheetButton}
                            onPress={() => {
                              // Navigate to detail screen
                              handleCloseSheet();
                              navigation.navigate('IncidentDetail' as any, { id: selectedReport.id });
                            }}
                          >
                            <Icon name="information-outline" size={ICON_SIZE.md} color={theme.colors.primary} />
                            <Text style={styles.sheetButtonText}>Xem chi tiết</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.sheetButton}>
                            <Icon name="share-variant-outline" size={ICON_SIZE.md} color={theme.colors.primary} />
                            <Text style={styles.sheetButtonText}>Chia sẻ</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                  </ScrollView>
                </>
              ) : selectedIncident && (
                <>
                  {/* ── Digital Twin Header ── */}
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <Icon name="access-point" size={12} color="#6366F1" />
                        <Text style={styles.dtLabel}>DIGITAL TWIN · LIVE</Text>
                      </View>
                      <Text style={styles.sheetTitle} numberOfLines={2}>
                        {selectedIncident.title || 'Sự cố chưa đặt tên'}
                      </Text>
                      <Text style={styles.sheetId}>NODE #{selectedIncident.id} · {mapEmergencyTypeLabel(selectedIncident.type)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleCloseSheet} style={styles.closeBtn}>
                      <Icon name="close" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.sheetScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* ── Status Badges ── */}
                    <View style={styles.sheetRow}>
                      <View style={[
                        styles.sheetBadge,
                        { backgroundColor: mapEmergencySeverityColor(selectedIncident.severity) + '20' }
                      ]}>
                        <Icon
                          name={mapEmergencyTypeToIcon(selectedIncident.type)}
                          size={13}
                          color={mapEmergencySeverityColor(selectedIncident.severity)}
                        />
                        <Text style={[styles.sheetBadgeText, { color: mapEmergencySeverityColor(selectedIncident.severity) }]}>
                          {selectedIncident.severity?.toUpperCase() || 'N/A'}
                        </Text>
                      </View>

                      <View style={[styles.sheetBadge, { backgroundColor: mapEmergencyStatusColor(selectedIncident.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: mapEmergencyStatusColor(selectedIncident.status) }]} />
                        <Text style={[styles.sheetBadgeText, { color: mapEmergencyStatusColor(selectedIncident.status) }]}>
                          {mapEmergencyStatusLabel(selectedIncident.status)}
                        </Text>
                      </View>

                      <View style={[styles.sheetBadge, { backgroundColor: '#6366F115' }]}>
                        <Icon name="clock-fast" size={13} color="#6366F1" />
                        <Text style={[styles.sheetBadgeText, { color: '#6366F1' }]}>
                          {new Date(selectedIncident.created_at || new Date()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>

                    {/* ── Location Info ── */}
                    {(selectedIncident.location_name || selectedIncident.location) && (
                      <View style={styles.dtInfoRow}>
                        <Icon name="map-marker-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.dtInfoText} numberOfLines={1}>
                          {selectedIncident.location_name || `${selectedIncident.location?.lat?.toFixed(4)}, ${selectedIncident.location?.lng?.toFixed(4)}`}
                        </Text>
                      </View>
                    )}

                    {/* ── Mini Status Timeline ── */}
                    <View style={styles.timeline}>
                      {[
                        { key: 'open',          label: 'Tiếp nhận',  icon: 'alert-circle' },
                        { key: 'investigating', label: 'Xử lý',      icon: 'magnify' },
                        { key: 'resolved',      label: 'Hoàn thành', icon: 'check-circle' },
                      ].map((step, idx, arr) => {
                        const statusOrder = ['open', 'investigating', 'resolved', 'closed'];
                        const currentIdx = statusOrder.indexOf(selectedIncident?.status || 'open');
                        const stepIdx   = statusOrder.indexOf(step.key);
                        const isDone    = stepIdx < currentIdx;
                        const isActive  = stepIdx === currentIdx;
                        const color     = isActive ? '#6366F1' : isDone ? '#10B981' : theme.colors.textSecondary;
                        return (
                          <React.Fragment key={step.key}>
                            <View style={styles.timelineStep}>
                              <Icon
                                name={isDone ? 'check-circle' : step.icon}
                                size={16}
                                color={color}
                              />
                              <Text style={[styles.timelineLabel, { color }]}>
                                {step.label}
                              </Text>
                            </View>
                            {idx < arr.length - 1 && (
                              <View style={[styles.timelineLine, { backgroundColor: isDone ? '#10B981' : theme.colors.border }]} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>

                    {/* ── Description ── */}
                    {selectedIncident.description && (
                      <Text style={styles.dtDescription} numberOfLines={2}>
                        {selectedIncident.description}
                      </Text>
                    )}

                    {/* ──────────────────────────────────────────── */}
                    {/*  AI ENGINE PANEL  */}
                    {/* ──────────────────────────────────────────── */}
                    <View style={styles.aiPanel}>
                      <View style={styles.aiPanelHeader}>
                        <View style={styles.aiIconWrap}>
                          <Icon name="brain" size={16} color="#A78BFA" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.aiPanelTitle}>AegisFlow AI · Phân tích Tình huống</Text>
                          <Text style={styles.aiPanelSub}>Mô hình dự báo giao thông thời gian thực</Text>
                        </View>
                        <View style={styles.aiBadgeLive}>
                          <Text style={styles.aiBadgeLiveText}>LIVE</Text>
                        </View>
                      </View>

                      {/* AI Prediction Row */}
                      <View style={styles.aiPredRow}>
                        <Icon name="trending-up" size={14} color="#F59E0B" />
                        <Text style={styles.aiPredText}>
                          <Text style={{ color: '#F59E0B', fontWeight: '700' }}>Dự báo: </Text>
                          Nguy cơ ùn tắc lan rộng tăng{' '}
                          <Text style={{ color: '#EF4444', fontWeight: '700' }}>
                            {selectedIncident.severity === 'critical' ? '80%' : selectedIncident.severity === 'high' ? '55%' : '30%'}
                          </Text>
                          {' '}trong 15 phút tới tại các nút giao lân cận.
                        </Text>
                      </View>

                      {/* AI Recommendation */}
                      <View style={styles.aiRecRow}>
                        <Icon name="lightbulb-outline" size={14} color="#34D399" />
                        <Text style={styles.aiRecText}>
                          <Text style={{ color: '#34D399', fontWeight: '700' }}>Đề xuất: </Text>
                          {selectedIncident.type === 'congestion'
                            ? 'Điều chỉnh chu kỳ đèn giao thông khu vực. Chuyển hướng phương tiện sang trục phụ song song.'
                            : selectedIncident.type === 'accident'
                            ? 'Phối hợp cảnh sát + y tế. Phân luồng tạm thời tại 2 nút giao gần nhất.'
                            : 'Xác minh hiện trường và kích hoạt đội ứng cứu phù hợp.'}
                        </Text>
                      </View>

                      {/* Graph Simulation Preview */}
                      <View style={styles.aiGraphRow}>
                        <Icon name="graph-outline" size={13} color="#818CF8" />
                        <Text style={styles.aiGraphText}>
                          Bản sao số đang theo dõi{' '}
                          <Text style={{ color: '#818CF8', fontWeight: '600' }}>24 cạnh đồ thị (edges)</Text>
                          {' '}trong vùng ảnh hưởng.
                        </Text>
                      </View>
                    </View>
                    {/* ──────────────────────────────────────────── */}

                    {/* ── Action Buttons ── */}
                    <View style={styles.dtActions}>
                      <TouchableOpacity
                        style={styles.dtBtnDispatch}
                        onPress={() => {
                          if (!selectedIncident?.id) return;
                          handleCloseSheet();
                          navigation.navigate('IncidentDetail' as any, { id: selectedIncident.id });
                        }}
                      >
                        <Icon name="shield-alert-outline" size={17} color="#fff" />
                        <Text style={styles.dtBtnDispatchText}>Điều phối & Xử lý</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dtBtnSimulate}
                        onPress={() => {
                          handleCloseSheet();
                          navigation.navigate('EmergencyIncidents' as any);
                        }}
                      >
                        <Icon name="robot-outline" size={17} color="#A78BFA" />
                        <Text style={styles.dtBtnSimulateText}>Chạy Mô phỏng AI</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              )}
            </Animated.View>
          </>
        )
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SCREEN_PADDING.horizontal,
  },
  searchContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: hp('6%'),
    ...theme.shadows.md,
  },
  searchBellButton: {
    width: 46,
    height: 46,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    height: '100%',
  },
  iconButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  filterContainer: {
    height: 40,
  },
  filterContent: {
    paddingRight: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
    ...theme.shadows.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: theme.colors.white,
  },

  fabContainer: {
    position: 'absolute',
    bottom: Platform.select({ ios: hp('12%'), android: hp('10%') }), // Adjust for tab bar
    right: SCREEN_PADDING.horizontal,
    gap: SPACING.md,
    alignItems: 'flex-end',
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: Platform.select({ ios: hp('15%'), android: hp('13%') }),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingBox: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...theme.shadows.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
  reportButton: {
    width: 'auto',
    paddingHorizontal: SPACING.lg,
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  reportButtonText: {
    color: theme.colors.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingBottom: Platform.select({ ios: SPACING['2xl'], android: SPACING.xl }),
    ...theme.shadows.xl,
    zIndex: 101, // Above backdrop
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sheetId: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  sheetContent: {
    gap: SPACING.md,
  },
  sheetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sheetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  sheetBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  sheetButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
  },
  sheetButtonText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  sheetScroll: {
    maxHeight: hp('50%'),
  },
  sheetScrollContent: {
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  detailLoading: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  detailLoadingText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
  detailSection: {
    gap: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailTextSmall: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentsSection: {
    gap: SPACING.sm,
  },
  commentsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  commentItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  commentUser: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentTime: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  commentText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  moreComments: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: SPACING.xs,
  },
  mediaScroll: {
    marginTop: SPACING.sm,
  },
  mediaImage: {
    width: wp('60%'),
    height: wp('40%'),
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  // ─── Digital Twin Styles ────────────────────────────────
  closeBtn: {
    padding: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  dtLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dtPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  dtInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  dtInfoText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  dtDescription: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginVertical: SPACING.sm,
  },

  // AI Engine Panel
  aiPanel: {
    marginTop: SPACING.md,
    backgroundColor: '#0F0F1A',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#6366F130',
  },
  aiPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  aiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#6366F115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPanelTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  aiPanelSub: {
    fontSize: FONT_SIZE.xs,
    color: '#818CF8',
    marginTop: 1,
  },
  aiBadgeLive: {
    backgroundColor: '#EF444420',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  aiBadgeLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  aiPredRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
    padding: 8,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#F59E0B08',
  },
  aiPredText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  aiRecRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
    padding: 8,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#34D39908',
  },
  aiRecText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  aiGraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#818CF808',
    borderTopWidth: 1,
    borderTopColor: '#6366F120',
  },
  aiGraphText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: '#9CA3AF',
    lineHeight: 16,
  },

  // Action Buttons
  dtActions: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  dtBtnDispatch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#EF4444',
    paddingVertical: 13,
    borderRadius: BORDER_RADIUS.lg,
  },
  dtBtnDispatchText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#fff',
  },
  dtBtnSimulate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#A78BFA15',
    paddingVertical: 13,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#A78BFA50',
  },
  dtBtnSimulateText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#A78BFA',
  },

  // ─── Status Timeline ────────────────────────────────────
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  timelineStep: {
    alignItems: 'center',
    gap: 4,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  timelineLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginHorizontal: SPACING.xs,
    marginBottom: 12,
  },

  // ─── Filter Badge ────────────────────────────────────────
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});

export default MapScreen;
