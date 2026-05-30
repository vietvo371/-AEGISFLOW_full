import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING } from '../../theme';
import { mapService } from '../../services/mapService';
import { Shelter } from '../../types/api/map';
import { useTranslation } from '../../hooks/useTranslation';
import env from '../../config/env';
import Geolocation from 'react-native-geolocation-service';

const DA_NANG_LOCATION = { lat: 16.0689, lng: 108.2195 };

const SHELTER_IMAGES: Record<string, any> = {
  school: require('../../assets/images/started/community.jpg'),
  community: require('../../assets/images/started/welcome.jpg'),
  government: require('../../assets/images/started/security.jpg'),
  religious: require('../../assets/images/started/welcom.jpg'),
  other: require('../../assets/images/started/map.jpg'),
};

const getShelterStatus = (capacity?: number, current?: number): 'available' | 'limited' | 'full' => {
  if (!capacity || !current) return 'available';
  const ratio = current / capacity;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.7) return 'limited';
  return 'available';
};

const normalizeShelterStatus = (status: string | undefined, capacity: number, current: number): Shelter['tinh_trang'] => {
  if (status === 'available' || status === 'limited' || status === 'full') return status;
  if (status === 'open') return getShelterStatus(capacity, current);
  if (status === 'closed' || status === 'inactive') return 'full';
  return getShelterStatus(capacity, current);
};

const normalizeShelterType = (type: string | undefined): Shelter['loai'] => {
  if (type === 'school' || type === 'community' || type === 'government' || type === 'religious') return type;
  if (type === 'community_center' || type === 'sports_hall') return 'community';
  if (type === 'public_building' || type === 'government_office') return 'government';
  if (type === 'temple' || type === 'church' || type === 'pagoda') return 'religious';
  return 'community';
};

const toFiniteNumber = (value: any, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ShelterListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DA_NANG_LOCATION);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const getUserLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(DA_NANG_LOCATION);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const fetchShelters = useCallback(async () => {
    try {
      setError(null);
      setUsingDemoData(false);
      const response = await mapService.getShelters();
      if (response.success && response.data) {
        // Transform data to match Shelter interface
        const transformedData: Shelter[] = Array.isArray(response.data) 
          ? response.data.map((item: any) => {
              const capacity = toFiniteNumber(item.capacity ?? item.suc_chua, 100);
              const current = toFiniteNumber(
                item.current_count ??
                item.current_occupancy ??
                item.hien_tai ??
                Math.max(0, capacity - toFiniteNumber(item.available_beds, capacity)),
                0
              );

              return {
                id: item.id,
                ten_diem: item.name || item.ten_diem || 'Điểm sơ tán',
                dia_chi: item.address || item.dia_chi || '',
                latitude: toFiniteNumber(item.latitude ?? item.lat ?? item.location?.lat, DA_NANG_LOCATION.lat),
                longitude: toFiniteNumber(item.longitude ?? item.lng ?? item.location?.lng, DA_NANG_LOCATION.lng),
                suc_chua: capacity,
                hien_tai: current,
                loai: normalizeShelterType(item.type || item.shelter_type || item.loai),
                tinh_trang: normalizeShelterStatus(item.status || item.tinh_trang, capacity, current),
                thoi_gian_mo: item.open_time ?? item.thoi_gian_mo ?? '06:00',
                thoi_gian_dong: item.close_time ?? item.thoi_gian_dong ?? '22:00',
                so_dt: item.phone || item.contact_phone || item.so_dt || '',
                anh: item.image || item.anh,
                mo_ta: item.description || item.mo_ta,
              };
            })
          : [];
        setShelters(transformedData.length > 0 ? transformedData : MOCK_SHELTERS);
        setUsingDemoData(transformedData.length === 0);
      }
    } catch (err) {
      setError('Đang dùng dữ liệu mẫu do chưa kết nối được máy chủ.');
      setUsingDemoData(true);
      setShelters(MOCK_SHELTERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getUserLocation();
    fetchShelters();
  }, [fetchShelters, getUserLocation]);

  const calculateDistance = (lat: number, lng: number): string => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat - userLocation.lat) * Math.PI / 180;
    const dLng = (lng - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  const getNearestDistance = (): string => {
    if (shelters.length === 0) return '-- km';
    const distances = shelters.map(shelter => {
      const R = 6371;
      const dLat = (shelter.latitude - userLocation.lat) * Math.PI / 180;
      const dLng = (shelter.longitude - userLocation.lng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(shelter.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    });
    const nearest = Math.min(...distances);

    if (nearest < 1) return `${Math.round(nearest * 1000)} m`;
    return `${nearest.toFixed(1)} km`;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'available': theme.colors.success,
      'limited': theme.colors.warning,
      'full': theme.colors.error,
    };
    return colors[status] || theme.colors.success;
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      'available': t('citizen.shelters.open'),
      'limited': t('citizen.shelters.almostFull'),
      'full': t('citizen.shelters.closed'),
    };
    return texts[status] || t('citizen.shelters.open');
  };

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      'available': 'check-circle',
      'limited': 'alert-circle',
      'full': 'close-circle',
    };
    return icons[status] || 'check-circle';
  };

  const getShelterTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'school': 'school',
      'community': 'home-city',
      'government': 'office-building',
      'religious': 'church',
    };
    return icons[type] || 'home';
  };

  const getShelterTypeText = (type: string): string => {
    const texts: Record<string, string> = {
      'school': t('citizen.shelters.school'),
      'community': t('citizen.shelters.community'),
      'government': t('citizen.shelters.government'),
      'religious': t('citizen.shelters.religious'),
    };
    return texts[type] || t('citizen.shelters.other');
  };

  const getShelterImageSource = (shelter: Shelter) => {
    if (shelter.anh) {
      const uri = shelter.anh.startsWith('http') || shelter.anh.startsWith('file://')
        ? shelter.anh
        : `${env.API_URL}${shelter.anh.startsWith('/') ? shelter.anh : `/${shelter.anh}`}`;
      return { uri };
    }
    return SHELTER_IMAGES[shelter.loai] || SHELTER_IMAGES.other;
  };

  const formatOpeningHours = (open?: string, close?: string): string => {
    if (!open && !close) return '24/24';
    if (open === '24/24' || open === '24h' || open === '24h/24') return '24/24';
    if (!close) return open || '24/24';
    return `${open || '06:00'} - ${close}`;
  };

  const openDirections = (shelter: Shelter) => {
    (navigation as any).navigate('Map', {
      shelterRoute: {
        id: shelter.id,
        name: shelter.ten_diem,
        address: shelter.dia_chi,
        latitude: shelter.latitude,
        longitude: shelter.longitude,
      },
    });
  };

  const filteredShelters = shelters.filter(shelter =>
    shelter.ten_diem.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shelter.dia_chi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchShelters();
  };

  const renderShelterItem = ({ item, index }: { item: Shelter; index: number }) => {
    const distance = calculateDistance(item.latitude, item.longitude);
    const capacityPercent = item.suc_chua > 0 ? (item.hien_tai / item.suc_chua) * 100 : 0;
    
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
        <TouchableOpacity 
          style={styles.shelterCard}
          activeOpacity={0.7}
          onPress={() => {
            // Navigate to shelter detail or show modal
          }}
        >
          <View style={styles.shelterHeader}>
            <View style={styles.shelterPhotoWrap}>
              <Image source={getShelterImageSource(item)} style={styles.shelterPhoto} resizeMode="cover" />
              <View style={[styles.shelterIcon, { backgroundColor: getStatusColor(item.tinh_trang) }]}>
                <Icon
                  name={getShelterTypeIcon(item.loai)}
                  size={14}
                  color={theme.colors.white}
                />
              </View>
            </View>
            <View style={styles.shelterInfo}>
              <Text style={styles.shelterName} numberOfLines={2}>{item.ten_diem}</Text>
              <View style={styles.shelterMeta}>
                <Icon name="map-marker" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.shelterAddress} numberOfLines={2}>
                  {item.dia_chi || t('citizen.shelters.unknownAddress')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.distanceContainer}
              activeOpacity={0.75}
              onPress={() => openDirections(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="navigation" size={16} color={theme.colors.primary} />
              <Text style={styles.distanceText}>{distance}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shelterStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('citizen.shelters.capacity')}</Text>
              <Text style={styles.statValue}>{item.hien_tai}/{item.suc_chua}</Text>
            </View>
            <View style={styles.capacityBar}>
              <View 
                style={[
                  styles.capacityFill, 
                  { 
                    width: `${Math.min(capacityPercent, 100)}%`,
                    backgroundColor: getStatusColor(item.tinh_trang)
                  }
                ]} 
              />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.tinh_trang) + '15' }]}>
              <Icon name={getStatusIcon(item.tinh_trang)} size={14} color={getStatusColor(item.tinh_trang)} />
              <Text style={[styles.statusText, { color: getStatusColor(item.tinh_trang) }]}>
                {getStatusText(item.tinh_trang)}
              </Text>
            </View>
          </View>

          <View style={styles.shelterFooter}>
            <View style={styles.footerItem}>
              <Icon name="clock-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.footerText}>
                {formatOpeningHours(item.thoi_gian_mo, item.thoi_gian_dong)}
              </Text>
            </View>
            {item.so_dt && (
              <View style={styles.footerItem}>
                <Icon name="phone" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.footerText}>{item.so_dt}</Text>
              </View>
            )}
            <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
              <Icon name={getShelterTypeIcon(item.loai)} size={12} color={theme.colors.primary} />
              <Text style={[styles.typeText, { color: theme.colors.primary }]}>
                {getShelterTypeText(item.loai)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('citizen.shelters.title')}</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-variant" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('citizen.shelters.searchShelter')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Icon name="home-city" size={20} color={theme.colors.primary} />
          <Text style={styles.summaryText}>{shelters.length} {t('citizen.shelters.locations')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="account-group" size={20} color={theme.colors.success} />
          <Text style={styles.summaryText}>
            {shelters.reduce((sum, s) => sum + (s.suc_chua - s.hien_tai), 0)} {t('citizen.shelters.bedsAvailable')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="map-marker-distance" size={20} color={theme.colors.warning} />
          <Text style={styles.summaryText}>
            {getNearestDistance()}
          </Text>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, usingDemoData && styles.demoBanner]}>
          <Icon name={usingDemoData ? 'database-alert' : 'alert-circle'} size={16} color={usingDemoData ? theme.colors.warning : theme.colors.error} />
          <Text style={[styles.errorText, usingDemoData && styles.demoText]}>{error}</Text>
        </View>
      )}

      {/* Shelter List */}
      <FlatList
        data={filteredShelters}
        renderItem={renderShelterItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 112 }]}
        scrollIndicatorInsets={{ bottom: insets.bottom + 112 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="home-off" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>{t('citizen.shelters.noShelters')}</Text>
            <Text style={styles.emptySubtext}>{t('citizen.shelters.noSheltersMessage')}</Text>
          </View>
        }
      />
    </View>
  );
};

// Mock data for demo
const MOCK_SHELTERS: Shelter[] = [
  {
    id: 1,
    ten_diem: 'Trường Tiểu học Trần Hưng Đạo',
    dia_chi: '123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    latitude: 16.0544,
    longitude: 108.2022,
    suc_chua: 200,
    hien_tai: 45,
    loai: 'school',
    tinh_trang: 'available',
    thoi_gian_mo: '06:00',
    thoi_gian_dong: '22:00',
    so_dt: '0236.3822.123',
    mo_ta: 'Trường tiểu học có sân rộng, đủ điều kiện tiếp nhận người dân sơ tán',
  },
  {
    id: 2,
    ten_diem: 'Nhà thi đấu thể thao Liên Chiểu',
    dia_chi: '45 Đường số 5, Liên Chiểu, Đà Nẵng',
    latitude: 16.0689,
    longitude: 108.1495,
    suc_chua: 500,
    hien_tai: 380,
    loai: 'community',
    tinh_trang: 'limited',
    thoi_gian_mo: '24/24',
    thoi_gian_dong: '',
    so_dt: '0236.3844.456',
    mo_ta: 'Nhà thi đấu đa năng, sức chứa lớn, có khu vực cấp cứu',
  },
  {
    id: 3,
    ten_diem: 'UBND Quận Hải Châu',
    dia_chi: '78 Lê Duẩn, Hải Châu, Đà Nẵng',
    latitude: 16.0718,
    longitude: 108.2198,
    suc_chua: 150,
    hien_tai: 150,
    loai: 'government',
    tinh_trang: 'full',
    thoi_gian_mo: '24/24',
    thoi_gian_dong: '',
    so_dt: '0236.3891.789',
    mo_ta: 'Trụ sở UBND quận, có đội ngũ y tế và hỗ trợ',
  },
  {
    id: 4,
    ten_diem: 'Chùa Linh Ứng',
    dia_chi: '60 Ngũ Hành Sơn, Mỹ An, Đà Nẵng',
    latitude: 16.0015,
    longitude: 108.2475,
    suc_chua: 300,
    hien_tai: 20,
    loai: 'religious',
    tinh_trang: 'available',
    thoi_gian_mo: '05:00',
    thoi_gian_dong: '21:00',
    so_dt: '0236.3962.888',
    mo_ta: 'Cơ sở tôn giáo rộng rãi, có khu nghỉ ngơi và cung cấp đồ ăn',
  },
  {
    id: 5,
    ten_diem: 'Trường THCS Lê Quý Đôn',
    dia_chi: '200 Nguyễn Tất Thành, Thanh Khê, Đà Nẵng',
    latitude: 16.0789,
    longitude: 108.1987,
    suc_chua: 180,
    hien_tai: 60,
    loai: 'school',
    tinh_trang: 'available',
    thoi_gian_mo: '06:00',
    thoi_gian_dong: '21:00',
    so_dt: '0236.3712.345',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingBottom: 10,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 1,
  },
  summaryText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.text,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '15',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.error,
    flex: 1,
  },
  demoBanner: {
    backgroundColor: theme.colors.warning + '15',
  },
  demoText: {
    color: theme.colors.warning,
  },
  listContent: {
    padding: SCREEN_PADDING.horizontal,
  },
  shelterCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shelterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  shelterPhotoWrap: {
    width: 62,
    height: 62,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  shelterPhoto: {
    width: '100%',
    height: '100%',
  },
  shelterIcon: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  shelterInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  shelterName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  shelterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shelterAddress: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  distanceText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  shelterStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: theme.colors.text,
  },
  capacityBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  shelterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  typeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['3xl'],
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
});

export default ShelterListScreen;
