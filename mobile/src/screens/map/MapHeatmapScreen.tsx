import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE } from '../../theme';

const MapHeatmapScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title="Bản đồ nhiệt" variant="simple" />
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Bản đồ nhiệt đang được phát triển</Text>
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


