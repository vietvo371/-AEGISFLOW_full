import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, wp, hp
} from '../../theme';
import PageHeader from '../../component/PageHeader';
import { incidentService, Incident, UpdateIncidentData } from '../../services/incidentService';
import { RootStackParamList } from '../../navigation/types';

type IncidentDetailRouteProp = RouteProp<RootStackParamList, 'IncidentDetail'>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<string, { label: string; color: string; icon: string }> = {
  critical: { label: 'Nguy hiểm',   color: '#EF4444', icon: 'alert-octagon' },
  high:     { label: 'Cao',          color: '#F97316', icon: 'alert' },
  medium:   { label: 'Trung bình',  color: '#F59E0B', icon: 'alert-circle' },
  low:      { label: 'Thấp',         color: '#10B981', icon: 'information' },
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  open:          { label: 'Mở',           color: '#EF4444', icon: 'record-circle' },
  investigating: { label: 'Đang xử lý',   color: '#F59E0B', icon: 'progress-clock' },
  resolved:      { label: 'Đã giải quyết',color: '#10B981', icon: 'check-circle' },
  closed:        { label: 'Đã đóng',      color: '#6B7280', icon: 'close-circle' },
};

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  accident:     { label: 'Tai nạn',    icon: 'car-emergency' },
  congestion:   { label: 'Ùn tắc',     icon: 'car-brake-alert' },
  construction: { label: 'Thi công',   icon: 'hard-hat' },
  weather:      { label: 'Thời tiết',  icon: 'weather-lightning-rainy' },
  other:        { label: 'Khác',       icon: 'alert-circle-outline' },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const parseAIContent = (content: any): string => {
  if (!content) return '';
  let parsed: any = content;

  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      return content;
    }
  }

  // 1. Dạng object phức tạp (Dự báo AI có model_version, prediction_edges)
  if (parsed.model_version && Array.isArray(parsed.prediction_edges)) {
    if (parsed.prediction_edges.length === 0) {
      if (parsed.status === 'completed') {
        return `Mô hình ${parsed.model_version}: Hệ thống đã phân tích nhưng không phát hiện ảnh hưởng lan rộng đáng kể đến các tuyến giao thông lân cận.`;
      }
      return `Mô hình ${parsed.model_version}: Đang xử lý [${parsed.status}]. ${parsed.error_message || ''}`;
    }

    const edgesInfos = parsed.prediction_edges.map((pe: any) => {
      const roadName = pe.edge?.name || `Tuyến đường #${pe.edge_id}`;
      const time = pe.time_horizon_minutes;
      const sevMap: Record<string, string> = {
        severe: '🚨 Nghiêm trọng',
        heavy: '🔴 Nặng',
        high: '🟠 Cao',
        moderate: '🟡 Vừa', 
        medium: '🟡 Trung bình',
        low: '🟢 Thấp',
        light: '🟢 Nhẹ'
      };
      const severity = sevMap[pe.severity?.toLowerCase()] || pe.severity;
      const conf = Math.round(Number(pe.confidence || 0) * 100) + '%';
      
      return `${roadName}: Mức độ ${severity} sau ${time} phút (Độ tin cậy: ${conf})`;
    });

    return `Dự báo từ mô hình ${parsed.model_version}:\n` + edgesInfos.map((e: string) => `• ${e}`).join('\n');
  }

  // 2. Dạng text thông thường (Gợi ý AI có description, message...)
  const simpleText = parsed.description || parsed.message || parsed.title || parsed.prediction || parsed.text || parsed.content || parsed.insight || parsed.impact;
  if (simpleText) {
    return typeof simpleText === 'string' ? simpleText : JSON.stringify(simpleText);
  }

  // 3. Fallback
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
};

// ─── Component ──────────────────────────────────────────────────────────────

const IncidentDetailScreen = () => {
  const route      = useRoute<IncidentDetailRouteProp>();
  const navigation = useNavigation();
  const { id }     = route.params;

  const [incident, setIncident]   = useState<Incident | null>(null);
  const [loading, setLoading]     = useState(true);
  const [dispatching, setDispatching] = useState(false);

  const fetchIncident = useCallback(async () => {
    try {
      setLoading(true);
      const res = await incidentService.getIncident(id);
      if (res.success) setIncident(res.data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải thông tin sự cố.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchIncident(); }, [fetchIncident]);

  const handleDispatch = async () => {
    if (!incident) return;
    Alert.alert(
      'Xác nhận điều phối',
      `Điều phối đơn vị đến sự cố "${incident.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Điều phối',
          style: 'destructive',
          onPress: async () => {
            try {
              setDispatching(true);
              const update: UpdateIncidentData = { status: 'investigating' };
              await incidentService.updateIncident(id, update);
              await fetchIncident();
              Alert.alert('Thành công', 'Đã chuyển trạng thái sang "Đang xử lý".');
            } catch {
              Alert.alert('Lỗi', 'Không thể điều phối. Thử lại sau.');
            } finally {
              setDispatching(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (newStatus: UpdateIncidentData['status']) => {
    if (!newStatus) return;
    Alert.alert(
      'Cập nhật trạng thái',
      `Đổi sang "${STATUS_MAP[newStatus]?.label}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await incidentService.updateIncident(id, { status: newStatus });
              await fetchIncident();
            } catch {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  // ─── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.center}>
        <Icon name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>Không tìm thấy sự cố</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const severity   = SEVERITY_MAP[incident.severity]   || SEVERITY_MAP.medium;
  const status     = STATUS_MAP[incident.status]       || STATUS_MAP.open;
  const typeInfo   = TYPE_MAP[incident.type]           || TYPE_MAP.other;

  const isOpen          = incident.status === 'open';
  const isInvestigating = incident.status === 'investigating';
  const isResolved      = ['resolved', 'closed'].includes(incident.status);

  // Timeline steps derived from status
  const timelineEvents = [
    {
      key:   'reported',
      label: 'Báo cáo',
      time:  incident.created_at,
      color: '#EF4444',
      icon:  'flag',
      done:  true,
    },
    {
      key:   'investigating',
      label: 'Đang xử lý',
      time:  isInvestigating || isResolved ? incident.updated_at : null,
      color: '#F59E0B',
      icon:  'progress-clock',
      done:  isInvestigating || isResolved,
    },
    {
      key:   'resolved',
      label: 'Hoàn thành',
      time:  incident.resolved_at,
      color: '#10B981',
      icon:  'check-circle',
      done:  !!incident.resolved_at,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader 
        title={`Chi tiết #${incident.id}`}
        subtitle={typeInfo.label}
        variant="default"
        showNotification={true}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Hero: Badges + Title + Meta ── */}
        <View style={[styles.heroCard, { borderLeftColor: severity.color, borderLeftWidth: 4 }]}>
          {/* Top badges row */}
          <View style={styles.badgeRow}>
            {/* Severity */}
            <View style={[styles.badge, { backgroundColor: severity.color + '15' }]}>
              <Icon name={severity.icon} size={12} color={severity.color} />
              <Text style={[styles.badgeText, { color: severity.color }]}>{severity.label.toUpperCase()}</Text>
            </View>
            {/* Status */}
            <View style={[styles.badge, { backgroundColor: status.color + '15' }]}>
              <Icon name={status.icon} size={12} color={status.color} />
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label.toUpperCase()}</Text>
            </View>
            {/* Type */}
            <View style={[styles.badge, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Icon name={typeInfo.icon} size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{typeInfo.label.toUpperCase()}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.heroTitle}>{incident.title}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="clock-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{fmtDate(incident.created_at)}</Text>
            </View>
          </View>
          {incident.location_name && (
            <View style={styles.metaItem}>
              <Icon name="map-marker-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{incident.location_name}</Text>
            </View>
          )}
          {incident.location && (
            <View style={[styles.metaItem, { marginTop: 2 }]}>
              <Icon name="crosshairs-gps" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>
                {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Incident Details ── */}
        {incident.description ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MÔ TẢ SỰ CỐ</Text>
            <Text style={styles.descText}>{incident.description}</Text>
          </View>
        ) : null}

        {/* ── Reporter & Assigned ── */}
        <View style={styles.twoColRow}>
          {/* Reporter */}
          <View style={[styles.card, styles.halfCard, { borderLeftColor: '#8B5CF6', borderLeftWidth: 3 }]}>
            <Text style={styles.cardLabel}>NGƯỜI BÁO CÁO</Text>
            {incident.reporter ? (
              <>
                <View style={styles.personRow}>
                  <View style={[styles.avatar, { backgroundColor: '#8B5CF620' }]}>
                    <Icon name="account" size={18} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{incident.reporter.name}</Text>
                    <Text style={styles.personSub}>{incident.source === 'citizen' ? 'Công dân' : 'Vận hành viên'}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.unassigned}>Không rõ</Text>
            )}
          </View>

          {/* Assigned */}
          <View style={[styles.card, styles.halfCard, { borderLeftColor: '#3B82F6', borderLeftWidth: 3 }]}>
            <Text style={styles.cardLabel}>PHÂN CÔNG</Text>
            {incident.assignee ? (
              <View style={styles.personRow}>
                <View style={[styles.avatar, { backgroundColor: '#3B82F620' }]}>
                  <Icon name="shield-account" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{incident.assignee.name}</Text>
                  <Text style={styles.personSub}>Đơn vị xử lý</Text>
                </View>
              </View>
            ) : (
              <View style={styles.personRow}>
                <View style={[styles.avatar, { backgroundColor: '#6B728020' }]}>
                  <Icon name="account-question" size={18} color="#6B7280" />
                </View>
                <Text style={styles.unassigned}>Chưa phân công</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>QUICK ACTIONS</Text>

          {/* Dispatch - primary action */}
          {!isResolved && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.dispatchBtn]}
              onPress={handleDispatch}
              disabled={dispatching}
            >
              {dispatching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="phone-in-talk" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Điều phối đơn vị</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Secondary actions row */}
          <View style={styles.secondaryActions}>
            {isOpen && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: '#F59E0B20', backgroundColor: '#F59E0B08' }]}
                onPress={() => handleUpdateStatus('investigating')}
              >
                <Icon name="progress-clock" size={16} color="#F59E0B" />
                <Text style={[styles.secondaryBtnText, { color: '#F59E0B' }]}>Bắt đầu xử lý</Text>
              </TouchableOpacity>
            )}
            {(isOpen || isInvestigating) && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: '#10B98120', backgroundColor: '#10B98108' }]}
                onPress={() => handleUpdateStatus('resolved')}
              >
                <Icon name="check-circle-outline" size={16} color="#10B981" />
                <Text style={[styles.secondaryBtnText, { color: '#10B981' }]}>Đánh dấu xong</Text>
              </TouchableOpacity>
            )}
            {!isResolved && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: '#6B728020', backgroundColor: '#6B728008' }]}
                onPress={() => handleUpdateStatus('closed')}
              >
                <Icon name="close-circle-outline" size={16} color="#6B7280" />
                <Text style={[styles.secondaryBtnText, { color: '#6B7280' }]}>Đóng sự cố</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── AI Insights Row ── */}
        {( (incident.recommendations && incident.recommendations.length > 0) || (incident.predictions && incident.predictions.length > 0) ) && (
          <View style={styles.aiInsightsContainer}>
             {/* Recommendations Section */}
             {incident.recommendations && incident.recommendations.length > 0 && (
                <View style={styles.aiCard}>
                  <View style={styles.aiCardHeader}>
                    <View style={[styles.aiIconBox, { backgroundColor: '#EEF2FF' }]}>
                      <Icon name="brain" size={18} color="#6366F1" />
                    </View>
                    <Text style={[styles.aiCardTitle, { color: '#6366F1' }]}>Gợi ý xử lý AI</Text>
                  </View>
                  <View style={styles.aiContentBox}>
                    {incident.recommendations.map((rec: any, idx: number) => (
                      <View key={idx} style={styles.recListItem}>
                        <View style={[styles.bullet, { backgroundColor: '#6366F1' }]} />
                        <Text style={styles.aiResultText}>{parseAIContent(rec)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
             )}

             {/* Predictions Section */}
             {incident.predictions && incident.predictions.length > 0 && (
                <View style={[styles.aiCard, { marginTop: SPACING.md }]}>
                  <View style={styles.aiCardHeader}>
                    <View style={[styles.aiIconBox, { backgroundColor: '#F5F3FF' }]}>
                      <Icon name="chart-timeline-variant" size={18} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.aiCardTitle, { color: '#8B5CF6' }]}>Dự báo tác động AI</Text>
                  </View>
                  <View style={styles.aiContentBox}>
                    {incident.predictions.map((pred: any, idx: number) => (
                      <View key={idx} style={styles.recListItem}>
                        <View style={[styles.bullet, { backgroundColor: '#8B5CF6' }]} />
                        <Text style={styles.aiResultText}>{parseAIContent(pred)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
             )}
          </View>
        )}

        {/* ── Timeline ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TIMELINE</Text>
          {timelineEvents.map((event, idx) => (
            <View key={event.key} style={styles.timelineRow}>
              {/* Dot + line */}
              <View style={styles.timelineDotCol}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: event.done ? event.color : theme.colors.backgroundSecondary,
                    borderColor: event.done ? event.color : theme.colors.border }
                ]}>
                  {event.done && <Icon name={event.icon} size={10} color="#fff" />}
                </View>
                {idx < timelineEvents.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: timelineEvents[idx + 1].done ? event.color + '40' : theme.colors.border }]} />
                )}
              </View>

              {/* Content */}
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, { color: event.done ? theme.colors.text : theme.colors.textSecondary }]}>
                  {event.label}
                </Text>
                {event.time ? (
                  <Text style={styles.timelineTime}>{fmtDate(event.time)}</Text>
                ) : (
                  <Text style={[styles.timelineTime, { fontStyle: 'italic' }]}>Chưa xảy ra</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── Metadata ── */}
        {incident.metadata && Object.keys(incident.metadata).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DỮ LIỆU BỔ SUNG</Text>
            {Object.entries(incident.metadata).map(([key, value]) => (
              <View key={key} style={styles.metadataRow}>
                <Text style={styles.metadataKey}>{key}</Text>
                <Text style={styles.metadataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.md, color: theme.colors.textSecondary, fontSize: FONT_SIZE.sm },
  emptyText:   { marginTop: SPACING.md, color: theme.colors.textSecondary, fontSize: FONT_SIZE.md },
  backBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: SCREEN_PADDING.horizontal, paddingTop: SPACING.md, paddingBottom: 60 },

  // AI Sections
  aiInsightsContainer: {
    marginBottom: SPACING.md,
  },
  aiCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.05)',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 10,
  },
  aiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCardTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiContentBox: {
    gap: SPACING.sm,
  },
  recListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: BORDER_RADIUS.lg,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  aiResultText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: theme.colors.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },

  // Hero
  heroCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  badgeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 28,
    marginBottom: SPACING.sm,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary },

  // Description
  descText: { fontSize: FONT_SIZE.md, color: theme.colors.text, lineHeight: 24 },

  // Two columns
  twoColRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  halfCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: 0,
    ...theme.shadows.sm,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  personName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: theme.colors.text },
  personSub:  { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary },
  unassigned: { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 4 },

  // Actions
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
  },
  dispatchBtn: { backgroundColor: '#F43F5E' },
  actionBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#fff' },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg, borderWidth: 1,
    minWidth: '45%',
  },
  secondaryBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },

  // Recommendations / Predictions
  recItem: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, alignItems: 'flex-start' },
  recText: { flex: 1, fontSize: FONT_SIZE.sm, color: theme.colors.text, lineHeight: 20 },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineDotCol: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 0,
  },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
  timelineContent: { flex: 1, paddingLeft: SPACING.md, paddingBottom: SPACING.md },
  timelineLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700' },
  timelineTime:  { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary, marginTop: 2 },

  // Metadata table
  metadataRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  metadataKey:   { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary },
  metadataValue: { fontSize: FONT_SIZE.sm, color: theme.colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

export default IncidentDetailScreen;
