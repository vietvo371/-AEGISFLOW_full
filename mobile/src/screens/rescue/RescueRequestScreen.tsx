import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Image, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Geolocation from 'react-native-geolocation-service';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { rescueService, CreateRescueRequestData } from '../../services/rescueService';
import { mapService } from '../../services/mapService';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { mediaService } from '../../services/mediaService';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import { useAppTheme } from '../../contexts/ThemeContext';

const FALLBACK_LOCATION = {
  latitude: 16.0699,
  longitude: 108.2435,
  address: 'An Hải, Đà Nẵng, Việt Nam',
};

const getApiErrorMessage = (error: any, fallback: string): string => {
  const responseData = error?.response?.data;
  const validationErrors = responseData?.errors;
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat().find(Boolean)
    : null;

  return String(
    firstValidationError ||
    responseData?.message ||
    error?.message ||
    fallback
  );
};

const RescueRequestScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Animation for submit button pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const URGENCY_OPTIONS = [
    { value: 'low', label: t('citizen.rescue.form.normal') || 'Bình thường', color: '#10B981', icon: 'information', bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
    { value: 'medium', label: t('citizen.rescue.form.medium') || 'Trung bình', color: '#3B82F6', icon: 'alert-circle', bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' },
    { value: 'high', label: t('citizen.rescue.form.high') || 'Cao', color: '#F59E0B', icon: 'alert', bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' },
    { value: 'critical', label: t('citizen.rescue.form.critical') || 'Khẩn cấp', color: '#EF4444', icon: 'alert-octagon', bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' },
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
    { value: 'children', label: t('citizen.sos.form.children'), icon: 'baby-carriage' },
    { value: 'elderly', label: t('citizen.sos.form.elderly'), icon: 'human-cane' },
    { value: 'disabled', label: t('citizen.sos.form.disabled'), icon: 'wheelchair-accessibility' },
    { value: 'pregnant', label: t('citizen.sos.form.pregnant'), icon: 'human-pregnant' },
  ];

  const [form, setForm] = useState<Partial<CreateRescueRequestData>>({
    caller_name: user?.name || '',
    caller_phone: (user as any)?.phone || '',
    urgency: 'high',
    category: 'rescue',
    people_count: 1,
    vulnerable_groups: [],
    description: '',
    latitude: FALLBACK_LOCATION.latitude,
    longitude: FALLBACK_LOCATION.longitude,
    address: FALLBACK_LOCATION.address,
    water_level_m: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyFallbackLocation = useCallback(() => {
    setForm(prev => ({
      ...prev,
      latitude: FALLBACK_LOCATION.latitude,
      longitude: FALLBACK_LOCATION.longitude,
      address: prev.address?.trim() ? prev.address : FALLBACK_LOCATION.address,
    }));
    setLoadingLocation(false);
  }, []);

  const refreshLocation = useCallback(() => {
    setLoadingLocation(true);
    Geolocation.getCurrentPosition(
      async (pos: any) => {
        const { latitude, longitude } = pos.coords;

        const isWithinDaNang = (
          longitude >= 108.02 &&
          longitude <= 108.29 &&
          latitude >= 15.82 &&
          latitude <= 16.16
        );

        if (!latitude || !longitude || !isWithinDaNang) {
          applyFallbackLocation();
          return;
        }

        const address = await mapService.reverseGeocode(latitude, longitude);
        setForm(prev => ({ ...prev, latitude, longitude, address }));
        setLoadingLocation(false);
      },
      applyFallbackLocation,
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [applyFallbackLocation]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  const setField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const toggleVulnerable = (val: string) => {
    const current = form.vulnerable_groups || [];
    if (current.includes(val)) {
      setField('vulnerable_groups', current.filter(v => v !== val));
    } else {
      setField('vulnerable_groups', [...current, val]);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.5,
        maxWidth: 1024,
        maxHeight: 1024,
        saveToPhotos: true,
      });

      if (result.assets && result.assets.length > 0) {
        uploadPhotos(result.assets);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('common.error'), t('citizen.rescue.cameraError'));
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 5 - photos.length,
        quality: 0.5,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.assets && result.assets.length > 0) {
        uploadPhotos(result.assets);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('common.error'), t('citizen.rescue.galleryError'));
    }
  };

  const handleSelectMedia = () => {
    if (photos.length >= 5) {
      Alert.alert(t('common.warning'), t('citizen.rescue.maxPhotosWarning'));
      return;
    }

    Alert.alert(
      t('citizen.rescue.selectImage'),
      t('citizen.rescue.selectImageSource'),
      [
        { text: t('citizen.rescue.takePhoto'), onPress: handleTakePhoto },
        { text: t('citizen.rescue.chooseFromGallery'), onPress: handleSelectFromGallery },
        { text: t('citizen.rescue.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const uploadPhotos = async (assets: any[]) => {
    setUploading(true);
    const newPhotos = [...photos];
    for (const asset of assets) {
      try {
        const res = await mediaService.uploadMedia(asset, 'image', 'phan_anh', 'Yêu cầu cứu hộ');
        if (res.success && res.data?.url) {
          newPhotos.push(res.data.url);
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setPhotos(newPhotos);
    setUploading(false);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    let newErrors: Record<string, string> = {};
    if (!form.caller_name?.trim()) newErrors.caller_name = t('auth.nameRequired');
    if (!form.address?.trim()) newErrors.address = t('citizen.sos.form.address') + ' ' + t('citizen.sos.form.required');
    if (!form.caller_phone?.trim()) newErrors.caller_phone = t('citizen.rescue.phoneRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    if (!form.latitude || !form.longitude) {
      Alert.alert(t('common.error'), t('citizen.sos.form.getLocation') + ' - GPS');
      return;
    }

    setSubmitting(true);
    try {
      const remotePhotoUrls = photos.filter(url => /^https?:\/\//i.test(url));
      const res = await rescueService.createRescueRequest({
        ...form,
        photo_urls: remotePhotoUrls,
      } as CreateRescueRequestData);

      if (res.success) {
        Alert.alert(
          t('common.success'),
          t('citizen.sos.success.message'),
          [
            {
              text: t('citizen.rescue.myRequests'),
              onPress: () => {
                setPhotos([]);
                navigation.navigate('MyRescueRequests');
              },
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), res.message || t('errors.unknownError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('errors.unknownError')));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUrgency = URGENCY_OPTIONS.find(item => item.value === form.urgency) ?? URGENCY_OPTIONS[2];
  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === form.category);

  return (
    <View style={styles.container}>
      <PageHeader title={t('citizen.sos.title')} variant="default" rightIcon="history" onRightPress={() => navigation.navigate('MyRescueRequests')} />

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Emergency Banner */}
          <View style={styles.emergencyBanner}>
            <View style={styles.emergencyIconWrapper}>
              <View style={styles.emergencyIconCore}>
                <Icon name="phone-alert" size={24} color="#FFF" />
              </View>
            </View>
            <View style={styles.emergencyCopy}>
              <Text style={styles.emergencyTitle}>{t('citizen.rescue.title')}</Text>
              <Text style={styles.emergencyText}>{t('citizen.sos.warningMessage')}</Text>
            </View>
          </View>

          {/* Contact Info Card */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Icon name="account-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('citizen.rescue.contactInfo')}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <InputCustom
                label={t('citizen.rescue.form.fullName')}
                placeholder={t('auth.enterFullName')}
                value={form.caller_name || ''}
                onChangeText={v => setField('caller_name', v)}
                error={errors.caller_name}
                leftIcon="account"
              />
            </View>

            <View style={styles.inputGroup}>
              <InputCustom
                label={t('citizen.rescue.form.phone')}
                placeholder={t('citizen.rescue.form.phone')}
                value={form.caller_phone || ''}
                onChangeText={v => setField('caller_phone', v)}
                keyboardType="phone-pad"
                error={errors.caller_phone}
                leftIcon="phone"
              />
            </View>
          </View>

          {/* Location Card */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Icon name="map-marker-radius" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('citizen.rescue.yourLocation')}</Text>
              </View>
              <TouchableOpacity onPress={refreshLocation} style={styles.refreshBtn}>
                {loadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="crosshairs-gps" size={18} color={colors.primary} />
                )}
                <Text style={styles.refreshBtnText}>{t('citizen.rescue.reLocate')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <InputCustom
                label={t('citizen.rescue.detailAddress')}
                placeholder={t('citizen.sos.form.addressPlaceholder')}
                value={form.address || ''}
                onChangeText={v => setField('address', v)}
                error={errors.address}
                multiline
                numberOfLines={2}
                leftIcon="map-marker"
              />
            </View>
          </View>

          {/* Urgency & Category Card */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Icon name="alert-decagram" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('citizen.rescue.levelAndType')}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>{t('citizen.rescue.urgencyLevel')}</Text>
            <View style={styles.urgencyGrid}>
              {URGENCY_OPTIONS.map(opt => {
                const selected = form.urgency === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.urgencyChip,
                      selected && {
                        backgroundColor: opt.bgColor,
                        borderColor: opt.color,
                      }
                    ]}
                    onPress={() => setField('urgency', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Icon name={opt.icon} size={18} color={selected ? opt.color : colors.textSecondary} />
                    <Text style={[
                      styles.urgencyText,
                      selected && { color: opt.color, fontWeight: '700' }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('citizen.rescue.supportType')}</Text>
            <TouchableOpacity
              style={styles.categorySelectButton}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.categorySelectIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Icon
                  name={selectedCategory?.icon || 'shape'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.categorySelectContent}>
                <Text style={styles.categorySelectLabel}>
                  {selectedCategory?.label || t('citizen.rescue.selectCategory')}
                </Text>
              </View>
              <Icon name="chevron-down" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Icon name="clipboard-list-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('citizen.rescue.rescueDetails')}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={styles.fieldLabel}>{t('citizen.rescue.peopleCount')}</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setField('people_count', Math.max(1, (form.people_count || 1) - 1))}
                  >
                    <Icon name="minus" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{form.people_count}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setField('people_count', (form.people_count || 1) + 1)}
                  >
                    <Icon name="plus" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.fieldLabel}>{t('citizen.rescue.waterLevelM')}</Text>
                <View style={styles.waterInputWrap}>
                  <InputCustom
                    placeholder={t('citizen.rescue.form.waterLevelPlaceholder') || 'VD: 0.5'}
                    value={form.water_level_m?.toString() || ''}
                    onChangeText={v => setField('water_level_m', v ? parseFloat(v) : undefined)}
                    keyboardType="numeric"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 8 }]}>{t('citizen.rescue.vulnerableGroup')}</Text>
            <View style={styles.vulnerableGrid}>
              {VULNERABLE_OPTIONS.map(opt => {
                const selected = form.vulnerable_groups?.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.vulnerableChip,
                      selected && styles.vulnerableChipSelected
                    ]}
                    onPress={() => toggleVulnerable(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Icon name={opt.icon} size={18} color={selected ? colors.white : colors.textSecondary} />
                    <Text style={[
                      styles.vulnerableText,
                      selected && styles.vulnerableTextSelected
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Media & Description Card */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Icon name="image-multiple" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('citizen.rescue.mediaAndDescription')}</Text>
              </View>
            </View>

            <View style={styles.mediaGrid}>
              {photos.map((url, index) => (
                <View key={url + index} style={styles.mediaCard}>
                  <Image source={{ uri: url }} style={styles.mediaPhoto} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.mediaRemoveButton}
                    onPress={() => handleRemovePhoto(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close-circle" size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length < 5 && (
                <TouchableOpacity
                  style={styles.uploadCard}
                  activeOpacity={0.7}
                  onPress={handleSelectMedia}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <>
                      <View style={styles.uploadIconBox}>
                        <Icon name="camera-plus-outline" size={32} color={colors.primary} />
                      </View>
                      <Text style={styles.uploadCardText}>{t('citizen.rescue.addPhoto')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginTop: 16 }}>
              <InputCustom
                label={t('citizen.rescue.additionalDescription')}
                placeholder={t('citizen.sos.form.descriptionPlaceholder')}
                value={form.description || ''}
                onChangeText={v => setField('description', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Actions Bar */}
      <View style={[styles.submitPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.submitSummary}>
          <View style={[styles.submitSeverityDot, { backgroundColor: selectedUrgency.color }]} />
          <Text style={styles.submitSummaryText}>
            {selectedUrgency.label} · {t('citizen.rescue.peopleCountValue', { count: form.people_count || 1 })} · {selectedCategory?.label}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.submitBtnGradient, { transform: [{ scale: submitting ? 1 : pulseAnim }] }]}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="alert-octagon" size={24} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitBtnText}>{t('citizen.rescue.submitRequest')}</Text>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('citizen.rescue.selectCategory')}</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                style={styles.modalDoneBtn}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {CATEGORY_OPTIONS.map((opt) => {
                const selected = form.category === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modalRow, selected && styles.modalRowSelected]}
                    onPress={() => {
                      setField('category', opt.value);
                      setShowCategoryPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalIconContainer, selected && styles.modalIconContainerSelected]}>
                      <Icon name={opt.icon} size={24} color={selected ? colors.primary : colors.textSecondary} />
                    </View>
                    <Text style={[styles.modalRowLabel, selected && styles.modalRowLabelSelected]}>
                      {opt.label}
                    </Text>
                    {selected && <Icon name="check-circle" size={24} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    padding: 16,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: isDark ? colors.error : '#FCA5A5',
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: colors.error, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  emergencyIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emergencyIconCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCopy: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? colors.error : '#B91C1C',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: isDark ? colors.text : '#991B1B',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: isDark ? 0 : 2,
      },
    }),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  urgencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  urgencyChip: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  urgencyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categorySelectIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categorySelectContent: {
    flex: 1,
  },
  categorySelectLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    paddingHorizontal: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  waterInputWrap: {
    flex: 1,
  },
  vulnerableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vulnerableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  vulnerableChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vulnerableText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  vulnerableTextSelected: {
    color: colors.white,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaCard: {
    width: 76,
    height: 76,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPhoto: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  uploadCard: {
    width: 76,
    height: 76,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconBox: {
    marginBottom: 4,
  },
  uploadCardText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  submitPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  submitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitSeverityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  submitSummaryText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: 8,
  },
  submitBtnGradient: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitIcon: {
    marginRight: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalDoneBtn: {
    padding: 4,
  },
  modalList: {
    marginTop: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalRowSelected: {
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
    borderColor: colors.primary,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalIconContainerSelected: {
    backgroundColor: colors.card,
  },
  modalRowLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  modalRowLabelSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
});

export default RescueRequestScreen;
