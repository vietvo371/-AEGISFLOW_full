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
                ten_diem: item.name || item.ten_diem || t('citizen.shelters.defaultName'),
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
        setShelters(transformedData);
        setUsingDemoData(false);
      }
    } catch (err) {
      setError(t('citizen.shelters.connectionError'));
      setUsingDemoData(false);
      setShelters([]);
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
      'available': 'check-circle-outline',
      'limited': 'alert-circle-outline',
      'full': 'close-circle-outline',
    };
    return icons[status] || 'check-circle-outline';
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
        <View style={styles.shelterCard}>
          <View style={styles.shelterHeader}>
            <View style={styles.shelterPhotoWrap}>
              <Image source={getShelterImageSource(item)} style={styles.shelterPhoto} resizeMode="cover" />
              <View style={[styles.shelterIcon, { backgroundColor: getStatusColor(item.tinh_trang) }]}>
                <Icon
                  name={getShelterTypeIcon(item.loai)}
                  size={12}
                  color={theme.colors.white}
                />
              </View>
            </View>
            <View style={styles.shelterInfo}>
              <Text style={styles.shelterName} numberOfLines={2}>{item.ten_diem}</Text>
              <View style={styles.shelterMeta}>
                <Icon name="map-marker" size={13} color={theme.colors.textSecondary} />
                <Text style={styles.shelterAddress} numberOfLines={2}>
                  {item.dia_chi || t('citizen.shelters.unknownAddress')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.distanceBadge}
              activeOpacity={0.7}
              onPress={() => openDirections(item)}
            >
              <Icon name="navigation-variant" size={11} color={theme.colors.primary} />
              <Text style={styles.distanceBadgeText}>{distance}</Text>
            </TouchableOpacity>
          </View>

          {/* Occupancy Indicator section */}
          <View style={styles.capacityContainer}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityLabel}>
                {t('citizen.shelters.capacity')}: <Text style={styles.capacityHighlight}>{item.hien_tai}</Text>/{item.suc_chua} {t('citizen.shelters.people')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.tinh_trang) + '12' }]}>
                <View style={[styles.statusIndicatorDot, { backgroundColor: getStatusColor(item.tinh_trang) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(item.tinh_trang) }]}>
                  {getStatusText(item.tinh_trang)}
                </Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(capacityPercent, 100)}%`,
                    backgroundColor: getStatusColor(item.tinh_trang)
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.shelterFooter}>
            <View style={styles.footerItem}>
              <Icon name="clock-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.footerText}>
                {formatOpeningHours(item.thoi_gian_mo, item.thoi_gian_dong)}
              </Text>
            </View>
            
            {item.so_dt ? (
              <View style={styles.phoneButton}>
                <Icon name="phone" size={13} color="#12B76A" />
                <Text style={styles.phoneButtonText}>{item.so_dt}</Text>
              </View>
            ) : null}

            <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '12' }]}>
              <Icon name={getShelterTypeIcon(item.loai)} size={11} color={theme.colors.primary} />
              <Text style={[styles.typeText, { color: theme.colors.primary }]}>
                {getShelterTypeText(item.loai)}
              </Text>
            </View>
          </View>
        </View>
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
      
      {/* Cohesive Header + Search + Stats Block */}
      <View style={[styles.topPanel, { paddingTop: insets.top + 10 }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{t('citizen.shelters.title')}</Text>
            <View style={styles.headerSubtitleRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerSubtitle}>
                {t('citizen.shelters.readyCount', { count: shelters.filter(s => s.tinh_trang !== 'full').length })}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Icon name="tune-variant" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Icon name="magnify" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('citizen.shelters.searchShelter')}
              placeholderTextColor={theme.colors.textTertiary}
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

        {/* Summary Stats Cards Grid */}
        <View style={styles.statsWidgetRow}>
          {/* Total Locations */}
          <View style={[styles.statWidget, { backgroundColor: '#F4F3FF', borderColor: 'rgba(122, 90, 248, 0.08)' }]}>
            <View style={styles.statWidgetIconWrap}>
              <Icon name="home-heart" size={16} color="#7A5AF8" />
            </View>
            <View>
              <Text style={styles.statWidgetValue}>{shelters.length}</Text>
              <Text style={styles.statWidgetLabel}>{t('citizen.shelters.locations')}</Text>
            </View>
          </View>

          {/* Beds Available */}
          <View style={[styles.statWidget, { backgroundColor: '#ECFDF3', borderColor: 'rgba(23, 178, 106, 0.08)' }]}>
            <View style={styles.statWidgetIconWrap}>
              <Icon name="account-multiple-check" size={16} color="#12B76A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statWidgetValue}>
                {shelters.reduce((sum, s) => sum + Math.max(0, s.suc_chua - s.hien_tai), 0)}
              </Text>
              <Text style={styles.statWidgetLabel} numberOfLines={1}>{t('citizen.shelters.bedsAvailable')}</Text>
            </View>
          </View>

          {/* Nearest Distance */}
          <View style={[styles.statWidget, { backgroundColor: '#FEF8E8', borderColor: 'rgba(247, 144, 9, 0.08)' }]}>
            <View style={styles.statWidgetIconWrap}>
              <Icon name="map-marker-distance" size={16} color="#F79009" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statWidgetValue} numberOfLines={1}>{getNearestDistance()}</Text>
              <Text style={styles.statWidgetLabel} numberOfLines={1}>{t('citizen.shelters.nearest')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, usingDemoData && styles.demoBanner]}>
          <Icon name={usingDemoData ? 'database-alert' : 'alert-circle'} size={16} color={usingDemoData ? theme.colors.warning : theme.colors.error} />
          <Text style={[styles.errorText, usingDemoData && styles.demoText]}>{error}</Text>
        </View>
      )}

      {/* Shelter List with explicit style=flex:1 to prevent vertical overlap bugs */}
      <FlatList
        data={filteredShelters}
        renderItem={renderShelterItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        scrollIndicatorInsets={{ bottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon name="home-off-outline" size={44} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyText}>{t('citizen.shelters.noShelters')}</Text>
            <Text style={styles.emptySubtext}>{t('citizen.shelters.noSheltersMessage')}</Text>
          </View>
        }
      />
    </View>
  );
};

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
  topPanel: {
    backgroundColor: theme.colors.white,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 46,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    padding: 0,
  },
  statsWidgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  statWidget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: 6,
  },
  statWidgetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statWidgetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statWidgetLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    marginTop: -1,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingTop: SPACING.md,
  },
  shelterCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  shelterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shelterPhotoWrap: {
    width: 68,
    height: 68,
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
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
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
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  shelterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shelterAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(122, 90, 248, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginLeft: 6,
  },
  distanceBadgeText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  capacityContainer: {
    marginBottom: 12,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  capacityHighlight: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  statusIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shelterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    gap: 3,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(23, 178, 106, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  phoneButtonText: {
    fontSize: 11,
    color: '#12B76A',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ShelterListScreen;

