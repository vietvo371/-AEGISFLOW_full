import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, wp } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { useTranslation } from '../../hooks/useTranslation';

const { width } = Dimensions.get('window');

interface SensorHistoryItem {
  timestamp: string;
  value: number;
}

interface SensorDetailScreenProps {
  navigation: any;
  route: {
    params?: {
      sensorId?: number;
    };
  };
}

const SensorDetailScreen: React.FC<SensorDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const sensorId = route.params?.sensorId;
  const [loading, setLoading] = useState(true);
  const [sensor, setSensor] = useState<any>(null);
  const [history, setHistory] = useState<SensorHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSensorData();
  }, [sensorId]);

  const fetchSensorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call - in real app, call backend API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock sensor data
      const mockSensor = getMockSensor(sensorId || 1);
      setSensor(mockSensor);
      setHistory(mockSensor.history);
    } catch (err) {
      setError(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const getMockSensor = (id: number) => {
    const sensors = [
      {
        id: 1,
        ten_tram: 'Cảm biến Mực nước Cầu Sông Hàn',
        dia_chi: 'Cầu Sông Hàn, Đà Nẵng',
        latitude: 16.0679,
        longitude: 108.2130,
        loai: 'water_level',
        trang_thai: 'online',
        gia_tri_hien_tai: 2.3,
        don_vi: 'm',
        nguong_binh_thuong: 2.0,
        nguong_canh_bao: 3.0,
        nguong_nguy_hiem: 4.5,
        thoi_gian_doc_cuoi: new Date().toISOString(),
        history: generateMockHistory(2.3, 0.5, 24),
      },
      {
        id: 2,
        ten_tram: 'Trạm đo mưa Hải Châu',
        dia_chi: 'Quận Hải Châu, Đà Nẵng',
        latitude: 16.0718,
        longitude: 108.2198,
        loai: 'rainfall',
        trang_thai: 'online',
        gia_tri_hien_tai: 45.2,
        don_vi: 'mm',
        nguong_binh_thuong: 20,
        nguong_canh_bao: 50,
        nguong_nguy_hiem: 100,
        thoi_gian_doc_cuoi: new Date().toISOString(),
        history: generateMockHistory(45.2, 10, 24),
      },
      {
        id: 3,
        ten_tram: 'Camera AI Ngã Tư Hùng Vương',
        dia_chi: 'Ngã tư Hùng Vương, Đà Nẵng',
        latitude: 16.0718,
        longitude: 108.2198,
        loai: 'camera',
        trang_thai: 'online',
        gia_tri_hien_tai: 0,
        don_vi: '',
        nguong_binh_thuong: 0,
        nguong_canh_bao: 0,
        nguong_nguy_hiem: 0,
        thoi_gian_doc_cuoi: new Date().toISOString(),
        history: [],
      },
    ];
    return sensors[id - 1] || sensors[0];
  };

  const generateMockHistory = (baseValue: number, variance: number, hours: number): SensorHistoryItem[] => {
    const data: SensorHistoryItem[] = [];
    const now = new Date();
    
    for (let i = hours; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const value = baseValue + (Math.random() - 0.5) * variance;
      data.push({
        timestamp: time.toISOString(),
        value: Math.max(0, value),
      });
    }
    return data;
  };

  const getSensorIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'water_level': 'water-level',
      'rainfall': 'weather-rainy',
      'camera': 'cctv',
      'combined': 'gauge',
    };
    return icons[type] || 'gauge';
  };

  const getSensorTypeText = (type: string): string => {
    const texts: Record<string, string> = {
      'water_level': 'Mực nước',
      'rainfall': 'Lượng mưa',
      'camera': 'Camera AI',
      'combined': 'Trạm kết hợp',
    };
    return texts[type] || 'Cảm biến';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'online': theme.colors.success,
      'offline': theme.colors.error,
      'maintenance': theme.colors.warning,
    };
    return colors[status] || theme.colors.success;
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      'online': 'Trực tuyến',
      'offline': 'Mất kết nối',
      'maintenance': 'Bảo trì',
    };
    return texts[status] || 'Không xác định';
  };

  const getRiskLevel = (): { level: string; color: string; icon: string } => {
    if (!sensor) return { level: 'normal', color: theme.colors.success, icon: 'check-circle' };
    
    const value = sensor.gia_tri_hien_tai;
    
    if (sensor.loai === 'water_level') {
      if (value >= sensor.nguong_nguy_hiem) return { level: 'danger', color: theme.colors.error, icon: 'alert-octagon' };
      if (value >= sensor.nguong_canh_bao) return { level: 'warning', color: theme.colors.warning, icon: 'alert' };
      if (value >= sensor.nguong_binh_thuong) return { level: 'attention', color: theme.colors.info, icon: 'alert-circle-outline' };
      return { level: 'normal', color: theme.colors.success, icon: 'check-circle' };
    } else if (sensor.loai === 'rainfall') {
      if (value >= sensor.nguong_nguy_hiem) return { level: 'danger', color: theme.colors.error, icon: 'alert-octagon' };
      if (value >= sensor.nguong_canh_bao) return { level: 'warning', color: theme.colors.warning, icon: 'alert' };
      if (value >= sensor.nguong_binh_thuong) return { level: 'attention', color: theme.colors.info, icon: 'alert-circle-outline' };
      return { level: 'normal', color: theme.colors.success, icon: 'check-circle' };
    }
    
    return { level: 'normal', color: theme.colors.success, icon: 'check-circle' };
  };

  const getRiskText = (): string => {
    const risk = getRiskLevel();
    const texts: Record<string, string> = {
      'normal': 'Bình thường',
      'attention': 'Theo dõi',
      'warning': 'Cảnh báo',
      'danger': 'Nguy hiểm',
    };
    return texts[risk.level] || 'Bình thường';
  };

  const getMaxValue = (): number => {
    if (!sensor) return 10;
    if (sensor.loai === 'water_level') return Math.max(sensor.nguong_nguy_hiem * 1.2, sensor.gia_tri_hien_tai * 1.2);
    return Math.max(sensor.nguong_nguy_hiem * 1.2, sensor.gia_tri_hien_tai * 1.2);
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !sensor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || 'Không tìm thấy cảm biến'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSensorData}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const risk = getRiskLevel();
  const maxValue = getMaxValue();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{sensor.ten_tram}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sensor.trang_thai) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensor.trang_thai) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(sensor.trang_thai) }]}>
              {getStatusText(sensor.trang_thai)}
            </Text>
          </View>
        </Animated.View>

        {/* Main Value Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.mainCard}>
          <View style={[styles.riskIndicator, { backgroundColor: risk.color + '20' }]}>
            <Icon name={risk.icon} size={24} color={risk.color} />
            <Text style={[styles.riskText, { color: risk.color }]}>{getRiskText()}</Text>
          </View>
          
          <View style={styles.mainValueContainer}>
            <Icon name={getSensorIcon(sensor.loai)} size={40} color={theme.colors.primary} />
            <View style={styles.mainValueInfo}>
              <Text style={styles.mainValue}>
                {sensor.gia_tri_hien_tai}
                <Text style={styles.mainUnit}>{sensor.don_vi}</Text>
              </Text>
              <Text style={styles.mainLabel}>{getSensorTypeText(sensor.loai)}</Text>
            </View>
          </View>

          <Text style={styles.lastUpdate}>
            Cập nhật: {sensor.thoi_gian_doc_cuoi ? formatTime(sensor.thoi_gian_doc_cuoi) : '--:--'}
          </Text>
        </Animated.View>

        {/* Threshold Levels */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Ngưỡng cảnh báo</Text>
          <View style={styles.thresholdCard}>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: theme.colors.success }]} />
              <View style={styles.thresholdInfo}>
                <Text style={styles.thresholdLabel}>Bình thường</Text>
                <Text style={styles.thresholdValue}>&lt; {sensor.nguong_binh_thuong} {sensor.don_vi}</Text>
              </View>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: theme.colors.warning }]} />
              <View style={styles.thresholdInfo}>
                <Text style={styles.thresholdLabel}>Cảnh báo</Text>
                <Text style={styles.thresholdValue}>{sensor.nguong_binh_thuong} - {sensor.nguong_canh_bao} {sensor.don_vi}</Text>
              </View>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: theme.colors.error }]} />
              <View style={styles.thresholdInfo}>
                <Text style={styles.thresholdLabel}>Nguy hiểm</Text>
                <Text style={styles.thresholdValue}>&gt; {sensor.nguong_canh_bao} {sensor.don_vi}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Mini Chart */}
        {history.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Biểu đồ 24h</Text>
            <View style={styles.chartCard}>
              <View style={styles.chartContainer}>
                {/* Simple bar chart visualization */}
                <View style={styles.chartBars}>
                  {history.slice(-12).map((item, index) => {
                    const heightPercent = (item.value / maxValue) * 100;
                    const isHigh = item.value >= sensor.nguong_canh_bao;
                    return (
                      <View key={index} style={styles.barContainer}>
                        <View 
                          style={[
                            styles.bar, 
                            { 
                              height: `${Math.max(heightPercent, 5)}%`,
                              backgroundColor: isHigh ? theme.colors.error : theme.colors.primary + '60'
                            }
                          ]} 
                        />
                        <Text style={styles.barLabel}>{formatTime(item.timestamp).split(':')[0]}h</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              
              {/* Current value indicator */}
              <View style={styles.currentIndicator}>
                <View style={[styles.currentLine, { backgroundColor: risk.color }]} />
                <View style={styles.currentLabel}>
                  <Text style={[styles.currentValueText, { color: risk.color }]}>
                    Hiện tại: {sensor.gia_tri_hien_tai} {sensor.don_vi}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Location Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Vị trí</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Icon name="map-marker" size={20} color={theme.colors.primary} />
              <Text style={styles.locationAddress} numberOfLines={2}>{sensor.dia_chi}</Text>
            </View>
            <View style={styles.locationCoords}>
              <Text style={styles.coordText}>
                {sensor.latitude.toFixed(6)}, {sensor.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity style={styles.directionsButton}>
                <Icon name="directions" size={16} color={theme.colors.primary} />
                <Text style={styles.directionsText}>Chỉ đường</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Sensor Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin trạm</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã trạm</Text>
              <Text style={styles.infoValue}>#{sensor.id.toString().padStart(6, '0')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loại cảm biến</Text>
              <Text style={styles.infoValue}>{getSensorTypeText(sensor.loai)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={[styles.infoValue, { color: getStatusColor(sensor.trang_thai) }]}>
                {getStatusText(sensor.trang_thai)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cập nhật lần cuối</Text>
              <Text style={styles.infoValue}>
                {sensor.thoi_gian_doc_cuoi 
                  ? new Date(sensor.thoi_gian_doc_cuoi).toLocaleString('vi-VN')
                  : '--'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.white,
    gap: SPACING.md,
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
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  mainCard: {
    marginHorizontal: SCREEN_PADDING.horizontal,
    marginTop: SPACING.md,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  riskText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  mainValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  mainValueInfo: {
    flex: 1,
  },
  mainValue: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.text,
  },
  mainUnit: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  mainLabel: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  lastUpdate: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  section: {
    marginTop: SPACING.lg,
    marginHorizontal: SCREEN_PADDING.horizontal,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: SPACING.md,
  },
  thresholdCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  thresholdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  thresholdInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdLabel: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  thresholdValue: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
  chartCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  chartContainer: {
    height: 120,
    marginBottom: SPACING.md,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  currentLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  currentLabel: {
    marginLeft: SPACING.sm,
  },
  currentValueText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationAddress: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  locationCoords: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  coordText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: BORDER_RADIUS.sm,
  },
  directionsText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
});

export default SensorDetailScreen;
