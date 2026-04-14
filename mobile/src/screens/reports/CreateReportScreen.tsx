import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Platform, Modal, Dimensions, ActivityIndicator, PermissionsAndroid, Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import PageHeader from '../../component/PageHeader';
import InputCustom from '../../component/InputCustom';
import ButtonCustom from '../../component/ButtonCustom';
import ModalCustom from '../../component/ModalCustom';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, wp, hp } from '../../theme';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { reportService } from '../../services/reportService';
import { rescueService } from '../../services/rescueService';
import { mapService } from '../../services/mapService';
import { mediaService } from '../../services/mediaService';
import { CreateReportRequest, Media } from '../../types/api/report';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import env from '../../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = '@civictwin_report_draft';

// Initialize Mapbox
MapboxGL.setAccessToken(env.MAPBOX_ACCESS_TOKEN);

// Category options matching API
const CATEGORIES = [
  { value: 1, label: 'Giao thông', icon: 'car', color: '#EF4444' },
  { value: 2, label: 'Môi trường', icon: 'leaf', color: '#10B981' },
  { value: 3, label: 'Cháy nổ', icon: 'fire', color: '#F97316' },
  { value: 4, label: 'Rác thải', icon: 'delete', color: '#8B5CF6' },
  { value: 5, label: 'Ngập lụt', icon: 'water', color: '#3B82F6' },
  { value: 6, label: 'Khác', icon: 'dots-horizontal', color: '#6B7280' },
];

// Priority options matching API
const PRIORITIES = [
  { value: 1, label: 'Bình thường', color: theme.colors.success },
  { value: 2, label: 'Trung bình', color: theme.colors.info },
  { value: 3, label: 'Cao', color: theme.colors.warning },
  { value: 4, label: 'Khẩn cấp', color: theme.colors.error },
];

const CreateReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateReport'>>();
  const isRescue = route.params?.isRescue === true;
  
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
    tieu_de: isRescue ? 'Cần hỗ trợ cứu hộ' : '',
    mo_ta: '',
    danh_muc: isRescue ? 5 : 1,
    vi_do: 10.7769,
    kinh_do: 106.7009,
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
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<CreateReportRequest>;
          if (saved.tieu_de || saved.mo_ta || saved.dia_chi) {
            setFormData(prev => ({ ...prev, ...saved, media_ids: [] }));
            setDraftRestored(true);
            setTimeout(() => setDraftRestored(false), 4000) as unknown as void;
          }
        } catch { /* ignore corrupt draft */ }
      }
      isMounted.current = true;
    });
  }, []);

  // Auto-save draft on every form change (after mount)
  useEffect(() => {
    if (!isMounted.current) return;
    const saveable = {
      tieu_de:    formData.tieu_de,
      mo_ta:      formData.mo_ta,
      dia_chi:    formData.dia_chi,
      danh_muc:   formData.danh_muc,
      uu_tien:    formData.uu_tien,
      vi_do:      formData.vi_do,
      kinh_do:    formData.kinh_do,
      the_tags:   formData.the_tags,
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
    setUploadStatus('Đang chuẩn bị...');
    
    const newMedia: Media[] = [];
    const newMediaIds: number[] = [];
    let aiAnalysisData: any = null;

    const totalAssets = assets.length;
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      try {
        setUploadStatus(`Đang tải ${i + 1}/${totalAssets} file...`);
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
        setUploadStatus('🤖 AI đang phân tích ảnh...');
        setUploadProgress(60);
        
        // Simulate AI processing time with progress
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        setUploadProgress(70);
        
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        setUploadProgress(85);
        
        const categoryLabel = CATEGORIES.find(c => c.value === aiAnalysisData.danh_muc_id)?.label || 'Khác';
        const priorityLabel = PRIORITIES.find(p => p.value === mapPriorityLevel(aiAnalysisData.muc_do_uu_tien || 'medium'))?.label || 'Trung bình';
        
        // Track which fields are auto-filled by AI
        const filledFields: string[] = [];
        
        setUploadStatus('📝 Đang điền thông tin...');
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
        setUploadStatus('✅ Hoàn tất!');

        // Prepare AI analysis message
        const detectedObjects = aiAnalysisData.ai_analysis?.detected_objects || [];
        const objectsText = detectedObjects.length > 0 
          ? `\n\n🔍 Phát hiện: ${detectedObjects.slice(0, 5).join(', ')}${detectedObjects.length > 5 ? '...' : ''}` 
          : '';
        
        setAiAnalysisMessage(
          `AI đã tự động phân tích và điền:\n\n` +
          `📁 Danh mục: ${categoryLabel}\n` +
          `⚠️ Mức độ: ${priorityLabel}\n` +
          `📝 Tiêu đề & Mô tả${objectsText}\n\n` +
          `Bạn có thể chỉnh sửa nếu cần.`
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
        quality: 0.5, // Reduced quality to avoid 413
        maxWidth: 1024, // Resize large images
        maxHeight: 1024,
        saveToPhotos: true,
      });

      if (result.assets && result.assets.length > 0) {
        await uploadMediaAssets(result.assets);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setErrorMessage('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.');
      setShowErrorModal(true);
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo', // Chỉ cho phép ảnh
        selectionLimit: 5 - uploadedMedia.length,
        quality: 0.5, // Reduced quality to avoid 413
        maxWidth: 1024, // Resize large images
        maxHeight: 1024,
      });

      if (result.assets && result.assets.length > 0) {
        await uploadMediaAssets(result.assets);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setErrorMessage('Không thể chọn ảnh. Vui lòng thử lại.');
      setShowErrorModal(true);
    }
  };

  const handleSelectMedia = () => {
    if (uploadedMedia.length >= 5) {
      setErrorMessage('Bạn chỉ được tải lên tối đa 5 ảnh/video');
      setShowErrorModal(true);
      return;
    }

    Alert.alert(
      'Chọn hình ảnh',
      'Chọn nguồn hình ảnh',
      [
        {
          text: 'Chụp ảnh',
          onPress: handleTakePhoto,
        },
        {
          text: 'Chọn từ thư viện',
          onPress: handleSelectFromGallery,
        },
        {
          text: 'Hủy',
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
    // Initialize tempLocation with current formData location when modal opens
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
      newErrors.tieu_de = 'Vui lòng nhập tiêu đề';
    } else if (formData.tieu_de.length < 10) {
      newErrors.tieu_de = 'Tiêu đề phải có ít nhất 10 ký tự';
    }

    if (!formData.mo_ta.trim()) {
      newErrors.mo_ta = 'Vui lòng nhập mô tả';
    } else if (formData.mo_ta.length < 20) {
      newErrors.mo_ta = 'Mô tả phải có ít nhất 20 ký tự';
    }

    if (!formData.dia_chi.trim()) {
      newErrors.dia_chi = 'Vui lòng nhập địa chỉ';
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
          setSuccessMessage('Yêu cầu cứu hộ khẩn cấp của bạn đã được gửi đi. Đội cứu hộ đang lộ trình!');
          setShowSuccessModal(true);
        }
      } else {
        const response = await reportService.createReport(formData);
        if (response.success) {
          setSuccessMessage('Phản ánh của bạn đã được tạo thành công!');
          setShowSuccessModal(true);
        }
      }
    } catch (error: any) {
      console.error('❌ [API Error] Create Report:', error);
      if (error.response) {
        console.log('Error Data:', error.response.data);
        console.log('Error Status:', error.response.status);
      }
      let message = 'Không thể tạo phản ánh của bạn. Vui lòng thử lại.';

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
      danh_muc: 1,
      vi_do: 10.7769,
      kinh_do: 106.7009,
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
        dia_chi: tempAddress || formData.dia_chi || `Vị trí: ${tempLocation[1].toFixed(6)}, ${tempLocation[0].toFixed(6)}`
      });
      setShowMapModal(false);
    }
  };

  const openMapModal = () => {
    setTempLocation([formData.kinh_do, formData.vi_do]);
    setShowMapModal(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title={isRescue ? "Yêu cầu Cứu hộ SOS" : "Tạo phản ánh mới"} variant="default" />

      {/* Draft Restored Banner */}
      {draftRestored && (
        <View style={styles.draftBanner}>
          <Icon name="content-save-outline" size={15} color="#6366F1" />
          <Text style={styles.draftBannerText}>Đã khôi phục bản nháp trước đó của bạn</Text>
          <TouchableOpacity onPress={() => {
            setDraftRestored(false);
            AsyncStorage.removeItem(DRAFT_KEY);
            setFormData({ tieu_de: '', mo_ta: '', danh_muc: 1, vi_do: 10.7769, kinh_do: 106.7009, dia_chi: '', uu_tien: 1, la_cong_khai: true, the_tags: [], media_ids: [] });
          }}>
            <Text style={styles.draftBannerDiscard}>Xóa</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Upload */}
         <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="image-multiple" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Hình ảnh minh họa</Text>
            </View>
            <View style={styles.aiChip}>
              <Icon name="robot" size={14} color={theme.colors.primary} />
              <Text style={styles.aiChipText}>AI phân tích</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>Thêm ảnh để AI phân tích và tự động điền thông tin</Text>

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
                    <Icon name="close-circle" size={24} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>
                {(media as any).ai_analysis && (
                  <View style={styles.mediaAiBadge}>
                    <Icon name="check-decagram" size={14} color={theme.colors.success} />
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
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : (
                  <>
                    <View style={styles.uploadIconBox}>
                      <Icon name="camera-plus-outline" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.uploadCardText}>Thêm ảnh</Text>
                    <Text style={styles.uploadCardHint}>{uploadedMedia.length}/5</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.uploadInfoRow}>
            <Icon name="information-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.uploadInfo}>Tối đa 5 ảnh (JPG, PNG). AI sẽ phân tích ảnh đầu tiên.</Text>
          </View>
        </View>

        {/* Category Selection - Select Style */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="shape" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Danh mục</Text>
            </View>
            {aiFilledFields.includes('danh_muc') && (
              <View style={styles.aiFilledBadge}>
                <Icon name="robot" size={12} color={theme.colors.primary} />
                <Text style={styles.aiFilledText}>AI chọn</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>Chọn danh mục phù hợp với vấn đề</Text>
          
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
                    { backgroundColor: selectedCategory ? selectedCategory.color + '15' : theme.colors.backgroundSecondary }
                  ]}>
                    <Icon
                      name={selectedCategory?.icon || 'shape'}
                      size={24}
                      color={selectedCategory?.color || theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.categorySelectContent}>
                    <Text style={styles.categorySelectLabel}>
                      {selectedCategory?.label || 'Chọn danh mục'}
                    </Text>
                    {selectedCategory && (
                      <Text style={styles.categorySelectHint}>Nhấn để thay đổi</Text>
                    )}
                  </View>
                  <Icon name="chevron-down" size={24} color={theme.colors.textSecondary} />
                </>
              );
            })()}
          </TouchableOpacity>
        </View>

        {/* Main Info */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="text-box" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            </View>
            {aiFilledFields.length > 0 && (
              <View style={styles.aiFilledBadge}>
                <Icon name="check-decagram" size={14} color={theme.colors.success} />
                <Text style={styles.aiFilledText}>AI đã điền</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>Mô tả rõ ràng về vấn đề bạn gặp phải</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputWithBadge}>
              <InputCustom
                label="Tiêu đề"
                placeholder="Nhập tiêu đề phản ánh"
                value={formData.tieu_de}
                onChangeText={(text) => {
                  setFormData({ ...formData, tieu_de: text });
                  // Remove from AI filled fields when manually edited
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
                  <Icon name="robot" size={12} color={theme.colors.primary} />
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
                label="Mô tả"
                placeholder="Mô tả chi tiết vấn đề"
                value={formData.mo_ta}
                onChangeText={(text) => {
                  setFormData({ ...formData, mo_ta: text });
                  // Remove from AI filled fields when manually edited
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
                  <Icon name="robot" size={12} color={theme.colors.primary} />
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
                <Icon name="tag-multiple" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.tagInputLabel}>Thẻ (Tags) - Tùy chọn</Text>
              </View>
            </View>
            <InputCustom
              placeholder="Nhập thẻ (ví dụ: ngập lụt)"
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
                    <Icon name="pound" size={14} color={theme.colors.primary} />
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                      <Icon name="close-circle" size={16} color={theme.colors.textSecondary} />
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
            <Icon name="map-marker" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Vị trí sự việc</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Xác định chính xác vị trí xảy ra sự việc</Text>
          
          <View style={styles.inputGroup}>
            <InputCustom
              label="Địa chỉ"
              placeholder="Nhập địa chỉ cụ thể"
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
                <Icon name="map-search" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.mapButtonContent}>
                <Text style={styles.mapButtonText}>Chọn vị trí trên bản đồ</Text>
                <Text style={styles.mapButtonHint}>Chạm để mở bản đồ</Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {formData.vi_do && formData.kinh_do && (
              <Text style={styles.coordsText}>
                Tọa độ: {formData.vi_do.toFixed(6)}, {formData.kinh_do.toFixed(6)}
              </Text>
            )}
          </View>
        </View>

        {/* Priority */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Icon name="alert-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Mức độ ưu tiên</Text>
            </View>
            {aiFilledFields.includes('uu_tien') && (
              <View style={styles.aiFilledBadge}>
                <Icon name="robot" size={12} color={theme.colors.primary} />
                <Text style={styles.aiFilledText}>AI đề xuất</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>Đánh giá mức độ nghiêm trọng của vấn đề</Text>
          
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
                    // Remove from AI filled fields when manually changed
                    if (aiFilledFields.includes('uu_tien')) {
                      setAiFilledFields(prev => prev.filter(f => f !== 'uu_tien'));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.priorityContent}>
                    {isActive && <Icon name="check-circle" size={18} color={theme.colors.white} />}
                    <Text style={[
                      styles.priorityText,
                      isActive && { color: theme.colors.white, fontWeight: '700' }
                    ]}>
                      {priority.label}
                    </Text>
                    {isAiFilled && (
                      <Icon name="robot" size={14} color={theme.colors.white} />
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
            <Icon name="shield-check" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Quyền riêng tư</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Ai có thể xem phản ánh này?</Text>
          
          <View style={styles.privacyCard}>
            <View style={[
              styles.privacyIconBox,
              { backgroundColor: formData.la_cong_khai ? theme.colors.success + '15' : theme.colors.warning + '15' }
            ]}>
              <Icon 
                name={formData.la_cong_khai ? "eye" : "eye-off"} 
                size={24} 
                color={formData.la_cong_khai ? theme.colors.success : theme.colors.warning}
              />
            </View>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyLabel}>
                {formData.la_cong_khai ? 'Công khai' : 'Riêng tư'}
              </Text>
              <Text style={styles.privacyDescription}>
                {formData.la_cong_khai
                  ? 'Mọi người đều có thể nhìn thấy'
                  : 'Chỉ bạn và cơ quan chức năng'}
              </Text>
            </View>
            <Switch
              value={formData.la_cong_khai}
              onValueChange={(value) => setFormData({ ...formData, la_cong_khai: value })}
              trackColor={{ false: theme.colors.border, true: theme.colors.success }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.footer}>
          <View style={styles.submitInfoCard}>
            <Icon name="information" size={20} color={theme.colors.info} />
            <Text style={styles.submitInfoText}>
              Phản ánh của bạn sẽ được gửi đến cơ quan chức năng phù hợp
            </Text>
          </View>
          <ButtonCustom
            title={loading ? 'Đang gửi...' : 'Gửi phản ánh'}
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
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.mapModalContainer} edges={['bottom']}>
            <View style={styles.mapHeader}>
              <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.mapTitle}>Chọn vị trí</Text>
              <TouchableOpacity onPress={confirmLocation} style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
              <MapboxGL.MapView
                ref={mapRef}
                style={styles.map}
                styleURL={MapboxGL.StyleURL.Street}
                logoEnabled={false}
                attributionEnabled={false}
                onPress={handleMapPress}
              >
                <MapboxGL.Camera
                  ref={cameraRef}
                  zoomLevel={15}
                  centerCoordinate={tempLocation || [106.7009, 10.7769]}
                  animationMode="flyTo"
                  animationDuration={1000}
                />
                {tempLocation && (
                  <MapboxGL.PointAnnotation
                    id="selectedLocation"
                    coordinate={tempLocation}
                  >
                    <View style={styles.markerContainer}>
                      <Icon name="map-marker" size={40} color={theme.colors.primary} />
                    </View>
                  </MapboxGL.PointAnnotation>
                )}
              </MapboxGL.MapView>

              <View style={styles.addressOverlay}>
                {loadingAddress ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {tempAddress || 'Chạm vào bản đồ để chọn vị trí'}
                  </Text>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Success Modal */}
      <ModalCustom
        isModalVisible={showSuccessModal}
        setIsModalVisible={setShowSuccessModal}
        title="Thành công"
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
        title="Lỗi"
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
        title="🤖 AI đã phân tích ảnh"
        type="success"
        isClose={false}
        actionText="Đồng ý"
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
              <Text style={styles.categoryModalTitle}>Chọn danh mục</Text>
              <TouchableOpacity onPress={handleCloseCategoryModal}>
                <Icon name="close" size={24} color={theme.colors.text} />
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
                        // Remove from AI filled fields when manually changed
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
                          {category.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.categoryOptionCheck, { backgroundColor: category.color }]}>
                          <Icon name="check" size={18} color={theme.colors.white} />
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
              <Icon name="robot" size={48} color={theme.colors.primary} />
            </Animated.View>

            <Text style={styles.loadingTitle}>
              {uploadingMedia ? '📤 Đang tải ảnh lên' : '🤖 AI đang phân tích'}
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
                    <Icon name="check" size={12} color={theme.colors.white} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  uploadProgress >= 10 && styles.stepTextActive,
                ]}>
                  Tải ảnh
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
                    <Icon name="check" size={12} color={theme.colors.white} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  uploadProgress >= 50 && styles.stepTextActive,
                ]}>
                  Phân tích AI
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
                    <Icon name="check" size={12} color={theme.colors.white} />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepText,
                  uploadProgress >= 95 && styles.stepTextActive,
                ]}>
                  Hoàn tất
                </Text>
              </View>
            </View>

            <Text style={styles.loadingHint}>Vui lòng đợi trong giây lát...</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: SCREEN_PADDING.horizontal,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  aiChipText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: theme.colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
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
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  categorySelectHint: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.border,
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
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    maxHeight: hp('70%'),
    paddingBottom: SPACING.xl,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    borderBottomColor: theme.colors.border,
  },
  categoryModalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.background,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryOptionSelected: {
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    ...theme.shadows.md,
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
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.primary + '15',
    borderRadius: BORDER_RADIUS.full,
    padding: 6,
    borderWidth: 2,
    borderColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  aiFilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  aiFilledText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.success,
    fontWeight: '600',
  },
  priorityChipAiFilled: {
    ...theme.shadows.sm,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: theme.colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  mapButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  mapButtonContent: {
    flex: 1,
  },
  mapButtonText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  mapButtonHint: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  coordsText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  tagText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  priorityText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  uploadTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.backgroundSecondary,
    ...theme.shadows.sm,
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
    color: theme.colors.white,
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
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    ...theme.shadows.md,
  },
  uploadCard: {
    width: (wp('100%') - SCREEN_PADDING.horizontal * 2 - SPACING.md * 3) / 2,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '05',
  },
  uploadIconBox: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  uploadCardText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadCardHint: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: theme.colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.info + '10',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.colors.info + '30',
  },
  submitInfoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: theme.colors.info,
    fontWeight: '500',
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: BORDER_RADIUS.xl,
    ...theme.shadows.md,
  },
  modalText: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: FONT_SIZE.md,
  },
  aiModalText: {
    textAlign: 'left',
    color: theme.colors.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
    paddingHorizontal: SPACING.xs,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
    marginTop: hp('20%'), // Start from 20% down (80% height)
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  mapTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  confirmButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  confirmButtonText: {
    color: theme.colors.white,
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
    backgroundColor: theme.colors.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...theme.shadows.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  addressText: {
    color: theme.colors.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingCard: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl * 1.5,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...theme.shadows.xl,
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 3,
    borderColor: theme.colors.primary + '30',
  },
  loadingTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  loadingStatus: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  progressText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary + '30',
    borderColor: theme.colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  stepDivider: {
    height: 2,
    backgroundColor: theme.colors.border,
    flex: 0.5,
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.lg,
  },
  loadingHint: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#6366F110',
    borderBottomWidth: 1,
    borderBottomColor: '#6366F120',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingVertical: SPACING.sm,
  },
  draftBannerText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: '#6366F1',
  },
  draftBannerDiscard: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: theme.colors.error,
  },
});

export default CreateReportScreen;
