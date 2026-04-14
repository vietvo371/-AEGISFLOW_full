import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {
  theme,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  SCREEN_PADDING,
  ICON_SIZE,
  wp,
} from '../../theme';
import PageHeader from '../../component/PageHeader';
import ReportCard from '../../components/reports/ReportCard';
import { ReportFilterModal, FilterOptions } from '../../components/reports/ReportFilters';
import { reportService } from '../../services/reportService';
import { Report } from '../../types/api/report';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ReportsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchQuery || undefined
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchReports = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        isRefresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await reportService.getReports({
        ...filters,
        page,
        per_page: 20
      });

      if (response.success && response.data) {
        console.log('Reports response:', response.data);

        // Laravel pagination: data is wrapped in response.data.data
        const reportsData = (response.data as any).data || response.data;
        const extractedReports = Array.isArray(reportsData) ? reportsData : [];
        console.log('Extracted reports:', extractedReports);
        console.log('Reports count:', extractedReports.length);

        if (page === 1) {
          setReports(extractedReports);
        } else {
          setReports(prev => [...prev, ...extractedReports]);
        }

        // Handle pagination meta - can be in response.meta OR response.data itself
        if (response.meta || (response.data as any).last_page) {
          const meta = response.meta || response.data;
          setCurrentPage((meta as any).current_page || page);
          setTotalPages((meta as any).last_page || 1);
        }
      }
    } catch (error) {
      console.error('Fetch reports error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports(1);
  }, [filters]);

  const onRefresh = useCallback(() => {
    fetchReports(1, true);
  }, [fetchReports]);

  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchReports(currentPage + 1);
    }
  };

  const handleReportPress = useCallback((report: Report) => {
    navigation.navigate('IncidentDetail' as any, { id: report.id });
  }, [navigation]);

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const renderReportItem = useCallback(({ item }: { item: Report }) => (
    <ReportCard
      report={item}
      onPress={() => handleReportPress(item)}
    />
  ), [handleReportPress]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Icon name="file-document-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>Không có phản ánh nào</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateReport')}
        >
          <Icon name="plus-circle" size={20} color={theme.colors.white} />
          <Text style={styles.createButtonText}>Tạo phản ánh mới</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, navigation]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const getSubtitle = () => {
    if (loading) return 'Đang tải...';
    const total = reports.length;
    if (total === 0) return 'Chưa có phản ánh';
    return `${total} phản ánh`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <PageHeader
        title=''
        variant="default"
        rightIcon="plus-circle"
        onRightPress={() => navigation.navigate('CreateReport')}
      />

      {/* Header Search Bar */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={ICON_SIZE.md} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm phản ánh..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <Icon name="tune-variant" size={ICON_SIZE.md} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ReportFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={handleFiltersChange}
      />

      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      {/* <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateReport')}
      >
        <Icon name="plus" size={28} color={theme.colors.white} />
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.md,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    height: '100%',
  },
  listContent: {
    padding: SCREEN_PADDING.horizontal,
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING['4xl'],
  },
  emptyText: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    color: theme.colors.textSecondary,
    fontSize: FONT_SIZE.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ReportsScreen;
