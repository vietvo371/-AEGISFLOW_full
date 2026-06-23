import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Platform, Modal, Dimensions, ActivityIndicator, PermissionsAndroid, Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import ModalCustom from '../../component/ModalCustom';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, wp, hp } from '../../theme';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { reportService } from '../../services/reportService';
import { rescueService } from '../../services/rescueService';
import { mapService } from '../../services/mapService';
import { mediaService } from '../../services/mediaService';
import { CreateReportRequest, Media } from '../../types/api/report';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/types';
import env from '../../config/env';
import { OPENMAP_STYLE_URL, getOpenMapStyleUrl } from '../../config/mapbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../contexts/ThemeContext';

const DRAFT_KEY = '@aegisflowai_report_draft';

// Initialize Mapbox
MapboxGL.setAccessToken('');

// Category options matching API
const CATEGORIES = [
  { value: 5, label: 'Ngập lụt', icon: 'water', color: '#3B82F6' },
  { value: 6, label: 'Khác', icon: 'dots-horizontal', color: '#6B7280' },
];

// Priority options matching API
const PRIORITIES = [
  { value: 1, label: 'Bình thường', color: '#10B981' },
  { value: 2, label: 'Trung bình', color: '#3B82F6' },
  { value: 3, label: 'Cao', color: '#F59E0B' },
  { value: 4, label: 'Khẩn cấp', color: '#EF4444' },
];

const CreateReportScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateReport'>>();
  const isRescue = route.params?.isRescue === true;
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);

  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [aiAnalysisMessage, setAiAnalysisMessage] = useState('');
  const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);

  // Map Modal State
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<number[] | null>(null);
  const [tempAddress, setTempAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<Media[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animation for category modal
  const categorySlideAnim = useRef(new Animated.Value(500)).current;
  const categoryBackdropAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState<CreateReportRequest>({
    tieu_de: '',
    mo_ta: '',
    danh_muc: 5, // Default to Ngập lụt (value 5)
    vi_do: 16.0680,
    kinh_do: 108.2122,
    dia_chi: '',
    uu_tien: isRescue ? 4 : 1,
    la_cong_khai: !isRescue,
    the_tags: isRescue ? ['SOS', 'Emergency'] : [],
    media_ids: []
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const isMounted = useRef(false);

  // Load draft on mount
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      let draftLoaded = false;
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<CreateReportRequest>;
          if (saved.tieu_de || saved.mo_ta || saved.dia_chi) {
            // Validate saved coordinates and fallback to Da Nang if outside bounds
            const isSavedLocWithinDaNang = saved.vi_do && saved.kinh_do && (
              saved.kinh_do >= 108.02 &&
              saved.kinh_do <= 108.29 &&
              saved.vi_do >= 15.82 &&
              saved.vi_do <= 16.16
            );

            const coordinatesToUse = isSavedLocWithinDaNang ? {
              vi_do: saved.vi_do as number,
              kinh_do: saved.kinh_do as number,
            } : {
              vi_do: 16.0680,
              kinh_do: 108.2122,
            };

            setFormData(prev => ({
              ...prev,
              ...saved,
              ...coordinatesToUse,
              media_ids: []
            }));
            setDraftRestored(true);
            draftLoaded = true;
            setTimeout(() => setDraftRestored(false), 4000) as unknown as void;
          }
        } catch { /* ignore corrupt draft */ }
      }
      isMounted.current = true;

      // If no draft was loaded and it's a rescue request, set the localized default title
      if (!draftLoaded && isRescue) {
        setFormData(prev => ({
          ...prev,
          tieu_de: t('reports.defaultRescueTitle', 'Cần hỗ trợ cứu hộ')
        }));
      }
    });
  }, [isRescue, t]);

  // Auto-save draft on every form change (after mount)
  useEffect(() => {
    if (!isMounted.current) return;
    const saveable = {
      tieu_de: formData.tieu_de,
      mo_ta: formData.mo_ta,
      dia_chi: formData.dia_chi,
      danh_muc: formData.danh_muc,
      uu_tien: formData.uu_tien,
      vi_do: formData.vi_do,
      kinh_do: formData.kinh_do,
      the_tags: formData.the_tags,
      la_cong_khai: formData.la_cong_khai,
    };
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(saveable));
  }, [formData]);

  const handleAddTag = () => {
    const currentTags = formData.the_tags || [];
    if (currentTag.trim() && !currentTags.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        the_tags: [...currentTags, currentTag.trim()]
      });
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = formData.the_tags || [];
    setFormData({
      ...formData,
      the_tags: currentTags.filter(tag => tag !== tagToRemove)
    });
  };

  const mapPriorityLevel = (priority: string): number => {
    const priorityMap: { [key: string]: number } = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
      'urgent': 4,
    };
    return priorityMap[priority.toLowerCase()] || 2; // Default to medium
  };

  const getPriorityKey = (value: number) => {
    switch (value) {
      case 1: return 'normal';
      case 2: return 'medium';
      case 3: return 'high';
      case 4: return 'urgent';
      default: return 'medium';
    }
  };

  // Animate loading
  useEffect(() => {
    if (uploadingMedia || aiAnalyzing) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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

      // Rotate animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [uploadingMedia, aiAnalyzing]);

  // Animate category modal
  useEffect(() => {
    if (showCategoryModal) {
      Animated.parallel([
        Animated.spring(categorySlideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(categoryBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCategoryModal]);

  const handleCloseCategoryModal = () => {
    Animated.parallel([
      Animated.timing(categorySlideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(categoryBackdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCategoryModal(false);
    });
  };

  const uploadMediaAssets = async (assets: any[]) => {
    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadStatus(t('reports.preparing'));

    const newMedia: Media[] = [];
    const newMediaIds: number[] = [];
    let aiAnalysisData: any = null;

    const totalAssets = assets.length;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      try {
        setUploadStatus(t('reports.uploadingCount', { current: i + 1, total: totalAssets }));
        setUploadProgress((i / totalAssets) * 50); // 50% for upload

        console.log('🚀 [API Request] Upload Media:', asset.fileName);
        const response = await mediaService.uploadMedia(
          asset,
          asset.type?.includes('video') ? 'video' : 'image',
          'phan_anh',
          'Hình ảnh phản ánh'
        );
        console.log('✅ [API Response] Upload Media:', response);

        if (response.success && response.data) {
          newMedia.push(response.data);
          newMediaIds.push(response.data.id);

          // Get AI analysis from first uploaded image
          const mediaData = response.data as any;
          if (!aiAnalysisData && mediaData.ai_analysis) {
            aiAnalysisData = mediaData.ai_analysis;
          }
        }
      } catch (error) {
        console.error('❌ [API Error] Upload Media:', error);
      }
    }

    setUploadProgress(50);
    setUploadingMedia(false);

    if (newMedia.length > 0) {
      setUploadedMedia([...uploadedMedia, ...newMedia]);

      // Auto-fill form with AI analysis if available
      if (aiAnalysisData) {
        // Start AI analysis animation
        setAiAnalyzing(true);
        setUploadStatus(t('reports.aiAnalyzingAlert'));
        setUploadProgress(60);

        // Simulate AI processing time with progress
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        setUploadProgress(70);

        await new Promise<void>(resolve => setTimeout(resolve, 500));
        setUploadProgress(85);

        const categoryData = CATEGORIES.find(c => c.value === aiAnalysisData.danh_muc_id);
        const categoryLabel = categoryData ? t('reports.categories.' + (categoryData.value === 5 ? 'flood' : 'other')) : t('reports.categories.other');
        const priorityVal = mapPriorityLevel(aiAnalysisData.muc_do_uu_tien || 'medium');
        const priorityLabel = t('reports.priorities.' + getPriorityKey(priorityVal));

        // Track which fields are auto-filled by AI
        const filledFields: string[] = [];

        setUploadStatus(t('reports.fillingInfo'));
        setUploadProgress(95);

        setFormData(prev => {
          const newData = {
            ...prev,
            media_ids: [...(prev.media_ids || []), ...newMediaIds],
          };

          // Only fill if current values are empty
          if (!prev.tieu_de && aiAnalysisData.tieu_de) {
            newData.tieu_de = aiAnalysisData.tieu_de;
            filledFields.push('tieu_de');
          }
          if (!prev.mo_ta && aiAnalysisData.mo_ta) {
            newData.mo_ta = aiAnalysisData.mo_ta;
            filledFields.push('mo_ta');
          }
          if (aiAnalysisData.danh_muc_id) {
            newData.danh_muc = aiAnalysisData.danh_muc_id;
            filledFields.push('danh_muc');
          }
          if (aiAnalysisData.muc_do_uu_tien) {
            newData.uu_tien = mapPriorityLevel(aiAnalysisData.muc_do_uu_tien);
            filledFields.push('uu_tien');
          }

          return newData;
        });

        setAiFilledFields(filledFields);
        setUploadProgress(100);
        setUploadStatus(t('reports.completedStatus'));

        // Prepare AI analysis message
        const detectedObjects = aiAnalysisData.ai_analysis?.detected_objects || [];
        const objectsText = detectedObjects.length > 0
          ? `${t('reports.detectedLabel')}: ${detectedObjects.slice(0, 5).join(', ')}${detectedObjects.length > 5 ? '...' : ''}`
          : '';

        setAiAnalysisMessage(
          t('reports.aiAnalysisResult') + '\n\n' +
          t('reports.category') + ': ' + categoryLabel + '\n' +
          t('reports.priority') + ': ' + priorityLabel + '\n' +
          t('reports.titleAndDesc') + (objectsText ? `\n\n🔍 ${objectsText}` : '') + '\n\n' +
          t('reports.editPrompt')
        );

        await new Promise<void>(resolve => setTimeout(resolve, 500));
        setAiAnalyzing(false);
        setShowAIModal(true);
      } else {
        setFormData(prev => ({
          ...prev,
          media_ids: [...(prev.media_ids || []), ...newMediaIds]
        }));
      }
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
        await uploadMediaAssets(result.assets);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setErrorMessage(t('reports.cameraError'));
      setShowErrorModal(true);
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 5 - uploadedMedia.length,
        quality: 0.5,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.assets && result.assets.length > 0) {
        await uploadMediaAssets(result.assets);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setErrorMessage(t('reports.galleryError'));
      setShowErrorModal(true);
    }
  };

  const handleSelectMedia = () => {
    if (uploadedMedia.length >= 5) {
      setErrorMessage(t('reports.maxPhotosWarning'));
      setShowErrorModal(true);
      return;
    }

    Alert.alert(
      t('reports.selectImage'),
      t('reports.selectImageSource'),
      [
        {
          text: t('reports.takePhoto'),
          onPress: handleTakePhoto,
        },
        {
          text: t('reports.chooseFromGallery'),
          onPress: handleSelectFromGallery,
        },
        {
          text: t('reports.cancel'),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoveMedia = (mediaId: number) => {
    setUploadedMedia(uploadedMedia.filter(m => m.id !== mediaId));
    setFormData(prev => ({
      ...prev,
      media_ids: (prev.media_ids || []).filter(id => id !== mediaId)
    }));
  };

  const [errors, setErrors] = useState<{
    tieu_de?: string;
    mo_ta?: string;
    dia_chi?: string;
  }>({});

  useEffect(() => {
    if (showMapModal) {
      setTempLocation([formData.kinh_do, formData.vi_do]);
      setTempAddress(formData.dia_chi);
    }
  }, [showMapModal]);

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            return;
          }
        } else {
          const auth = await Geolocation.requestAuthorization('whenInUse');
          if (auth !== 'granted') {
            return;
          }
        }

        Geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Check if coordinates are within Da Nang bounds
            const isWithinDaNang = (
              longitude >= 108.02 &&
              longitude <= 108.29 &&
              latitude >= 15.82 &&
              latitude <= 16.16
            );

            if (!isWithinDaNang) {
              console.log('📍 Current GPS coordinate is outside Da Nang. Keeping Da Nang defaults.');
              return;
            }

            // Get address for current location
            let address = '';
            try {
              address = await mapService.reverseGeocode(latitude, longitude);
            } catch (error) {
              console.error('Reverse geocode error:', error);
            }

            setFormData(prev => ({
              ...prev,
              vi_do: latitude,
              kinh_do: longitude,
              dia_chi: address
            }));
          },
          (error) => {
            console.log('Location error:', error.code, error.message);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } catch (error) {
        console.error('Permission error:', error);
      }
    };

    getCurrentLocation();
  }, []);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.tieu_de.trim()) {
      newErrors.tieu_de = t('reports.titleRequired');
    } else if (formData.tieu_de.length < 10) {
      newErrors.tieu_de = t('reports.titleMinLength');
    }

    if (!formData.mo_ta.trim()) {
      newErrors.mo_ta = t('reports.descRequired');
    } else if (formData.mo_ta.length < 20) {
      newErrors.mo_ta = t('reports.descMinLength');
    }

    if (!formData.dia_chi.trim()) {
      newErrors.dia_chi = t('reports.addressRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isRescue) {
        // Submit as Rescue Request
        const rescueData = {
          description: formData.mo_ta,
          latitude: formData.vi_do,
          longitude: formData.kinh_do,
          priority: 'critical' as any,
          status: 'pending' as any,
        };
        const response = await rescueService.createRequest(rescueData as any);
        if (response.success) {
          setSuccessMessage(t('reports.rescueSuccessMsg'));
          setShowSuccessModal(true);
        }
      } else {
        const response = await reportService.createReport(formData);
        if (response.success) {
          setSuccessMessage(t('reports.submitSuccessMsg'));
          setShowSuccessModal(true);
        }
      }
    } catch (error: any) {
      console.error('❌ [API Error] Create Report:', error);
      let message = t('reports.submitErrorMsg');

      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }

      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    AsyncStorage.removeItem(DRAFT_KEY); // Clear draft after submit
    setShowSuccessModal(false);

    // Reset form data
    setFormData({
      tieu_de: '',
      mo_ta: '',
      danh_muc: 5, // Default to Ngập lụt (value 5)
      vi_do: 16.0680,
      kinh_do: 108.2122,
      dia_chi: '',
      uu_tien: 1,
      la_cong_khai: true,
      the_tags: [],
      media_ids: []
    });

    // Clear uploaded media
    setUploadedMedia([]);
    setCurrentTag('');
    setErrors({});
    setAiFilledFields([]);

    // Navigate back
    navigation.goBack();
  };

  const handleMapPress = async (feature: any) => {
    const coords = feature.geometry.coordinates;
    setTempLocation(coords);

    cameraRef.current?.setCamera({
      centerCoordinate: coords,
      animationDuration: 600,
    });

    // Reverse Geocoding
    try {
      setLoadingAddress(true);
      console.log('🚀 [API Request] Reverse Geocode:', { lat: coords[1], long: coords[0] });
      const address = await mapService.reverseGeocode(coords[1], coords[0]);
      console.log('✅ [API Response] Reverse Geocode:', address);
      setTempAddress(address);
    } catch (error) {
      console.error('❌ [API Error] Reverse Geocode:', error);
    } finally {
      setLoadingAddress(false);
    }
  };

  const confirmLocation = () => {
    if (tempLocation) {
      setFormData({
        ...formData,
        kinh_do: tempLocation[0],
        vi_do: tempLocation[1],
        dia_chi: tempAddress || formData.dia_chi || `${t('reports.location')}: ${tempLocation[1].toFixed(6)}, ${tempLocation[0].toFixed(6)}`
      });
      setShowMapModal(false);
    }
  };

  const openMapModal = () => {
    setTempLocation([formData.kinh_do, formData.vi_do]);
    setShowMapModal(true);
  };

  return (
    <View style={styles.container}>
      <PageHeader title={isRescue ? t('reports.createReportSos') : t('reports.createReport')} variant="default" />

      {/* Draft Restored Banner */}
      {draftRestored && (
        <View style={styles.draftBanner}>
          <Icon name="content-save-outline" size={15} color={colors.primary} />
          <Text style={styles.draftBannerText}>{t('reports.draftRestored')}</Text>
          <TouchableOpacity onPress={() => {
            setDraftRestored(false);
            AsyncStorage.removeItem(DRAFT_KEY);
            setFormData({ tieu_de: '', mo_ta: '', danh_muc: 5, vi_do: 16.0680, kinh_do: 108.2122, dia_chi: '', uu_tien: 1, la_cong_khai: true, the_tags: [], media_ids: [] });
          }}>
            <Text style={styles.draftBannerDiscard}>{t('reports.discard')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Upload */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="image-multiple" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('reports.imageTitle')}</Text>
            </View>
            <LinearGradient
              colors={[colors.primary + '10', colors.primary + '30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiChip}
            >
              <Icon name="robot" size={14} color={colors.primary} />
              <Text style={styles.aiChipText}>{t('reports.aiAnalyzing')}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.sectionSubtitle}>{t('reports.imageDesc')}</Text>

          <View style={styles.mediaGrid}>
            {uploadedMedia.map((media, index) => (
              <View key={media.id} style={styles.mediaCard}>
                <Image
                  source={{ uri: media.thumbnail_url || media.url }}
                  style={styles.mediaPhoto}
                  resizeMode="cover"
                />
                <View style={styles.mediaOverlay}>
                  <View style={styles.mediaIndex}>
                    <Text style={styles.mediaIndexText}>{index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mediaRemoveButton}
                    onPress={() => handleRemoveMedia(media.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close-circle" size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>
                {(media as any).ai_analysis && (
                  <View style={styles.mediaAiBadge}>
                    <Icon name="check-decagram" size={14} color={colors.success} />
                  </View>
                )}
              </View>
            ))}

            {uploadedMedia.length < 5 && (
              <TouchableOpacity
                style={styles.uploadCard}
                activeOpacity={0.7}
                onPress={handleSelectMedia}
                disabled={uploadingMedia}
              >
                {uploadingMedia ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <>
                    <View style={styles.uploadIconBox}>
                      <Icon name="camera-plus-outline" size={32} color={colors.primary} />
                    </View>
                    <Text style={styles.uploadCardText}>{t('reports.addPhoto')}</Text>
                    <Text style={styles.uploadCardHint}>{uploadedMedia.length}/5</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.uploadInfoRow}>
            <Icon name="information-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.uploadInfo}>{t('reports.maxPhotos')}</Text>
          </View>
        </View>

        {/* Category Selection - Select Style */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="shape" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('reports.category')}</Text>
            </View>
            {aiFilledFields.includes('danh_muc') && (
              <View style={styles.aiFilledBadge}>
                <Icon name="robot" size={12} color={colors.primary} />
                <Text style={styles.aiFilledText}>{t('reports.aiAutoFilledBadge')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>{t('reports.categoryDesc')}</Text>

          <TouchableOpacity
            style={styles.categorySelectButton}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.7}
          >
            {(() => {
              const selectedCategory = CATEGORIES.find(c => c.value === formData.danh_muc);
              return (
                <>
                  <View style={[
                    styles.categorySelectIcon,
                    { backgroundColor: selectedCategory ? selectedCategory.color + '15' : colors.backgroundSecondary }
                  ]}>
                    <Icon
                      name={selectedCategory?.icon || 'shape'}
                      size={24}
                      color={selectedCategory?.color || colors.textSecondary}
                    />
                  </View>
                  <View style={styles.categorySelectContent}>
                    <Text style={styles.categorySelectLabel}>
                      {selectedCategory ? t('reports.categories.' + (selectedCategory.value === 5 ? 'flood' : 'other')) : t('reports.selectCategory')}
                    </Text>
                    {selectedCategory && (
                      <Text style={styles.categorySelectHint}>{t('reports.tapToChange')}</Text>
                    )}
                  </View>
                  <Icon name="chevron-down" size={24} color={colors.textSecondary} />
                </>
              );
            })()}
          </TouchableOpacity>
        </View>

        {/* Main Info */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="text-box" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('reports.detailsTitle')}</Text>
            </View>
            {aiFilledFields.length > 0 && (
              <View style={styles.aiFilledBadge}>
                <Icon name="check-decagram" size={14} color={colors.success} />
                <Text style={styles.aiFilledText}>{t('reports.aiAutoFilled')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>{t('reports.detailsDesc')}</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWithBadge}>
              <InputCustom
                label={t('reports.titleLabel')}
                placeholder={t('reports.enterTitle')}
                value={formData.tieu_de}
                onChangeText={(text) => {
                  setFormData({ ...formData, tieu_de: text });
                  if (aiFilledFields.includes('tieu_de')) {
                    setAiFilledFields(prev => prev.filter(f => f !== 'tieu_de'));
                  }
                }}
                error={errors.tieu_de}
                leftIcon="format-title"
                maxLength={200}
                containerStyle={styles.input}
              />
              {aiFilledFields.includes('tieu_de') && (
                <View style={styles.aiFieldIndicator}>
                  <Icon name="robot" size={12} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.charCountRow}>
              <Text style={styles.charCount}>{formData.tieu_de.length}/200</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputWithBadge}>
              <InputCustom
                label={t('reports.descriptionLabel')}
                placeholder={t('reports.enterDescription')}
                value={formData.mo_ta}
                onChangeText={(text) => {
                  setFormData({ ...formData, mo_ta: text });
                  if (aiFilledFields.includes('mo_ta')) {
                    setAiFilledFields(prev => prev.filter(f => f !== 'mo_ta'));
                  }
                }}
                error={errors.mo_ta}
                leftIcon="text"
                multiline
                numberOfLines={5}
                maxLength={1000}
                containerStyle={styles.input}
              />
              {aiFilledFields.includes('mo_ta') && (
                <View style={[styles.aiFieldIndicator, { top: 8 }]}>
                  <Icon name="robot" size={12} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.charCountRow}>
              <Text style={styles.charCount}>{formData.mo_ta.length}/1000</Text>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.inputGroup}>
            <View style={styles.tagInputHeader}>
              <View style={styles.tagInputTitle}>
                <Icon name="tag-multiple" size={16} color={colors.textSecondary} />
                <Text style={styles.tagInputLabel}>{t('reports.tagsTitle')}</Text>
              </View>
            </View>
            <InputCustom
              placeholder={t('reports.enterTag')}
              value={currentTag}
              onChangeText={setCurrentTag}
              rightIcon="plus-circle"
              onRightIconPress={handleAddTag}
              containerStyle={styles.input}
            />
            {(formData.the_tags || []).length > 0 && (
              <View style={styles.tagList}>
                {(formData.the_tags || []).map((tag, index) => (
                  <View key={index} style={styles.tagChip}>
                    <Icon name="pound" size={14} color={colors.primary} />
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                      <Icon name="close-circle" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.card}>
          <View style={styles.sectionTitleWithIcon}>
            <Icon name="map-marker" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('reports.locationTitle')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('reports.locationDesc')}</Text>

          <View style={styles.inputGroup}>
            <InputCustom
              label={t('reports.addressLabel')}
              placeholder={t('reports.enterAddress')}
              value={formData.dia_chi}
              onChangeText={(text) => setFormData({ ...formData, dia_chi: text })}
              error={errors.dia_chi}
              leftIcon="map-marker"
              containerStyle={styles.input}
            />
            <TouchableOpacity
              style={styles.mapButton}
              activeOpacity={0.7}
              onPress={openMapModal}
            >
              <View style={styles.mapButtonIcon}>
                <Icon name="map-search" size={24} color={colors.primary} />
              </View>
              <View style={styles.mapButtonContent}>
                <Text style={styles.mapButtonText}>{t('reports.selectOnMap')}</Text>
                <Text style={styles.mapButtonHint}>{t('reports.tapToOpenMap')}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            {formData.vi_do && formData.kinh_do && (
              <Text style={styles.coordsText}>
                {t('reports.coordinates')}: {formData.vi_do.toFixed(6)}, {formData.kinh_do.toFixed(6)}
              </Text>
            )}
          </View>
        </View>

        {/* Priority */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="alert-circle" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('reports.priorityTitle')}</Text>
            </View>
            {aiFilledFields.includes('uu_tien') && (
              <View style={styles.aiFilledBadge}>
                <Icon name="robot" size={12} color={colors.primary} />
                <Text style={styles.aiFilledText}>{t('reports.aiAutoFilledPriority')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>{t('reports.priorityDesc')}</Text>

          <View style={styles.priorityContainer}>
            {PRIORITIES.map((priority) => {
              const isActive = formData.uu_tien === priority.value;
              const isAiFilled = isActive && aiFilledFields.includes('uu_tien');
              return (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityChip,
                    isActive && {
                      backgroundColor: priority.color,
                      borderColor: priority.color,
                    },
                    isAiFilled && styles.priorityChipAiFilled,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, uu_tien: priority.value });
                    if (aiFilledFields.includes('uu_tien')) {
                      setAiFilledFields(prev => prev.filter(f => f !== 'uu_tien'));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.priorityContent}>
                    {isActive && <Icon name="check-circle" size={18} color={colors.white} />}
                    <Text style={[
                      styles.priorityText,
                      isActive && { color: colors.white, fontWeight: '700' }
                    ]}>
                      {t('reports.priorities.' + getPriorityKey(priority.value))}
                    </Text>
                    {isAiFilled && (
                      <Icon name="robot" size={14} color={colors.white} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <View style={styles.sectionTitleWithIcon}>
            <Icon name="shield-check" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('reports.privacyTitle')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('reports.privacyDesc')}</Text>

          <View style={styles.privacyCard}>
            <View style={[
              styles.privacyIconBox,
              { backgroundColor: formData.la_cong_khai ? colors.success + '15' : colors.warning + '15' }
            ]}>
              <Icon
                name={formData.la_cong_khai ? "eye" : "eye-off"}
                size={24}
                color={formData.la_cong_khai ? colors.success : colors.warning}
              />
            </View>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyLabel}>
                {formData.la_cong_khai ? t('reports.public') : t('reports.private')}
              </Text>
              <Text style={styles.privacyDescription}>
                {formData.la_cong_khai
                  ? t('reports.publicDesc')
                  : t('reports.privateDesc')}
              </Text>
            </View>
            <Switch
              value={formData.la_cong_khai}
              onValueChange={(value) => setFormData({ ...formData, la_cong_khai: value })}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <View style={styles.submitInfoCard}>
            <Icon name="information" size={20} color={colors.primary} />
            <Text style={styles.submitInfoText}>
              {t('reports.submitDesc')}
            </Text>
          </View>
          <ButtonCustom
            title={loading ? t('reports.submitting') : t('reports.submitReport')}
            onPress={handleSubmit}
            disabled={loading || uploadingMedia || aiAnalyzing}
            icon="send"
            style={styles.submitButton}
          />
        </View>
      </ScrollView>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMapModal(false)}
      >
        {showMapModal && (
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.mapModalContainer} edges={['bottom']}>
              <View style={styles.mapHeader}>
                <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.closeButton}>
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.mapTitle}>{t('reports.selectLocation')}</Text>
                <TouchableOpacity onPress={confirmLocation} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mapContainer}>
                <MapboxGL.MapView
                  ref={mapRef}
                  style={styles.map}
                  styleURL={getOpenMapStyleUrl(isDark)}
                  logoEnabled={false}
                  attributionEnabled={false}
                  onPress={handleMapPress}
                >
                  <MapboxGL.Camera
                    ref={cameraRef}
                    defaultSettings={{
                      zoomLevel: 15,
                      centerCoordinate: tempLocation || [108.2122, 16.0680],
                    }}
                  />
                  {tempLocation && (
                    <MapboxGL.PointAnnotation
                      id="selectedLocation"
                      coordinate={tempLocation}
                    >
                      <View style={styles.markerContainer}>
                        <Icon name="map-marker" size={40} color={colors.primary} />
                      </View>
                    </MapboxGL.PointAnnotation>
                  )}
                </MapboxGL.MapView>

                <View style={styles.addressOverlay}>
                  {loadingAddress ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.addressText} numberOfLines={2}>
                      {tempAddress || t('reports.tapMapToSelect')}
                    </Text>
                  )}
                </View>
              </View>
            </SafeAreaView>
          </View>
        )}
      </Modal>

      {/* Success Modal */}
      <ModalCustom
        isModalVisible={showSuccessModal}
        setIsModalVisible={setShowSuccessModal}
        title={t('common.success')}
        type="success"
        isClose={false}
        actionText="OK"
        onPressAction={handleSuccessClose}
      >
        <Text style={styles.modalText}>{successMessage}</Text>
      </ModalCustom>

      {/* Error Modal */}
      <ModalCustom
        isModalVisible={showErrorModal}
        setIsModalVisible={setShowErrorModal}
        title={t('common.error')}
        type="error"
        isClose={false}
        actionText="OK"
      >
        <Text style={styles.modalText}>{errorMessage}</Text>
      </ModalCustom>

      {/* AI Analysis Modal */}
      <ModalCustom
        isModalVisible={showAIModal}
        setIsModalVisible={setShowAIModal}
        title={t('reports.aiModalTitle')}
        type="success"
        isClose={false}
        actionText={t('common.confirm')}
      >
        <Text style={styles.aiModalText}>{aiAnalysisMessage}</Text>
      </ModalCustom>

      {/* Category Selection Modal - Animated Bottom Sheet */}
      {showCategoryModal && (
        <>
          {/* Backdrop */}
          <Animated.View
            style={[
              styles.categoryBackdrop,
              {
                opacity: categoryBackdropAnim,
              }
            ]}
          >
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={handleCloseCategoryModal}
            />
          </Animated.View>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.categoryModalContent,
              {
                transform: [{ translateY: categorySlideAnim }],
              }
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>{t('reports.selectCategory')}</Text>
              <TouchableOpacity onPress={handleCloseCategoryModal}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.categoryModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.categoryOptionsContainer}>
                {CATEGORIES.map((category) => {
                  const isSelected = formData.danh_muc === category.value;
                  return (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.categoryOption,
                        isSelected && styles.categoryOptionSelected,
                        isSelected && { borderColor: category.color }
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, danh_muc: category.value });
                        if (aiFilledFields.includes('danh_muc')) {
                          setAiFilledFields(prev => prev.filter(f => f !== 'danh_muc'));
                        }
                        setTimeout(() => handleCloseCategoryModal(), 200);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.categoryOptionIcon,
                        { backgroundColor: category.color + '15' }
                      ]}>
                        <Icon
                          name={category.icon}
                          size={28}
                          color={category.color}
                        />
                      </View>
                      <View style={styles.categoryOptionContent}>
                        <Text style={[
                          styles.categoryOptionLabel,
                          isSelected && { color: category.color }
                        ]}>
                          {t('reports.categories.' + (category.value === 5 ? 'flood' : 'other'))}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.categoryOptionCheck, { backgroundColor: category.color }]}>
                          <Icon name="check" size={18} color={colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* AI Loading Modal */}
      <Modal
        visible={uploadingMedia || aiAnalyzing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Animated.View
              style={[
                styles.loadingIconContainer,
                {
                  transform: [
                    { scale: pulseAnim },
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon name="robot" size={48} color={colors.primary} />
            </Animated.View>

            <Text style={styles.loadingTitle}>
              {uploadingMedia ? t('reports.uploadingMedia') : t('reports.aiAnalyzingImage')}
            </Text>
            <Text style={styles.loadingStatus}>{uploadStatus}</Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${uploadProgress}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
            </View>

            {/* Progress Steps */}
            <View style={styles.stepsContainer}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  uploadProgress >= 10 && styles.stepDotActive,
                  uploadProgress >= 50 && styles.stepDotCompleted,
                ]}>
                  {uploadProgress >= 50 ? (
                    <Icon name="check" size={12} color={colors.white} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  uploadProgress >= 10 && styles.stepTextActive,
                ]}>
                  {t('reports.uploadStep')}
                </Text>
              </View>

              <View style={styles.stepDivider} />

              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  uploadProgress >= 50 && styles.stepDotActive,
                  uploadProgress >= 95 && styles.stepDotCompleted,
                ]}>
                  {uploadProgress >= 95 ? (
                    <Icon name="check" size={12} color={colors.white} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  uploadProgress >= 50 && styles.stepTextActive,
                ]}>
                  {t('reports.aiStep')}
                </Text>
              </View>

              <View style={styles.stepDivider} />

              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  uploadProgress >= 95 && styles.stepDotActive,
                  uploadProgress === 100 && styles.stepDotCompleted,
                ]}>
                  {uploadProgress === 100 ? (
                    <Icon name="check" size={12} color={colors.white} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  uploadProgress >= 95 && styles.stepTextActive,
                ]}>
                  {t('reports.finishStep')}
                </Text>
              </View>
            </View>

            <Text style={styles.loadingHint}>{t('reports.pleaseWait')}</Text>
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
  content: {
    flex: 1,
    padding: SCREEN_PADDING.horizontal,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: isDark ? 0 : 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: isDark ? colors.primary : 'rgba(122, 90, 248, 0.3)',
  },
  aiChipText: {
    fontSize: FONT_SIZE.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  categorySelectIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  categorySelectContent: {
    flex: 1,
  },
  categorySelectLabel: {
    fontSize: FONT_SIZE.md,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  categorySelectHint: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
  },
  categoryBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  categoryModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    maxHeight: hp('70%'),
    paddingBottom: SPACING.xl,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryModalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: colors.text,
  },
  categoryModalScroll: {
    flex: 1,
  },
  categoryOptionsContainer: {
    padding: SPACING.md,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryOptionSelected: {
    backgroundColor: colors.card,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0 : 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: isDark ? 0 : 4,
      },
    }),
  },
  categoryOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  categoryOptionContent: {
    flex: 1,
  },
  categoryOptionLabel: {
    fontSize: FONT_SIZE.lg,
    color: colors.text,
    fontWeight: '600',
  },
  categoryOptionCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  input: {
    marginBottom: 0,
  },
  charCount: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  inputWithBadge: {
    position: 'relative',
  },
  aiFieldIndicator: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
    borderRadius: BORDER_RADIUS.full,
    padding: 6,
    borderWidth: 2,
    borderColor: colors.card,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  aiFilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(23, 178, 106, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: isDark ? colors.success : 'rgba(23, 178, 106, 0.3)',
  },
  aiFilledText: {
    fontSize: FONT_SIZE.xs,
    color: colors.success,
    fontWeight: '600',
  },
  priorityChipAiFilled: {
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: isDark ? 0 : 1,
      },
    }),
  },
  mapButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  mapButtonContent: {
    flex: 1,
  },
  mapButtonText: {
    fontSize: FONT_SIZE.md,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  mapButtonHint: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
  },
  coordsText: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  tagInputHeader: {
    marginBottom: SPACING.xs,
  },
  tagInputTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tagInputLabel: {
    fontSize: FONT_SIZE.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
    borderWidth: 1,
    borderColor: isDark ? colors.primary : 'rgba(122, 90, 248, 0.3)',
  },
  tagText: {
    fontSize: FONT_SIZE.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  priorityChip: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  priorityText: {
    fontSize: FONT_SIZE.md,
    color: colors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  uploadTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  mediaCard: {
    width: (wp('100%') - SCREEN_PADDING.horizontal * 2 - SPACING.md * 3) / 2,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: isDark ? 0 : 1,
      },
    }),
  },
  mediaPhoto: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mediaIndex: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaIndexText: {
    color: colors.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  mediaAiBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadCard: {
    width: (wp('100%') - SCREEN_PADDING.horizontal * 2 - SPACING.md * 3) / 2,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.05)' : 'rgba(122, 90, 248, 0.05)',
  },
  uploadIconBox: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  uploadCardText: {
    fontSize: FONT_SIZE.md,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadCardHint: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  uploadInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  uploadInfo: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  privacyIconBox: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  privacyContent: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  submitInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.1)' : 'rgba(122, 90, 248, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: isDark ? colors.primary : 'rgba(122, 90, 248, 0.3)',
  },
  submitInfoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: colors.primary,
    fontWeight: '500',
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: BORDER_RADIUS.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalText: {
    textAlign: 'center',
    color: colors.text,
    fontSize: FONT_SIZE.md,
  },
  aiModalText: {
    textAlign: 'left',
    color: colors.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
    paddingHorizontal: SPACING.xs,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: colors.card,
    marginTop: hp('20%'),
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  mapTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: colors.text,
  },
  confirmButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.sm,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressOverlay: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: colors.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  addressText: {
    color: colors.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl * 1.5,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: isDark ? colors.primary : 'rgba(122, 90, 248, 0.3)',
  },
  loadingTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  loadingStatus: {
    fontSize: FONT_SIZE.md,
    color: colors.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  progressText: {
    fontSize: FONT_SIZE.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.3)' : 'rgba(122, 90, 248, 0.3)',
    borderColor: colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepText: {
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepDivider: {
    height: 2,
    backgroundColor: colors.border,
    flex: 0.5,
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.lg,
  },
  loadingHint: {
    fontSize: FONT_SIZE.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: isDark ? 'rgba(122, 90, 248, 0.15)' : 'rgba(122, 90, 248, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.primary : 'rgba(122, 90, 248, 0.2)',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.sm,
  },
  draftBannerText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  draftBannerDiscard: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: colors.error,
  },
});

export default CreateReportScreen;
