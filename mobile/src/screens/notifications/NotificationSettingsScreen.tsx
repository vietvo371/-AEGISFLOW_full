import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../contexts/ThemeContext';
import PageHeader from '../../component/PageHeader';

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    alerts: true, critical: true, report_status: true,
    comments: true, rescue_update: true, team_assigned: true,
  });

  const toggle = (id: string) => setEnabled(prev => ({ ...prev, [id]: !prev[id] }));

  const settingsData = [
    {
      title: t('notificationSettingsScreen.sectionFloodAlerts', 'Cảnh báo ngập lụt'),
      items: [
        {
          id: 'alerts',
          icon: 'alert-circle-outline',
          label: t('notificationSettingsScreen.alerts', 'Cảnh báo thiên tai'),
          desc: t('notificationSettingsScreen.alertsDesc', 'Nhận thông báo khi có diễn biến ngập lụt mới tại khu vực'),
          activeColor: '#EF4444'
        },
        {
          id: 'critical',
          icon: 'alert-octagon-outline',
          label: t('notificationSettingsScreen.critical', 'Thông báo khẩn cấp'),
          desc: t('notificationSettingsScreen.criticalDesc', 'Luôn nhận thông báo nguy cấp từ Ban Chỉ Huy cả khi tắt chuông'),
          activeColor: '#EF4444'
        },
      ],
    },
    {
      title: t('notificationSettingsScreen.sectionCommunity', 'Báo cáo cộng đồng'),
      items: [
        {
          id: 'report_status',
          icon: 'file-document-edit-outline',
          label: t('notificationSettingsScreen.reportStatus', 'Trạng thái phản ánh'),
          desc: t('notificationSettingsScreen.reportStatusDesc', 'Nhận tin nhắn khi báo cáo của bạn được phê duyệt hoặc xử lý'),
          activeColor: '#7a5af8'
        },
        {
          id: 'comments',
          icon: 'comment-multiple-outline',
          label: t('notificationSettingsScreen.comments', 'Bình luận & phản hồi'),
          desc: t('notificationSettingsScreen.commentsDesc', 'Thông báo khi có trao đổi mới trên bài đăng phản ánh ngập'),
          activeColor: '#7a5af8'
        },
      ],
    },
    {
      title: t('notificationSettingsScreen.sectionRescue', 'Hỗ trợ cứu hộ'),
      items: [
        {
          id: 'rescue_update',
          icon: 'lifebuoy',
          label: t('notificationSettingsScreen.rescueUpdate', 'Yêu cầu cứu trợ SOS'),
          desc: t('notificationSettingsScreen.rescueUpdateDesc', 'Cập nhật hành trình tiếp cận cứu hộ từ lực lượng phản ứng nhanh'),
          activeColor: '#10B981'
        },
        {
          id: 'team_assigned',
          icon: 'account-group-outline',
          label: t('notificationSettingsScreen.teamAssigned', 'Thông tin đội cứu hộ'),
          desc: t('notificationSettingsScreen.teamAssignedDesc', 'Thông báo khi đã chỉ định được đội phản ứng nhanh đến hỗ trợ'),
          activeColor: '#10B981'
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title={t('notificationSettingsScreen.title', 'Cài đặt thông báo')} variant="default" showBack={true} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          {t('notificationSettingsScreen.description', 'Tùy chỉnh cách bạn nhận thông báo thời gian thực từ nền tảng AegisFlow để luôn cập nhật tình hình khí tượng và ngập lụt sớm nhất.')}
        </Text>

        {settingsData.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View key={item.id} style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}>
                  <View style={[styles.iconWrap, { backgroundColor: item.activeColor + '15' }]}>
                    <Icon name={item.icon} size={22} color={item.activeColor} />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.desc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={enabled[item.id]}
                    onValueChange={() => toggle(item.id)}
                    trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: item.activeColor + '50' }}
                    thumbColor={enabled[item.id] ? item.activeColor : (isDark ? '#94A3B8' : '#FFFFFF')}
                    ios_backgroundColor={isDark ? '#334155' : '#E2E8F0'}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.footerNote}>
          <Icon name="shield-check-outline" size={16} color={colors.textTertiary} />
          <Text style={styles.footerNoteText}>
            {t('notificationSettingsScreen.footerNote', 'AegisFlow bảo mật thông tin liên lạc và quyền riêng tư của bạn')}
          </Text>
        </View>
        <View style={styles.scrollFooterSpacing} />
      </ScrollView>
    </View>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: { padding: 16, gap: 20 },
  introText: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: 4, marginBottom: 4,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.0, marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  desc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  
  footerNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12,
  },
  footerNoteText: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
  scrollFooterSpacing: { height: 40 },
});
export default NotificationSettingsScreen;
