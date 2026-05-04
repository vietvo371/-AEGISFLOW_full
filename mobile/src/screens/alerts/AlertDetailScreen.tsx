import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme';
import { alertService, AlertItem } from '../../services/alertService';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: '#EF4444', bg: '#FEF2F2' },
  high: { color: '#F97316', bg: '#FFF7ED' },
  medium: { color: '#EAB308', bg: '#FEFCE8' },
  low: { color: '#3B82F6', bg: '#EFF6FF' },
};

const AlertDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

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
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!alert) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Không tìm thấy cảnh báo</Text>
        </View>
      </SafeAreaView>
    );
  }

  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết cảnh báo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.severityBanner, { backgroundColor: severity.bg }]}>
          <Icon name="alert-circle" size={28} color={severity.color} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.severityLabel, { color: severity.color }]}>
              {alert.severity_label || alert.severity}
            </Text>
            <Text style={styles.alertType}>{alert.alert_type_label || alert.alert_type}</Text>
          </View>
          <View style={[styles.statusChip, alert.status === 'active' && { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statusChipText, alert.status === 'active' && { color: '#16A34A' }]}>
              {alert.status_label || alert.status}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{alert.title}</Text>

        {alert.description && (
          <Text style={styles.description}>{alert.description}</Text>
        )}

        <View style={styles.infoSection}>
          {alert.effective_from && (
            <View style={styles.infoRow}>
              <Icon name="clock-start" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.infoLabel}>Bắt đầu:</Text>
              <Text style={styles.infoValue}>
                {new Date(alert.effective_from).toLocaleString('vi-VN')}
              </Text>
            </View>
          )}
          {alert.effective_until && (
            <View style={styles.infoRow}>
              <Icon name="clock-end" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.infoLabel}>Kết thúc:</Text>
              <Text style={styles.infoValue}>
                {new Date(alert.effective_until).toLocaleString('vi-VN')}
              </Text>
            </View>
          )}
          {alert.source && (
            <View style={styles.infoRow}>
              <Icon name="source-branch" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.infoLabel}>Nguồn:</Text>
              <Text style={styles.infoValue}>{alert.source}</Text>
            </View>
          )}
          {alert.issuer && (
            <View style={styles.infoRow}>
              <Icon name="account" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.infoLabel}>Phát hành:</Text>
              <Text style={styles.infoValue}>{alert.issuer.name}</Text>
            </View>
          )}
        </View>

        {alert.related_incident_id && (
          <TouchableOpacity
            style={styles.relatedBtn}
            onPress={() => navigation.navigate('IncidentDetail', { id: alert.related_incident_id })}
          >
            <Icon name="link-variant" size={18} color={theme.colors.primary} />
            <Text style={styles.relatedBtnText}>Xem sự cố liên quan</Text>
            <Icon name="chevron-right" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  content: { padding: 20 },
  severityBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 16,
  },
  severityLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  alertType: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  statusChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  description: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  infoSection: { backgroundColor: theme.colors.white, borderRadius: 12, padding: 16, gap: 12, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: theme.colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  relatedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14,
    backgroundColor: theme.colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  relatedBtnText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.primary },
});

export default AlertDetailScreen;
