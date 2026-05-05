import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';

const SETTINGS = [
  {
    title: 'Cảnh báo',
    items: [
      { id: 'alerts', icon: 'alert-circle-outline', label: 'Cảnh báo ngập lụt', desc: 'Nhận thông báo khi có cảnh báo mới' },
      { id: 'critical', icon: 'alert-octagon', label: 'Cảnh báo khẩn cấp', desc: 'Luôn nhận dù tắt thông báo chung' },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { id: 'report_status', icon: 'file-document-outline', label: 'Cập nhật báo cáo', desc: 'Khi báo cáo của bạn được xử lý' },
      { id: 'comments', icon: 'comment-outline', label: 'Bình luận mới', desc: 'Khi có bình luận trên báo cáo của bạn' },
    ],
  },
  {
    title: 'Cứu hộ',
    items: [
      { id: 'rescue_update', icon: 'lifebuoy', label: 'Cập nhật cứu hộ', desc: 'Trạng thái yêu cầu cứu hộ' },
      { id: 'team_assigned', icon: 'account-group', label: 'Đội được phân công', desc: 'Khi đội cứu hộ được gán' },
    ],
  },
];

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    alerts: true, critical: true, report_status: true,
    comments: true, rescue_update: true, team_assigned: true,
  });

  const toggle = (id: string) => setEnabled(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt thông báo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SETTINGS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View key={item.id} style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}>
                  <View style={styles.iconWrap}>
                    <Icon name={item.icon} size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.desc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={enabled[item.id]}
                    onValueChange={() => toggle(item.id)}
                    trackColor={{ false: '#E5E7EB', true: theme.colors.primary + '60' }}
                    thumbColor={enabled[item.id] ? theme.colors.primary : '#fff'}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.text },

  scroll: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  desc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
});

export default NotificationSettingsScreen;
