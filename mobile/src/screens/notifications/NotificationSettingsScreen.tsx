import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';

const SETTINGS = [
  {
    title: 'Cảnh báo ngập lụt',
    items: [
      { id: 'alerts', icon: 'alert-circle-outline', label: 'Cảnh báo thiên tai', desc: 'Nhận thông báo khi có diễn biến ngập lụt mới tại khu vực', activeColor: '#EF4444' },
      { id: 'critical', icon: 'alert-octagon-outline', label: 'Thông báo khẩn cấp', desc: 'Luôn nhận thông báo nguy cấp từ Ban Chỉ Huy cả khi tắt chuông', activeColor: '#EF4444' },
    ],
  },
  {
    title: 'Báo cáo cộng đồng',
    items: [
      { id: 'report_status', icon: 'file-document-edit-outline', label: 'Trạng thái phản ánh', desc: 'Nhận tin nhắn khi báo cáo của bạn được phê duyệt hoặc xử lý', activeColor: '#7a5af8' },
      { id: 'comments', icon: 'comment-multiple-outline', label: 'Bình luận & phản hồi', desc: 'Thông báo khi có trao đổi mới trên bài đăng phản ánh ngập', activeColor: '#7a5af8' },
    ],
  },
  {
    title: 'Hỗ trợ cứu hộ',
    items: [
      { id: 'rescue_update', icon: 'lifebuoy', label: 'Yêu cầu cứu trợ SOS', desc: 'Cập nhật hành trình tiếp cận cứu hộ từ lực lượng phản ứng nhanh', activeColor: '#10B981' },
      { id: 'team_assigned', icon: 'account-group-outline', label: 'Thông tin đội cứu hộ', desc: 'Thông báo khi đã chỉ định được đội phản ứng nhanh đến hỗ trợ', activeColor: '#10B981' },
    ],
  },
];

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    alerts: true, critical: true, report_status: true,
    comments: true, rescue_update: true, team_assigned: true,
  });

  const toggle = (id: string) => setEnabled(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevron-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt thông báo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Tùy chỉnh cách bạn nhận thông báo thời gian thực từ nền tảng AegisFlow để luôn cập nhật tình hình khí tượng và ngập lụt sớm nhất.
        </Text>

        {SETTINGS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View key={item.id} style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}>
                  <View style={[styles.iconWrap, { backgroundColor: item.activeColor + '10' }]}>
                    <Icon name={item.icon} size={22} color={item.activeColor} />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.desc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={enabled[item.id]}
                    onValueChange={() => toggle(item.id)}
                    trackColor={{ false: '#E2E8F0', true: item.activeColor + '50' }}
                    thumbColor={enabled[item.id] ? item.activeColor : '#FFFFFF'}
                    ios_backgroundColor="#E2E8F0"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.footerNote}>
          <Icon name="shield-check-outline" size={16} color="#94A3B8" />
          <Text style={styles.footerNoteText}>AegisFlow bảo mật thông tin liên lạc và quyền riêng tư của bạn</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: '#EEF2F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },

  scroll: { padding: 16, gap: 20 },
  introText: {
    fontSize: 13, color: '#64748B', lineHeight: 20, paddingHorizontal: 4, marginBottom: 4,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 1.0, marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EEF2F6',
    shadowColor: '#090A1D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  desc: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  
  footerNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  footerNoteText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
});

export default NotificationSettingsScreen;

