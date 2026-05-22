import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Geolocation from 'react-native-geolocation-service';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { rescueService, CreateRescueRequestData } from '../../services/rescueService';
import { mapService } from '../../services/mapService';

const RescueRequestScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const URGENCY_OPTIONS = [
    { value: 'low', label: t('citizen.rescue.form.urgency_low') || t('incidents.severity.low'), color: '#3B82F6', icon: 'information' },
    { value: 'medium', label: t('incidents.severity.medium'), color: '#EAB308', icon: 'alert-circle' },
    { value: 'high', label: t('incidents.severity.high'), color: '#F97316', icon: 'alert' },
    { value: 'critical', label: t('incidents.severity.critical'), color: '#EF4444', icon: 'alert-octagon' },
  ] as const;

  const CATEGORY_OPTIONS = [
    { value: 'rescue', label: t('citizen.rescue.form.rescue'), icon: 'lifebuoy' },
    { value: 'medical', label: t('citizen.rescue.form.medical'), icon: 'hospital-box' },
    { value: 'evacuation', label: t('citizen.rescue.form.evacuation'), icon: 'exit-run' },
    { value: 'food', label: t('citizen.rescue.form.food'), icon: 'food' },
    { value: 'water', label: t('citizen.rescue.form.water'), icon: 'cup-water' },
    { value: 'shelter', label: t('citizen.rescue.form.shelter'), icon: 'home-roof' },
    { value: 'other', label: t('citizen.sos.form.other'), icon: 'dots-horizontal' },
  ] as const;

  const VULNERABLE_OPTIONS = [
    { value: 'children', label: t('citizen.sos.form.children') },
    { value: 'elderly', label: t('citizen.sos.form.elderly') },
    { value: 'disabled', label: t('citizen.sos.form.disabled') },
    { value: 'pregnant', label: t('citizen.sos.form.pregnant') },
  ];

  const [form, setForm] = useState<Partial<CreateRescueRequestData>>({
    caller_name: user?.name || '',
    caller_phone: (user as any)?.phone || '',
    urgency: 'high',
    category: 'rescue',
    people_count: 1,
    vulnerable_groups: [],
    description: '',
    latitude: 0,
    longitude: 0,
    address: '',
  });

  useEffect(() => {
    Geolocation.getCurrentPosition(
      async (pos: any) => {
        const { latitude, longitude } = pos.coords;
        const address = await mapService.reverseGeocode(latitude, longitude);
        setForm(prev => ({ ...prev, latitude, longitude, address }));
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleVulnerable = (val: string) => {
    const current = form.vulnerable_groups || [];
    if (current.includes(val)) {
      setField('vulnerable_groups', current.filter(v => v !== val));
    } else {
      setField('vulnerable_groups', [...current, val]);
    }
  };

  const handleSubmit = async () => {
    if (!form.caller_name?.trim()) {
      Alert.alert(t('common.error'), t('auth.nameRequired'));
      return;
    }
    if (!form.latitude || !form.longitude) {
      Alert.alert(t('common.error'), t('citizen.sos.form.getLocation') + ' - GPS');
      return;
    }
    if (!form.address?.trim()) {
      Alert.alert(t('common.error'), t('citizen.sos.form.address') + ' ' + t('citizen.sos.form.required'));
    }

    setSubmitting(true);
    try {
      const res = await rescueService.createRescueRequest(form as CreateRescueRequestData);
      if (res.success) {
        Alert.alert(t('common.success'), t('citizen.sos.success.message'));
      } else {
        Alert.alert(t('common.error'), res.message || t('errors.unknownError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('errors.unknownError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('citizen.sos.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emergencyBanner}>
            <Icon name="phone-alert" size={24} color="#EF4444" />
            <Text style={styles.emergencyText}>
              {t('citizen.sos.warningMessage')}
            </Text>
          </View>

          {/* Thông tin cá nhân */}
          <Text style={styles.sectionTitle}>{t('citizen.rescue.form.fullName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.enterFullName')}
            value={form.caller_name}
            onChangeText={v => setField('caller_name', v)}
          />
          <TextInput
            style={styles.input}
            placeholder={t('citizen.rescue.form.phone')}
            value={form.caller_phone}
            onChangeText={v => setField('caller_phone', v)}
            keyboardType="phone-pad"
          />

          {/* Vị trí */}
          <Text style={styles.sectionTitle}>{t('citizen.sos.form.address')}</Text>
          {loadingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.locationLoadingText}>{t('citizen.sos.form.gettingLocation')}</Text>
            </View>
          ) : (
            <View style={styles.locationInfo}>
              <Icon name="map-marker" size={18} color={theme.colors.primary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {form.address || `${form.latitude?.toFixed(4)}, ${form.longitude?.toFixed(4)}`}
              </Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={t('citizen.sos.form.addressPlaceholder')}
            value={form.address}
            onChangeText={v => setField('address', v)}
            multiline
          />

          {/* Mức độ khẩn cấp */}
          <Text style={styles.sectionTitle}>{t('citizen.rescue.form.urgency')} *</Text>
          <View style={styles.optionGrid}>
            {URGENCY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionChip,
                  form.urgency === opt.value && { backgroundColor: opt.color + '15', borderColor: opt.color },
                ]}
                onPress={() => setField('urgency', opt.value)}
              >
                <Icon name={opt.icon} size={18} color={form.urgency === opt.value ? opt.color : theme.colors.textSecondary} />
                <Text style={[styles.optionText, form.urgency === opt.value && { color: opt.color, fontWeight: '600' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Loại hỗ trợ */}
          <Text style={styles.sectionTitle}>{t('citizen.rescue.form.category')} *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.categoryChip,
                  form.category === opt.value && styles.categorySelected,
                ]}
                onPress={() => setField('category', opt.value)}
              >
                <Icon
                  name={opt.icon}
                  size={22}
                  color={form.category === opt.value ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.categoryText, form.category === opt.value && styles.categoryTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Số người */}
          <Text style={styles.sectionTitle}>{t('citizen.rescue.form.peopleCount')}</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setField('people_count', Math.max(1, (form.people_count || 1) - 1))}
            >
              <Icon name="minus" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{form.people_count}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setField('people_count', (form.people_count || 1) + 1)}
            >
              <Icon name="plus" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Nhóm dễ bị tổn thương */}
          <Text style={styles.sectionTitle}>{t('citizen.sos.form.vulnerableGroups')}</Text>
          <View style={styles.optionGrid}>
            {VULNERABLE_OPTIONS.map(opt => {
              const selected = form.vulnerable_groups?.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionChip, selected && styles.optionChipSelected]}
                  onPress={() => toggleVulnerable(opt.value)}
                >
                  <Icon
                    name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={18}
                    color={selected ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.optionText, selected && { color: theme.colors.primary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mô tả */}
          <Text style={styles.sectionTitle}>{t('citizen.sos.form.description')}</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder={t('citizen.sos.form.descriptionPlaceholder')}
            value={form.description}
            onChangeText={v => setField('description', v)}
            multiline
          />

          {/* Mực nước */}
          <Text style={styles.sectionTitle}>{t('citizen.rescue.form.waterLevel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: 0.5"
            value={form.water_level_m?.toString() || ''}
            onChangeText={v => setField('water_level_m', v ? parseFloat(v) : undefined)}
            keyboardType="numeric"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>{t('citizen.sos.form.submit')}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  content: { padding: 20 },
  emergencyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#FECACA',
  },
  emergencyText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#991B1B' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.white, borderRadius: 10, padding: 14,
    fontSize: 15, color: theme.colors.text, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  locationLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  locationLoadingText: { fontSize: 13, color: theme.colors.textSecondary },
  locationInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, marginBottom: 8,
  },
  locationText: { flex: 1, fontSize: 13, color: theme.colors.text },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: theme.colors.white, borderWidth: 1, borderColor: '#E5E7EB',
  },
  optionChipSelected: { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary },
  optionText: { fontSize: 13, color: theme.colors.textSecondary },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: '#E5E7EB',
    minWidth: 80,
  },
  categorySelected: { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary },
  categoryText: { fontSize: 12, color: theme.colors.textSecondary },
  categoryTextSelected: { color: theme.colors.primary, fontWeight: '600' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.white,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  counterValue: { fontSize: 20, fontWeight: '600', color: theme.colors.text, minWidth: 40, textAlign: 'center' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EF4444', padding: 16, borderRadius: 14, marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default RescueRequestScreen;
