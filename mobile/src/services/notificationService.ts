import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { Notification, NotificationFilterParams } from '../types/api/notification';

export const notificationService = {
    getNotifications: async (params?: NotificationFilterParams): Promise<ApiResponse<Notification[]>> => {
        const response = await api.get<ApiResponse<Notification[]>>('/notifications', { params });
        return response.data;
    },

    getUnreadNotifications: async (): Promise<ApiResponse<Notification[]>> => {
        const response = await api.get<ApiResponse<Notification[]>>('/notifications/unread');
        return response.data;
    },

    getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
        try {
            const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
            return response.data;
        } catch (error: any) {
            if (error?.response?.status === 401) {
                return { success: true, message: 'Unauthenticated', data: { count: 0 } };
            }
            throw error;
        }
    },

    markAsRead: async (id: number): Promise<ApiResponse<any>> => {
        const response = await api.put<ApiResponse<any>>(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async (): Promise<ApiResponse<any>> => {
        const response = await api.put<ApiResponse<any>>('/notifications/read-all');
        return response.data;
    },

    // Backend không có endpoint này - silent fail
    deleteNotification: async (_id: number): Promise<ApiResponse<void>> => {
        return { success: true, message: 'Xóa thông báo không được hỗ trợ', data: undefined };
    },

    // Backend không có endpoint này - silent fail
    updateSettings: async (): Promise<ApiResponse<any>> => {
        return { success: true, message: 'Cài đặt thông báo không được hỗ trợ', data: null };
    }
};
