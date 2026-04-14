import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { UserProfile, UserStats } from '../types/api/user';
import { Report } from '../types/api/report';

export const userService = {
    getUserProfile: async (userId: number): Promise<ApiResponse<UserProfile>> => {
        const response = await api.get<ApiResponse<UserProfile>>(`/users/${userId}`);
        return response.data;
    },

    getUserReports: async (userId: number, page: number = 1): Promise<ApiResponse<Report[]>> => {
        const response = await api.get<ApiResponse<Report[]>>(`/users/${userId}/reports`, {
            params: { page }
        });
        return response.data;
    },

    getUserStats: async (userId: number): Promise<ApiResponse<UserStats>> => {
        const response = await api.get<ApiResponse<UserStats>>(`/users/${userId}/stats`);
        return response.data;
    }
};
