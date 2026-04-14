import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE } from '../../theme';

export interface FilterOptions {
    danh_muc_id?: number;
    trang_thai?: number;
    uu_tien_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    search?: string;
}

export interface ReportFilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: FilterOptions;
    onApply: (filters: FilterOptions) => void;
}

interface ReportFiltersProps {
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
}

const CATEGORIES = [
    { value: -1, label: 'Tất cả danh mục' },
    { value: 1, label: 'Giao thông', icon: 'car', color: theme.colors.primary },
    { value: 2, label: 'Môi trường', icon: 'leaf', color: theme.colors.success },
    { value: 3, label: 'Cháy nổ', icon: 'fire', color: theme.colors.error },
    { value: 4, label: 'Rác thải', icon: 'trash-can', color: theme.colors.warning },
    { value: 5, label: 'Ngập lụt', icon: 'weather-pouring', color: theme.colors.info },
    { value: 6, label: 'Khác', icon: 'dots-horizontal', color: theme.colors.textSecondary },
];

const STATUSES = [
    { value: -1, label: 'Tất cả trạng thái' },
    { value: 0, label: 'Tiếp nhận', color: theme.colors.warning },
    { value: 1, label: 'Đã xác minh', color: theme.colors.info },
    { value: 2, label: 'Đang xử lý', color: theme.colors.primary },
    { value: 3, label: 'Hoàn thành', color: theme.colors.success },
    { value: 4, label: 'Từ chối', color: theme.colors.error },
];

const PRIORITIES = [
    { value: -1, label: 'Tất cả mức độ' },
    { value: 1, label: 'Thấp', color: theme.colors.success },
    { value: 2, label: 'Trung bình', color: theme.colors.info },
    { value: 3, label: 'Cao', color: theme.colors.warning },
    { value: 4, label: 'Khẩn cấp', color: theme.colors.error },
];

const SORT_OPTIONS = [
    { value: 'created_at', label: 'Ngày tạo' },
    { value: 'luot_ung_ho', label: 'Lượt ủng hộ' },
    { value: 'luot_xem', label: 'Lượt xem' },
    { value: 'updated_at', label: 'Cập nhật gần đây' },
];

export const ReportFilterModal: React.FC<ReportFilterModalProps> = ({ visible, onClose, filters, onApply }) => {
    const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);

    // Update tempFilters when filters prop changes or modal opens
    React.useEffect(() => {
        if (visible) {
            setTempFilters(filters);
        }
    }, [visible, filters]);

    const handleApply = () => {
        onApply(tempFilters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters: FilterOptions = {
            sort_by: 'created_at',
            sort_order: 'desc'
        };
        setTempFilters(resetFilters);
        // We don't apply immediately on reset, user should click Apply
        // Or we can apply immediately if that's the desired UX. 
        // Based on previous code, it applied immediately. Let's keep it consistent but wait for Apply button?
        // Previous code: onFiltersChange(resetFilters); setShowModal(false);
        // Let's just reset temp and let user click Apply for consistency with other changes
    };

    // Previous code had immediate apply on reset. Let's stick to that if we want exact behavior, 
    // but usually Reset just clears form. Let's make Reset clear the form and user clicks Apply.
    // Actually, looking at previous code:
    // const handleReset = () => { ... onFiltersChange(resetFilters); setShowModal(false); };
    // So it did apply and close.
    // Let's change behavior slightly to be more standard modal: Reset clears selection, Apply commits.
    // Or to match previous behavior:
    const handleResetAndApply = () => {
        const resetFilters: FilterOptions = {
            sort_by: 'created_at',
            sort_order: 'desc'
        };
        setTempFilters(resetFilters);
        onApply(resetFilters);
        onClose();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Bộ lọc</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Category Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Danh mục</Text>
                            <View style={styles.optionsGrid}>
                                {CATEGORIES.map(category => (
                                    <TouchableOpacity
                                        key={category.value}
                                        style={[
                                            styles.option,
                                            tempFilters.danh_muc_id === category.value && styles.optionActive
                                        ]}
                                        onPress={() => setTempFilters({
                                            ...tempFilters,
                                            danh_muc_id: category.value === -1 ? undefined : category.value
                                        })}
                                    >
                                        {category.icon && (
                                            <Icon
                                                name={category.icon}
                                                size={20}
                                                color={tempFilters.danh_muc_id === category.value ? theme.colors.white : category.color}
                                            />
                                        )}
                                        <Text style={[
                                            styles.optionText,
                                            tempFilters.danh_muc_id === category.value && styles.optionTextActive
                                        ]}>
                                            {category.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Status Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Trạng thái</Text>
                            <View style={styles.optionsGrid}>
                                {STATUSES.map(status => (
                                    <TouchableOpacity
                                        key={status.value}
                                        style={[
                                            styles.option,
                                            tempFilters.trang_thai === status.value && styles.optionActive
                                        ]}
                                        onPress={() => setTempFilters({
                                            ...tempFilters,
                                            trang_thai: status.value === -1 ? undefined : status.value
                                        })}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            tempFilters.trang_thai === status.value && styles.optionTextActive
                                        ]}>
                                            {status.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Priority Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Mức độ ưu tiên</Text>
                            <View style={styles.optionsGrid}>
                                {PRIORITIES.map(priority => (
                                    <TouchableOpacity
                                        key={priority.value}
                                        style={[
                                            styles.option,
                                            tempFilters.uu_tien_id === priority.value && styles.optionActive
                                        ]}
                                        onPress={() => setTempFilters({
                                            ...tempFilters,
                                            uu_tien_id: priority.value === -1 ? undefined : priority.value
                                        })}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            tempFilters.uu_tien_id === priority.value && styles.optionTextActive
                                        ]}>
                                            {priority.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Sort Options */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Sắp xếp theo</Text>
                            <View style={styles.optionsGrid}>
                                {SORT_OPTIONS.map(sort => (
                                    <TouchableOpacity
                                        key={sort.value}
                                        style={[
                                            styles.option,
                                            tempFilters.sort_by === sort.value && styles.optionActive
                                        ]}
                                        onPress={() => setTempFilters({
                                            ...tempFilters,
                                            sort_by: sort.value
                                        })}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            tempFilters.sort_by === sort.value && styles.optionTextActive
                                        ]}>
                                            {sort.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Sort Order */}
                            <View style={styles.sortOrderContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.sortOrderButton,
                                        tempFilters.sort_order === 'desc' && styles.sortOrderActive
                                    ]}
                                    onPress={() => setTempFilters({ ...tempFilters, sort_order: 'desc' })}
                                >
                                    <Icon name="sort-descending" size={20} color={tempFilters.sort_order === 'desc' ? theme.colors.white : theme.colors.text} />
                                    <Text style={[
                                        styles.sortOrderText,
                                        tempFilters.sort_order === 'desc' && styles.sortOrderTextActive
                                    ]}>Giảm dần</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.sortOrderButton,
                                        tempFilters.sort_order === 'asc' && styles.sortOrderActive
                                    ]}
                                    onPress={() => setTempFilters({ ...tempFilters, sort_order: 'asc' })}
                                >
                                    <Icon name="sort-ascending" size={20} color={tempFilters.sort_order === 'asc' ? theme.colors.white : theme.colors.text} />
                                    <Text style={[
                                        styles.sortOrderText,
                                        tempFilters.sort_order === 'asc' && styles.sortOrderTextActive
                                    ]}>Tăng dần</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.resetButton} onPress={handleResetAndApply}>
                            <Text style={styles.resetButtonText}>Đặt lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const ReportFilters: React.FC<ReportFiltersProps> = ({ filters, onFiltersChange }) => {
    const [showModal, setShowModal] = useState(false);
    const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== -1).length;

    return (
        <>
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowModal(true)} activeOpacity={0.7}>
                <Icon name="filter-variant" size={ICON_SIZE.sm} color={theme.colors.primary} />
                <Text style={styles.filterButtonText}>Bộ lọc</Text>
                {activeFiltersCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <ReportFilterModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                filters={filters}
                onApply={onFiltersChange}
            />
        </>
    );
};

const styles = StyleSheet.create({
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterButtonText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.text,
    },
    badge: {
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: theme.colors.white,
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: BORDER_RADIUS['2xl'],
        borderTopRightRadius: BORDER_RADIUS['2xl'],
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: theme.colors.text,
    },
    modalBody: {
        padding: SPACING.lg,
    },
    filterSection: {
        marginBottom: SPACING.xl,
    },
    filterLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: SPACING.sm,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    optionActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    optionText: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.text,
        fontWeight: '500',
    },
    optionTextActive: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    sortOrderContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    sortOrderButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: SPACING.sm,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sortOrderActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    sortOrderText: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.text,
        fontWeight: '500',
    },
    sortOrderTextActive: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: SPACING.md,
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    resetButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: theme.colors.text,
    },
    applyButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        backgroundColor: theme.colors.primary,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: theme.colors.white,
    },
});

export default ReportFilters;
