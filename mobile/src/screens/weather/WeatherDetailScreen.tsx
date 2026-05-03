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
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, wp, hp } from '../../theme';
import { weatherService, WeatherSummary, WeatherData, WeatherForecast } from '../../services/weatherService';
import { useTranslation } from '../../hooks/useTranslation';

const { width } = Dimensions.get('window');

const WeatherDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<WeatherData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [current, history, summary] = await Promise.all([
        weatherService.getCurrent().catch(() => null),
        weatherService.getHistory().catch(() => []),
        weatherService.getSummary().catch(() => null),
      ]);

      if (current) {
        setHourlyForecast([current, ...(Array.isArray(history) ? history.slice(0, 23) : [])]);
      }
      if (summary) {
        setWeather(summary);
      }
    } catch (err) {
      setError(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string): string => {
    const icons: Record<string, string> = {
      'Clear': 'weather-sunny',
      'Cloudy': 'weather-cloudy',
      'Rain': 'weather-rainy',
      'Heavy Rain': 'weather-pouring',
      'Thunderstorm': 'weather-lightning',
      'Drizzle': 'weather-partly-rainy',
      'Fog': 'weather-fog',
      'Snow': 'weather-snowy',
      'Windy': 'weather-windy',
    };
    return icons[condition] || 'weather-partly-cloudy';
  };

  const getAlertColor = (level: string): string => {
    const colors: Record<string, string> = {
      'none': theme.colors.success,
      'low': theme.colors.info,
      'medium': theme.colors.warning,
      'high': theme.colors.error,
    };
    return colors[level] || theme.colors.success;
  };

  const getAlertText = (level: string): string => {
    const texts: Record<string, string> = {
      'none': 'Không có cảnh báo',
      'low': 'Cảnh báo nhẹ',
      'medium': 'Cảnh báo vừa',
      'high': 'Cảnh báo cao',
    };
    return texts[level] || 'Không có cảnh báo';
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="weather-cloudy-alert" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWeatherData}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const current = weather?.current;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('flood.title')} & Thời tiết</Text>
          <View style={styles.headerRight} />
        </Animated.View>

        {/* Alert Banner */}
        {weather?.alert_level !== 'none' && (
          <Animated.View 
            entering={FadeInDown.duration(500).delay(100)}
            style={[styles.alertBanner, { backgroundColor: getAlertColor(weather?.alert_level || 'none') + '20' }]}
          >
            <Icon name="alert-circle" size={24} color={getAlertColor(weather?.alert_level || 'none')} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: getAlertColor(weather?.alert_level || 'none') }]}>
                {getAlertText(weather?.alert_level || 'none')}
              </Text>
              <Text style={styles.alertSubtitle}>
                {weather?.alert_level === 'high' ? 'Nguy cơ ngập lụt cao - Hạn chế di chuyển' :
                 weather?.alert_level === 'medium' ? 'Có khả năng mưa lớn - Cẩn thận' :
                 'Theo dõi tình hình thời tiết'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Current Weather Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.currentCard}>
          <View style={styles.currentMain}>
            <Icon 
              name={getWeatherIcon(current?.condition || 'Cloudy')} 
              size={80} 
              color={theme.colors.primary} 
            />
            <View style={styles.currentInfo}>
              <Text style={styles.temperature}>{current?.temperature ?? '--'}°C</Text>
              <Text style={styles.condition}>{current?.condition || 'Không xác định'}</Text>
            </View>
          </View>
          
          <View style={styles.currentDetails}>
            <View style={styles.detailItem}>
              <Icon name="water-percent" size={24} color={theme.colors.info} />
              <Text style={styles.detailLabel}>Độ ẩm</Text>
              <Text style={styles.detailValue}>{current?.humidity ?? '--'}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="weather-rainy" size={24} color={theme.colors.primary} />
              <Text style={styles.detailLabel}>Lượng mưa</Text>
              <Text style={styles.detailValue}>{current?.rainfall ?? '--'} mm</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="weather-windy" size={24} color={theme.colors.warning} />
              <Text style={styles.detailLabel}>Tốc độ gió</Text>
              <Text style={styles.detailValue}>{current?.wind_speed ?? '--'} km/h</Text>
            </View>
          </View>
        </Animated.View>

        {/* Forecast Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Dự báo 24h</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
            {hourlyForecast.slice(0, 12).map((hour, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastTime}>
                  {index === 0 ? 'Hiện tại' : `${index}h`}
                </Text>
                <Icon 
                  name={getWeatherIcon(hour.condition)} 
                  size={28} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.forecastTemp}>{hour.temperature}°</Text>
                <Icon name="water-percent" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.forecastHumidity}>{hour.humidity}%</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Weather Stats Grid */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Chỉ số thời tiết</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="thermometer" size={32} color={theme.colors.error} />
              <Text style={styles.statValue}>{current?.temperature ?? '--'}°C</Text>
              <Text style={styles.statLabel}>Nhiệt độ</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="water" size={32} color={theme.colors.info} />
              <Text style={styles.statValue}>{current?.humidity ?? '--'}%</Text>
              <Text style={styles.statLabel}>Độ ẩm</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="weather-rain" size={32} color={theme.colors.primary} />
              <Text style={styles.statValue}>{current?.rainfall ?? '--'} mm</Text>
              <Text style={styles.statLabel}>Lượng mưa</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="weather-windy-variant" size={32} color={theme.colors.warning} />
              <Text style={styles.statValue}>{current?.wind_speed ?? '--'} km/h</Text>
              <Text style={styles.statLabel}>Gió</Text>
            </View>
          </View>
        </Animated.View>

        {/* Flood Risk Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Cảnh báo ngập lụt</Text>
          <View style={styles.floodCard}>
            <View style={styles.floodHeader}>
              <Icon name="alert-flood" size={32} color={getAlertColor(weather?.alert_level || 'none')} />
              <View style={styles.floodHeaderText}>
                <Text style={[styles.floodTitle, { color: getAlertColor(weather?.alert_level || 'none') }]}>
                  {getAlertText(weather?.alert_level || 'none')}
                </Text>
                <Text style={styles.floodSubtitle}>
                  Cập nhật: {current?.timestamp ? new Date(current.timestamp).toLocaleString('vi-VN') : '--'}
                </Text>
              </View>
            </View>
            <View style={styles.floodLevels}>
              <View style={[styles.floodLevel, { backgroundColor: theme.colors.success + '20' }]}>
                <View style={[styles.floodDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.floodLevelText}>Bình thường</Text>
              </View>
              <View style={[styles.floodLevel, { backgroundColor: theme.colors.warning + '20' }]}>
                <View style={[styles.floodDot, { backgroundColor: theme.colors.warning }]} />
                <Text style={styles.floodLevelText}>Cảnh báo</Text>
              </View>
              <View style={[styles.floodLevel, { backgroundColor: theme.colors.error + '20' }]}>
                <View style={[styles.floodDot, { backgroundColor: theme.colors.error }]} />
                <Text style={styles.floodLevelText}>Nguy hiểm</Text>
              </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.md,
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
  headerRight: {
    width: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SCREEN_PADDING.horizontal,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  alertSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  currentCard: {
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
  currentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  currentInfo: {
    alignItems: 'center',
  },
  temperature: {
    fontSize: 56,
    fontWeight: '800',
    color: theme.colors.text,
  },
  condition: {
    fontSize: FONT_SIZE.lg,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  currentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  section: {
    marginTop: SPACING.lg,
    marginHorizontal: SCREEN_PADDING.horizontal,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: SPACING.md,
  },
  forecastScroll: {
    marginHorizontal: -SCREEN_PADDING.horizontal,
    paddingHorizontal: SCREEN_PADDING.horizontal,
  },
  forecastItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginRight: SPACING.sm,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 70,
    gap: SPACING.xs,
  },
  forecastTime: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  forecastTemp: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  forecastHumidity: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    width: (width - SCREEN_PADDING.horizontal * 2 - SPACING.md) / 2,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  floodCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  floodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  floodHeaderText: {
    flex: 1,
  },
  floodTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  floodSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  floodLevels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  floodLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  floodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  floodLevelText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.text,
    fontWeight: '500',
  },
});

export default WeatherDetailScreen;
