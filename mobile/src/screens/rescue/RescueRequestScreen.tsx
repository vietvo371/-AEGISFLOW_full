import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Geolocation from 'react-native-geolocation-service';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { rescueService, CreateRescueRequestData } from '../../services/rescueService';
import { mapService } from '../../services/mapService';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { mediaService } from '../../services/mediaService';

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
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
    latitude: FALLBACK_LOCATION.latitude,
    longitude: FALLBACK_LOCATION.longitude,
    address: FALLBACK_LOCATION.address,
  });

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
        if (!latitude || !longitude) {
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

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

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
      Alert.alert(t('common.error'), 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập.');
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
      Alert.alert(t('common.error'), 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleSelectMedia = () => {
    if (photos.length >= 5) {
      Alert.alert(t('common.warning'), 'Bạn chỉ được tải lên tối đa 5 ảnh');
      return;
    }

    Alert.alert(
      'Chọn hình ảnh',
      'Chọn nguồn hình ảnh',
      [
        { text: 'Chụp ảnh', onPress: handleTakePhoto },
        { text: 'Chọn từ thư viện', onPress: handleSelectFromGallery },
        { text: 'Hủy', style: 'cancel' },
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
              text: 'Xem yêu cầu',
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

  return (
    <View style={styles.container}>
      {/* Header Container with padding top matching status bar insets */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Icon name="chevron-left" size={30} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('citizen.sos.title')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyRescueRequests')}
            style={styles.historyBtn}
            activeOpacity={0.7}
          >
            <Icon name="history" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.emergencyBanner}>
            <View style={styles.emergencyIcon}>
              <Icon name="phone-alert" size={20} color="#FF3B30" />
            </View>
            <View style={styles.emergencyCopy}>
              <Text style={styles.emergencyTitle}>{t('citizen.rescue.title')}</Text>
              <Text style={styles.emergencyText}>{t('citizen.sos.warningMessage')}</Text>
            </View>
          </View>

          {/* Contact Info Section */}
          <Text style={styles.sectionHeader}>THÔNG TIN LIÊN HỆ</Text>
          <View style={styles.listGroup}>
            <View style={styles.inputRow}>
              <Icon name="account-outline" size={22} color="#8E8E93" style={styles.rowIcon} />
              <Text style={styles.rowLabel}>
                Họ và tên <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.rowValueInput}
                placeholder={t('auth.enterFullName')}
                placeholderTextColor="#C7C7CC"
                value={form.caller_name}
                onChangeText={v => setField('caller_name', v)}
              />
            </View>
            <View style={styles.listDivider} />
            <View style={styles.inputRow}>
              <Icon name="phone-outline" size={22} color="#8E8E93" style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Điện thoại</Text>
              <TextInput
                style={styles.rowValueInput}
                placeholder={t('citizen.rescue.form.phone')}
                placeholderTextColor="#C7C7CC"
                value={form.caller_phone}
                onChangeText={v => setField('caller_phone', v)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Location Section */}
          <Text style={styles.sectionHeader}>VỊ TRÍ CỦA BẠN</Text>
          <View style={styles.listGroup}>
            <View style={styles.inputRow}>
              <Icon name="crosshairs-gps" size={22} color="#8E8E93" style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Tọa độ GPS</Text>
              <View style={styles.locationValueWrap}>
                {loadingLocation ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={styles.gpsStatusIndicator} />
                ) : (
                  <Text style={styles.locationCoordinatesText} numberOfLines={1}>
                    {form.latitude && form.longitude
                      ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                      : 'Chưa có tọa độ'}
                  </Text>
                )}
                <TouchableOpacity onPress={refreshLocation} style={styles.refreshLocationBtn} activeOpacity={0.6}>
                  <Icon name="refresh" size={14} color={theme.colors.primary} />
                  <Text style={styles.refreshLocationText}>GPS</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.listDivider} />
            <View style={styles.addressInputRow}>
              <Icon name="map-marker-outline" size={22} color="#8E8E93" style={styles.rowIconTop} />
              <Text style={styles.rowLabelTop}>
                Địa chỉ <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.addressTextInput}
                placeholder={t('citizen.sos.form.addressPlaceholder')}
                placeholderTextColor="#C7C7CC"
                value={form.address}
                onChangeText={v => setField('address', v)}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Urgency Level & Category Section */}
          <Text style={styles.sectionHeader}>MỨC ĐỘ KHẨN CẤP & LOẠI HỖ TRỢ</Text>
          <View style={styles.listGroup}>
            <View style={styles.segmentedControlRow}>
              <View style={styles.segmentedControl}>
                {URGENCY_OPTIONS.map(opt => {
                  const selected = form.urgency === opt.value;
                  let activeTextStyle = null;
                  if (selected) {
                    if (opt.value === 'low') activeTextStyle = styles.segmentTextLow;
                    else if (opt.value === 'medium') activeTextStyle = styles.segmentTextMedium;
                    else if (opt.value === 'high') activeTextStyle = styles.segmentTextHigh;
                    else if (opt.value === 'critical') activeTextStyle = styles.segmentTextCritical;
                  }
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.segmentTab, selected && styles.segmentTabSelected]}
                      onPress={() => setField('urgency', opt.value)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.segmentText, activeTextStyle]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.listDivider} />
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.6}
            >
              <Icon name="tag-outline" size={22} color="#8E8E93" style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Loại hỗ trợ</Text>
              <View style={styles.pickerValueWrap}>
                <Text style={styles.pickerValueText}>
                  {CATEGORY_OPTIONS.find(c => c.value === form.category)?.label || ''}
                </Text>
                <Icon name="chevron-right" size={20} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Counter and Water Level Inline Block */}
          <Text style={styles.sectionHeader}>CHI TIẾT YÊU CẦU</Text>
          <View style={styles.listGroup}>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabelFull}>{t('citizen.rescue.form.peopleCount')}</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setField('people_count', Math.max(1, (form.people_count || 1) - 1))}
                  activeOpacity={0.7}
                >
                  <Icon name="minus" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.stepperDivider} />
                <Text style={styles.stepperValue}>{form.people_count}</Text>
                <View style={styles.stepperDivider} />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setField('people_count', (form.people_count || 1) + 1)}
                  activeOpacity={0.7}
                >
                  <Icon name="plus" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.listDivider} />
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabelFull}>{t('citizen.rescue.form.waterLevel').replace('(cm)', '(m)')}</Text>
              <View style={styles.waterInputWrap}>
                <TextInput
                  style={styles.waterTextInput}
                  placeholder="0.5"
                  placeholderTextColor="#C7C7CC"
                  value={form.water_level_m?.toString() || ''}
                  onChangeText={v => setField('water_level_m', v ? parseFloat(v) : undefined)}
                  keyboardType="numeric"
                />
                <Text style={styles.waterUnitText}>m</Text>
              </View>
            </View>
          </View>

          {/* Vulnerable Groups Section */}
          <Text style={styles.sectionHeader}>{t('citizen.sos.form.vulnerableGroups').toUpperCase()}</Text>
          <View style={styles.listGroup}>
            {VULNERABLE_OPTIONS.map((opt, idx) => {
              const selected = form.vulnerable_groups?.includes(opt.value);
              return (
                <View key={opt.value}>
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={() => toggleVulnerable(opt.value)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.listRowLabel, selected && styles.listRowLabelSelected]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Icon name="check" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                  {idx < VULNERABLE_OPTIONS.length - 1 && <View style={styles.listDivider} />}
                </View>
              );
            })}
          </View>

          {/* Photos Upload Section */}
          <Text style={styles.sectionHeader}>HÌNH ẢNH HIỆN TRƯỜNG</Text>
          <View style={styles.photosCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
              {photos.map((url, index) => (
                <View key={url + index} style={styles.photoContainer}>
                  <Image source={{ uri: url }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(index)}
                    activeOpacity={0.7}
                  >
                    <Icon name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={handleSelectMedia}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <Icon name="camera-plus-outline" size={24} color={theme.colors.primary} />
                      <Text style={styles.addPhotoText}>{photos.length}/5</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Description Section */}
          <Text style={styles.sectionHeader}>{t('citizen.sos.form.description').toUpperCase()}</Text>
          <View style={styles.listGroup}>
            <View style={styles.descriptionRow}>
              <TextInput
                style={styles.descriptionTextInput}
                placeholder={t('citizen.sos.form.descriptionPlaceholder')}
                placeholderTextColor="#C7C7CC"
                value={form.description}
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
            {selectedUrgency.label} · {form.people_count || 1} người
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send" size={18} color="#fff" style={styles.submitIcon} />
              <Text style={styles.submitBtnText}>{t('citizen.sos.form.submit')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Picker Bottom Sheet Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
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
              <Text style={styles.modalTitle}>Chọn loại hỗ trợ</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                style={styles.modalDoneBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDoneBtnText}>Xong</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <View style={styles.modalListGroup}>
                {CATEGORY_OPTIONS.map((opt, idx) => {
                  const selected = form.category === opt.value;
                  return (
                    <View key={opt.value}>
                      <TouchableOpacity
                        style={styles.modalRow}
                        onPress={() => {
                          setField('category', opt.value);
                          setShowCategoryPicker(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <View style={styles.modalRowLeft}>
                          <Icon name={opt.icon} size={22} color={selected ? theme.colors.primary : '#8E8E93'} style={styles.modalRowIcon} />
                          <Text style={[styles.modalRowLabel, selected && styles.modalRowLabelSelected]}>
                            {opt.label}
                          </Text>
                        </View>
                        {selected && (
                          <Icon name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                      {idx < CATEGORY_OPTIONS.length - 1 && <View style={styles.modalDivider} />}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS Grouped Background Light
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8', // iOS hairline separator
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  historyBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#FFD2D2',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emergencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyCopy: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 2,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#C62828',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6E73', // iOS Section Header gray
    marginLeft: 26,
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  listGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  listDivider: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowIcon: {
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    width: 105,
  },
  rowValueInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 8,
    textAlign: 'left',
  },
  requiredStar: {
    color: '#FF3B30', // iOS System Red
    fontWeight: 'bold',
  },
  locationValueWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  locationCoordinatesText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    flex: 1,
    textAlign: 'left',
  },
  refreshLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#7a5af812',
  },
  refreshLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 60,
  },
  rowIconTop: {
    marginRight: 10,
    marginTop: 2,
  },
  rowLabelTop: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    width: 105,
    marginTop: 2,
  },
  addressTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    minHeight: 40,
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  segmentedControlRow: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E3E3E6',
    borderRadius: 8,
    padding: 2,
    height: 36,
    width: '100%',
  },
  segmentTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentTabSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
    color: '#636366',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  pickerValueWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  pickerValueText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  rowLabelFull: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    height: 32,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 36,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperDivider: {
    width: 0.5,
    height: 20,
    backgroundColor: '#C6C6C8',
  },
  stepperValue: {
    width: 32,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  waterInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waterTextInput: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    width: 60,
    paddingVertical: 6,
  },
  waterUnitText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  listRowLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '400',
  },
  listRowLabelSelected: {
    fontWeight: '500',
    color: theme.colors.primary,
  },
  descriptionRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  descriptionTextInput: {
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  submitPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
  submitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'center',
  },
  submitSeverityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  submitSummaryText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF3B30', // Apple System Red
    height: 50,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitIcon: {
    marginRight: 2,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gpsStatusIndicator: {
    marginRight: 6,
  },
  gpsStatusIcon: {
    marginRight: 6,
  },
  segmentTextLow: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  segmentTextMedium: {
    color: '#EAB308',
    fontWeight: '600',
  },
  segmentTextHigh: {
    color: '#F97316',
    fontWeight: '600',
  },
  segmentTextCritical: {
    color: '#EF4444',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginLeft: 44, // Offset standard to align title in center
  },
  modalDoneBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalList: {
    paddingVertical: 16,
  },
  modalListGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRowIcon: {
    marginRight: 12,
  },
  modalRowLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '400',
  },
  modalRowLabelSelected: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalDivider: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 50, // Offset to align below label
  },
  // Photos styles
  photosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  photosScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    width: 72,
    height: 72,
    marginRight: 10,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  addPhotoText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },
});

export default RescueRequestScreen;
