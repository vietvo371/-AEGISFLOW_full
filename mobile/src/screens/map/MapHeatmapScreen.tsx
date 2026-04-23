import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE } from '../../theme';

const MapHeatmapScreen = () => {
  const { t } = useTranslation();
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title={t('map.heatmap')} variant="simple" />
      <View style={styles.content}>
        <Text style={styles.placeholderText}>{t('common.loading')}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  placeholderText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
  },
});

export default MapHeatmapScreen;
