import { Report } from '../types/api/report';

/**
 * Utility functions for working with Report data
 */

/**
 * Get tags as array from Report
 * @param report - Report object
 * @returns Array of tag strings
 */
export const getReportTags = (report: Report): string[] => {
    if (!report.the_tags) return [];
    if (Array.isArray(report.the_tags)) return report.the_tags;
    return [];
};

/**
 * Get AI labels as array from Report
 * @param report - Report object
 * @returns Array of AI label strings
 */
export const getReportAILabels = (report: Report): string[] => {
    if (!report.nhan_ai) return [];
    if (Array.isArray(report.nhan_ai)) return report.nhan_ai;
    if (typeof report.nhan_ai === 'string') return [report.nhan_ai];
    return [];
};

/**
 * Format report status to readable text
 * Backend constants:
 * - TRANG_THAI_PENDING = 0 (Tiếp nhận)
 * - TRANG_THAI_VERIFIED = 1 (Đã xác minh)
 * - TRANG_THAI_IN_PROGRESS = 2 (Đang xử lý)
 * - TRANG_THAI_RESOLVED = 3 (Hoàn thành)
 * - TRANG_THAI_REJECTED = 4 (Từ chối)
 * @param trang_thai - Status code
 * @returns Status text in Vietnamese
 */
export const getStatusText = (trang_thai: number): string => {
    const statusMap: Record<number, string> = {
        0: 'Tiếp nhận',
        1: 'Đã xác minh',
        2: 'Đang xử lý',
        3: 'Hoàn thành',
        4: 'Từ chối',
    };
    return statusMap[trang_thai] || 'Không xác định';
};

/**
 * Get status color based on status code
 * @param trang_thai - Status code
 * @returns Color hex code
 */
export const getStatusColor = (trang_thai: number): string => {
    const colorMap: Record<number, string> = {
        0: '#F59E0B', // Amber - Tiếp nhận (Pending)
        1: '#3B82F6', // Blue - Đã xác minh (Verified)
        2: '#8B5CF6', // Purple - Đang xử lý (In Progress)
        3: '#10B981', // Green - Hoàn thành (Resolved)
        4: '#EF4444', // Red - Từ chối (Rejected)
    };
    return colorMap[trang_thai] || '#6B7280';
};

/**
 * Format view count to readable string
 * @param count - View count
 * @returns Formatted string (e.g., "1.2k", "1.5M")
 */
export const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
};

/**
 * Calculate net votes (upvotes - downvotes)
 * @param report - Report object
 * @returns Net vote count
 */
export const getNetVotes = (report: Report): number => {
    return report.luot_ung_ho - report.luot_khong_ung_ho;
};

/**
 * Get priority level text
 * @param cap_do - Priority level
 * @returns Priority text in Vietnamese
 */
export const getPriorityText = (cap_do: number): string => {
    const priorityMap: Record<number, string> = {
        0: 'Thấp',
        1: 'Trung bình',
        2: 'Cao',
        3: 'Khẩn cấp',
    };
    return priorityMap[cap_do] || 'Không xác định';
};

/**
 * Check if report is urgent based on priority level
 * @param report - Report object
 * @returns True if urgent (priority level >= 2)
 */
export const isReportUrgent = (report: Report): boolean => {
    return report.uu_tien?.cap_do ? report.uu_tien.cap_do >= 2 : false;
};

/**
 * Check if report response is overdue
 * @param report - Report object
 * @returns True if overdue
 */
export const isResponseOverdue = (report: Report): boolean => {
    if (!report.han_phan_hoi || report.thoi_gian_phan_hoi_thuc_te) {
        return false;
    }
    const deadline = new Date(report.han_phan_hoi);
    return new Date() > deadline;
};

/**
 * Get time remaining until response deadline
 * @param report - Report object
 * @returns Hours remaining (negative if overdue)
 */
export const getResponseTimeRemaining = (report: Report): number | null => {
    if (!report.han_phan_hoi) return null;
    const deadline = new Date(report.han_phan_hoi);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60)); // Convert to hours
};
