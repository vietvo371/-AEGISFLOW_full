import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Report } from '../../types/api/report';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE } from '../../theme';

interface ReportCardProps {
    report: Report;
    onPress: () => void;
    showActions?: boolean;
    renderAction?: () => React.ReactNode;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onPress, showActions = false, renderAction }) => {
    const getCategoryColor = (category: number) => {
        const colors: { [key: number]: string } = {
            1: '#EF4444',   // Giao thông
            2: '#10B981',   // Môi trường
            3: '#F97316',   // Cháy nổ
            4: '#8B5CF6',   // Rác thải
            5: '#3B82F6',   // Ngập lụt
            6: '#6B7280',   // Khác
        };
        return colors[category] || theme.colors.textSecondary;
    };

    const getPriorityColor = (priorityLevel: number) => {
        // Based on cap_do: 0=low, 1=medium, 2=high, 3=urgent
        switch (priorityLevel) {
            case 3: return theme.colors.error;      // Khẩn cấp
            case 2: return theme.colors.warning;    // Cao
            case 1: return theme.colors.info;       // Trung bình
            default: return theme.colors.textSecondary; // Thấp
        }
    };

    const getStatusColor = (status: number) => {
        switch (status) {
            case 0: return theme.colors.warning;       // Tiếp nhận
            case 1: return theme.colors.info;          // Đã xác minh
            case 2: return '#8B5CF6';                  // Đang xử lý - Purple
            case 3: return theme.colors.success;       // Hoàn thành
            case 4: return theme.colors.error;         // Từ chối
            default: return theme.colors.textSecondary;
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

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Không rõ';

        try {
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Không rõ';
            }

            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);

            if (hours < 1) return 'Vừa xong';
            if (hours < 24) return `${hours} giờ trước`;
            if (days < 7) return `${days} ngày trước`;
            return date.toLocaleDateString('vi-VN');
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return 'Không rõ';
        }
    };

    const formatAiTag = (tag: string | string[] | null | undefined): string => {
        if (!tag) return '';
        // If it's an array, take the last item (usually the most specific tag) or join them
        // Based on screenshot "otherstreetlight", it seems to be a single string or we want the specific part
        let tagStr = '';
        if (Array.isArray(tag)) {
            tagStr = tag.length > 0 ? tag[tag.length - 1] : '';
        } else {
            tagStr = tag;
        }

        // Map common tags to Vietnamese
        const tagMap: Record<string, string> = {
            'otherstreetlight': 'Đèn đường',
            'otherviolation': 'Vi phạm trật tự',
            'pothole': 'Hư hỏng đường bộ',
            'flood': 'Ngập lụt',
            'trash': 'Rác thải',
            'fire': 'Cháy nổ',
            'accident': 'Tai nạn giao thông',
            'construction': 'Công trình xây dựng',
            'noise': 'Tiếng ồn',
            'tree': 'Cây xanh',
            'other': 'Khác'
        };

        return tagMap[tagStr] || tagStr;
    };

    // Get category name and color from nested object or ID
    const categoryName = report.danh_muc?.ten_danh_muc || 'Khác';
    const categoryColor = report.danh_muc?.mau_sac || getCategoryColor(report.danh_muc_id);

    // Get priority from nested object
    const priorityText = report.uu_tien?.ten_muc;
    const priorityLevel = report.uu_tien?.cap_do || 0;
    const priorityColor = report.uu_tien?.mau_sac || getPriorityColor(priorityLevel);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    {report.nguoi_dung?.anh_dai_dien ? (
                        <Image source={{ uri: report.nguoi_dung.anh_dai_dien }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Icon name="account" size={20} color={theme.colors.white} />
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{report.nguoi_dung?.ho_ten || 'Người dùng'}</Text>
                        <Text style={styles.date}>{formatDate(report.created_at)}</Text>
                    </View>
                </View>
                <View style={styles.badges}>
                    {renderAction ? (
                        renderAction()
                    ) : (
                        <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                            <Text style={[styles.badgeText, { color: '#6B7280' }]}>
                                {categoryName}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>{report.tieu_de}</Text>
                <Text style={styles.description} numberOfLines={3}>{report.mo_ta}</Text>

                {/* Location */}
                <View style={styles.location}>
                    <Icon name="map-marker" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.locationText} numberOfLines={1}>{report.dia_chi}</Text>
                </View>

                {/* Media Preview */}
                {report.media && report.media.length > 0 && (
                    <View style={styles.mediaPreview}>
                        <Image
                            source={{ uri: report.media[0].url }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                        />
                        {report.media.length > 1 && (
                            <View style={styles.mediaCount}>
                                <Icon name="image-multiple" size={16} color={theme.colors.white} />
                                <Text style={styles.mediaCountText}>+{report.media.length - 1}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.stats}>
                    <View style={styles.stat}>
                        <Icon name="thumb-up-outline" size={16} color={theme.colors.success} />
                        <Text style={styles.statText}>{report.luot_ung_ho}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Icon name="thumb-down-outline" size={16} color={theme.colors.error} />
                        <Text style={styles.statText}>{report.luot_khong_ung_ho}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Icon name="eye-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.statText}>{report.luot_xem}</Text>
                    </View>
                </View>

                <View style={styles.statusBadges}>
                    {priorityText && priorityLevel > 0 && (
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                            <Icon name="flag" size={12} color={theme.colors.white} />
                            <Text style={styles.priorityText}>{priorityText}</Text>
                        </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.trang_thai) }]}>
                        <Text style={styles.statusText}>{getStatusText(report.trang_thai)}</Text>
                    </View>
                </View>
            </View>

            {/* AI Tags */}
            {report.nhan_ai && (
                <View style={styles.aiTag}>
                    <Icon name="robot" size={16} color={theme.colors.primary} />
                    <Text style={styles.aiTagText}>{formatAiTag(report.nhan_ai)}</Text>
                    {report.do_tin_cay && (
                        <Text style={styles.confidenceText}>
                            {Math.round(report.do_tin_cay * 100)}%
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userDetails: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    userName: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.text,
    },
    date: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    badges: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    badgeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
    },
    content: {
        marginBottom: SPACING.sm,
    },
    title: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: SPACING.xs,
    },
    description: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.sm,
    },
    location: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    locationText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
        marginLeft: 4,
        flex: 1,
    },
    mediaPreview: {
        position: 'relative',
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        marginTop: SPACING.sm,
    },
    mediaImage: {
        width: '100%',
        height: 200,
        backgroundColor: theme.colors.backgroundSecondary,
    },
    mediaCount: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mediaCountText: {
        color: theme.colors.white,
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    stats: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    statusBadges: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        gap: 4,
    },
    priorityText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.white,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    statusText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.white,
        fontWeight: '600',
    },
    aiTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: 6,
    },
    aiTagText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.primary,
        fontWeight: '600',
        flex: 1,
    },
    confidenceText: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.success,
        fontWeight: '700',
    },
});

export default ReportCard;
