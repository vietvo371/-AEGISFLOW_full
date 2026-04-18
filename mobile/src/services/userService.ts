import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { UserProfile, UserStats } from '../types/api/user';
import { Report } from '../types/api/report';

export const userService = {
    getUserProfile: async (userId: number): Promise<ApiResponse<UserProfile>> => {
        // Backend /users/{id} chỉ có ở admin routes
        // Dùng /auth/me thay thế
        const response = await api.get<ApiResponse<any>>('/auth/me');
        return response.data;
    },

    getUserReports: async (userId: number, page: number = 1): Promise<ApiResponse<Report[]>> => {
        // Backend không có endpoint này - dùng /incidents thay thế
        const response = await api.get<ApiResponse<any>>('/incidents', {
            params: { per_page: 20, page }
        });
        return response.data;
    },

    getUserStats: async (userId: number): Promise<ApiResponse<UserStats>> => {
        // Backend không có endpoint này - trả về placeholder
        return {
            success: true,
            message: '',
            data: {
                total_reports: 0,
                resolved_reports: 0,
                pending_reports: 0,
            }
        };
    }
};
