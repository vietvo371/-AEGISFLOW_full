import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE } from '../../theme';

const MyReportsScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title="Phản ánh của tôi" variant="simple" />
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Danh sách phản ánh của bạn đang được phát triển</Text>
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

export default MyReportsScreen;


