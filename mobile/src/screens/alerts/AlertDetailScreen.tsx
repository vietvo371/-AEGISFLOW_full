import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme';
import { alertService, AlertItem } from '../../services/alertService';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  critical: { label: 'NGUY CẤP', color: '#EF4444', bg: '#FEF2F2', icon: 'alert-octagon' },
  high: { label: 'CAO', color: '#F97316', bg: '#FFF7ED', icon: 'alert-circle' },
  medium: { label: 'TRUNG BÌNH', color: '#F59E0B', bg: '#FEFCE8', icon: 'alert' },
  low: { label: 'THẤP', color: '#3B82F6', bg: '#EFF6FF', icon: 'information' },
};

const ALERT_TYPE_MAP: Record<string, string> = {
  flood_warning: 'Cảnh báo ngập lụt',
  rescue_dispatch: 'Điều động cứu hộ',
  weather_alert: 'Tin thời tiết',
  evacuation_order: 'Lệnh sơ tán',
  general_alert: 'Thông báo chung',
};

const AlertDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();

  const [alert, setAlert] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await alertService.getAlertDetail(id);
        setAlert(res.data as any);
      } catch { /* */ } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>Không tìm thấy cảnh báo</Text>
          <TouchableOpacity style={styles.backBtnText} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnTextContent}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sevConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
  const alertTypeLabel = ALERT_TYPE_MAP[alert.alert_type] || alert.alert_type_label || alert.alert_type;
  const statusLabel = alert.status === 'active' ? 'Đang hiệu lực' : 'Đã hết hạn';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      
      {/* Premium Header */}
      <View style={[styles.topBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevron-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết cảnh báo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Severity Banner */}
        <View style={[styles.severityBanner, { backgroundColor: sevConfig.bg }]}>
          <View style={[styles.iconCircle, { backgroundColor: sevConfig.color + '18' }]}>
            <Icon name={sevConfig.icon} size={26} color={sevConfig.color} />
          </View>
          <View style={styles.bannerMeta}>
            <Text style={[styles.severityLabel, { color: sevConfig.color }]}>
              {sevConfig.label}
            </Text>
            <Text style={styles.alertType}>{alertTypeLabel}</Text>
          </View>
          <View style={[styles.statusChip, alert.status === 'active' && { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statusChipText, alert.status === 'active' && { color: '#16A34A' }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.mainCard}>
          <Text style={styles.title}>{alert.title}</Text>
          {alert.description && (
            <Text style={styles.description}>{alert.description}</Text>
          )}
        </View>

        {/* Information Grid Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Thông tin chi tiết</Text>
          
          {alert.effective_from && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Icon name="clock-start" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Thời gian bắt đầu</Text>
                <Text style={styles.infoValue}>
                  {new Date(alert.effective_from).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          )}

          {alert.effective_until && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Icon name="clock-end" size={20} color="#F79009" />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Thời gian kết thúc</Text>
                <Text style={styles.infoValue}>
                  {new Date(alert.effective_until).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          )}

          {alert.source && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Icon name="source-branch" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Nguồn phát hành</Text>
                <Text style={styles.infoValue}>
                  {alert.source === 'operator' ? 'Ban chỉ huy phòng chống thiên tai' : alert.source}
                </Text>
              </View>
            </View>
          )}

          {alert.issuer && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Icon name="account-tie-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Người điều phối</Text>
                <Text style={styles.infoValue}>{alert.issuer.name}</Text>
              </View>
            </View>
          )}
        </View>

        {alert.related_incident_id && (
          <TouchableOpacity
            style={styles.relatedBtn}
            onPress={() => navigation.navigate('IncidentDetail', { id: alert.related_incident_id })}
            activeOpacity={0.8}
          >
            <View style={styles.relatedIconWrap}>
              <Icon name="link-variant" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.relatedBtnText}>Xem chi tiết sự cố ngập lụt liên quan</Text>
            <Icon name="chevron-right" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12, marginBottom: 20 },
  backBtnText: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 20 },
  backBtnTextContent: { color: '#FFF', fontWeight: '600' },
  
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: '#EEF2F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  
  content: { padding: 16, gap: 16 },
  
  severityBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  bannerMeta: { flex: 1, marginLeft: 14 },
  severityLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  alertType: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F1F5F9' },
  statusChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  
  mainCard: {
    backgroundColor: theme.colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#EEF2F6',
    shadowColor: '#090A1D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, lineHeight: 28, marginBottom: 12 },
  description: { fontSize: 15, color: '#475569', lineHeight: 24 },
  
  infoCard: {
    backgroundColor: theme.colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#EEF2F6', gap: 16,
    shadowColor: '#090A1D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 1 },
  
  relatedBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#F5F3FF', borderRadius: 16,
    borderWidth: 1, borderColor: '#DDD6FE', gap: 12,
  },
  relatedIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  relatedBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.primary },
});

export default AlertDetailScreen;

