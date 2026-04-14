import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/types';
import PageHeader from '../../component/PageHeader';
import VoteButtons from '../../components/reports/VoteButtons';
import ModalCustom from '../../component/ModalCustom';
import ButtonCustom from '../../component/ButtonCustom';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, wp } from '../../theme';
import { reportService } from '../../services/reportService';

import { ReportDetail } from '../../types/api/report';

type ReportDetailRouteProp = RouteProp<RootStackParamList, 'IncidentDetail'>;

const VOTE_STORAGE_KEY = 'user_votes';

const ReportDetailScreen = () => {
  const route = useRoute<ReportDetailRouteProp>();
  const navigation = useNavigation();
  const { id } = route.params;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null); // 1: upvoted, -1: downvoted, null: not voted

  // Load user vote from AsyncStorage
  const loadUserVote = async () => {
    try {
      const votesJson = await AsyncStorage.getItem(VOTE_STORAGE_KEY);
      if (votesJson) {
        const votes = JSON.parse(votesJson);
        setUserVote(votes[id] || null);
      }
    } catch (error) {
      console.error('Error loading user vote:', error);
    }
  };

  // Save user vote to AsyncStorage
  const saveUserVote = async (vote: number | null) => {
    try {
      const votesJson = await AsyncStorage.getItem(VOTE_STORAGE_KEY);
      const votes = votesJson ? JSON.parse(votesJson) : {};
      if (vote === null) {
        delete votes[id];
      } else {
        votes[id] = vote;
      }
      await AsyncStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(votes));
      setUserVote(vote);
    } catch (error) {
      console.error('Error saving user vote:', error);
    }
  };

  const fetchReportDetail = useCallback(async () => {
    try {
      const response = await reportService.getReportDetail(id);
      console.log('Report detail response:', response);
      if (response.success) {
        setReport(response.data);
      }
    } catch (error) {
      console.error('Error fetching report detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReportDetail();
    loadUserVote(); // Load user's vote state from AsyncStorage
    // Increment view count
    reportService.incrementView(id).catch(err => console.error('Error incrementing view:', err));
  }, [fetchReportDetail, id]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    try {
      const voteValue = type === 'upvote' ? 1 : -1;

      // Determine new vote state
      let newVoteState: number | null;
      if (userVote === voteValue) {
        // Clicking same vote = remove vote
        newVoteState = null;
      } else {
        // Clicking different vote = set new vote
        newVoteState = voteValue;
      }

      // Save vote state locally
      await saveUserVote(newVoteState);

      // Call API
      const response = await reportService.voteReport(id, type);
      console.log('Vote response:', response);

      // Refresh to get updated counts
      fetchReportDetail();
    } catch (error) {
      console.error('Vote error:', error);
      // Revert vote state on error
      await loadUserVote();
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const response = await reportService.addComment(id, commentText);
      console.log('Comment response:', response);
      if (response.success) {
        setCommentText('');
        fetchReportDetail();
      }
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateReport = async () => {
    try {
      setSubmittingRating(true);
      const response = await reportService.rateReport(id, rating);
      console.log('Rate response:', response);
      if (response.success) {
        setShowRatingModal(false);
        setShowSuccessModal(true);
        fetchReportDetail();
      }
    } catch (error) {
      console.error('Rate error:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return theme.colors.warning;     // Tiếp nhận
      case 1: return theme.colors.info;        // Đã xác minh
      case 2: return '#8B5CF6';                // Đang xử lý - Purple
      case 3: return theme.colors.success;     // Hoàn thành
      case 4: return theme.colors.error;       // Từ chối
      default: return theme.colors.textSecondary;
    }
  };

  const getPriorityColor = (capDo: number) => {
    // cap_do: 0=low, 1=medium, 2=high, 3=urgent
    switch (capDo) {
      case 3: return theme.colors.error;      // Khẩn cấp
      case 2: return theme.colors.warning;    // Cao  
      case 1: return theme.colors.info;       // Trung bình
      default: return theme.colors.success;   // Thấp
    }
  };

  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return 'Tiếp nhận';
      case 1: return 'Đã xác minh';
      case 2: return 'Đang xử lý';
      case 3: return 'Hoàn thành';
      case 4: return 'Từ chối';
      default: return 'Không rõ';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy phản ánh</Text>
        <ButtonCustom title="Quay lại" onPress={() => navigation.goBack()} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title="Chi tiết phản ánh" variant="default" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.trang_thai) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(report.trang_thai) }]}>
                  {getStatusText(report.trang_thai)}
                </Text>
              </View>
              {report.uu_tien && (
                <View style={[styles.priorityBadge, { borderColor: getPriorityColor(report.uu_tien.cap_do) }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(report.uu_tien.cap_do) }]}>
                    {report.uu_tien.ten_muc}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.title}>{report.tieu_de}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="clock-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>
                  {new Date(report.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="eye-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{report.luot_xem} lượt xem</Text>
              </View>
            </View>

            <View style={styles.locationContainer}>
              <Icon name="map-marker" size={16} color={theme.colors.primary} />
              <Text style={styles.locationText}>{report.dia_chi}</Text>
            </View>
          </View>

          {/* Description Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
            <Text style={styles.description}>{report.mo_ta}</Text>

            {/* Media Gallery */}
            {report.hinh_anhs && report.hinh_anhs.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                {report.hinh_anhs.map((item) => (
                  <TouchableOpacity key={item.id} activeOpacity={0.9}>
                    <Image
                      source={{ uri: item.duong_dan_hinh_anh }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Actions Card */}
          <View style={styles.card}>
            <View style={styles.actionsRow}>
              <VoteButtons
                reportId={report.id}
                initialUpvotes={report.luot_ung_ho}
                initialDownvotes={report.luot_khong_ung_ho || 0}
                userVoted={userVote}
                onVote={handleVote}
              />

              {/* Show Rate button if resolved */}
              {report.trang_thai === 3 && (
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => setShowRatingModal(true)}
                >
                  <Icon name="star" size={18} color={theme.colors.warning} />
                  <Text style={styles.rateButtonText}>Đánh giá</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Bình luận ({report.binh_luans?.length || 0})</Text>
            {report.binh_luans && report.binh_luans.length > 0 ? (
              report.binh_luans.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {((comment as any).user?.ho_ten || (comment as any).nguoi_dung?.ho_ten || 'U').charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.commentUser}>
                          {(comment as any).user?.ho_ten || (comment as any).nguoi_dung?.ho_ten || 'Người dùng'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {new Date(comment.created_at || comment.ngay_tao || '').toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{comment.noi_dung}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Viết bình luận của bạn..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              placeholderTextColor={theme.colors.textSecondary}
            />
            {commentText.length > 0 && (
              <Text style={styles.charCounter}>
                {commentText.length}/500
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              !commentText.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Icon
                name="send"
                size={22}
                color={commentText.trim() ? theme.colors.white : theme.colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đánh giá kết quả xử lý</Text>
            <Text style={styles.modalSubtitle}>Bạn cảm thấy thế nào về kết quả xử lý phản ánh này?</Text>

            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Icon
                    name={star <= rating ? "star" : "star-outline"}
                    size={40}
                    color={theme.colors.warning}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitRatingButton}
                onPress={handleRateReport}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.submitRatingText}>Gửi đánh giá</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ModalCustom
        isModalVisible={showSuccessModal}
        setIsModalVisible={setShowSuccessModal}
        title="Cảm ơn bạn!"
        type="success"
        isClose={true}
        actionText="Đóng"
      >
        <Text style={styles.successText}>Đánh giá của bạn đã được ghi nhận.</Text>
      </ModalCustom>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
    marginBottom: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_PADDING.horizontal,
    paddingBottom: 80,
    paddingTop: SPACING.md,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: SPACING.xs,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  locationText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  mediaScroll: {
    marginTop: SPACING.sm,
  },
  mediaImage: {
    width: wp('70%'),
    height: wp('45%'),
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  rateButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentsSection: {
    marginTop: SPACING.sm,
  },
  commentItem: {
    backgroundColor: theme.colors.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...theme.shadows.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  commentUser: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  commentTime: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  commentContent: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  emptyComments: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    color: theme.colors.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS['2xl'],
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 50,
    maxHeight: 120,
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  charCounter: {
    position: 'absolute',
    right: SPACING.md,
    bottom: 8,
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
    ...theme.shadows.none,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: SPACING.sm,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  submitRatingButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  submitRatingText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  successText: {
    fontSize: FONT_SIZE.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
});

export default ReportDetailScreen;
