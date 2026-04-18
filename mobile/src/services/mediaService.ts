import api from '../utils/Api';
import { ApiResponse } from '../types/api/common';
import { Media } from '../types/api/report';

export const mediaService = {
    uploadMedia: async (
        file: any,
        type: 'image' | 'video' = 'image',
        lien_ket_den: 'phan_anh' | 'binh_luan' = 'phan_anh',
        mo_ta: string = ''
    ): Promise<ApiResponse<Media>> => {
        // Backend không có MediaController - upload cục bộ trên mobile
        // Trả về placeholder media object
        const placeholderId = Math.floor(Math.random() * 100000);
        const mediaUrl = file.uri || '';
        return {
            success: true,
            message: 'Upload cục bộ (backend chưa có MediaController)',
            data: {
                id: placeholderId,
                url: mediaUrl,
                type: type,
                thumbnail_url: type === 'video' ? mediaUrl : undefined,
            } as Media,
        };
    },

    getMyMedia: async (params?: { page?: number; type?: 'image' | 'video' }): Promise<ApiResponse<Media[]>> => {
        // Backend không có endpoint này
        return { success: true, message: '', data: [] };
    },

    getMediaDetail: async (mediaId: number): Promise<ApiResponse<Media>> => {
        // Backend không có endpoint này
        return { success: false, message: 'Media detail không được hỗ trợ', data: null as any };
    },

    deleteMedia: async (mediaId: number): Promise<ApiResponse<void>> => {
        // Backend không có endpoint này
        return { success: true, message: 'Xóa media không được hỗ trợ', data: null as any };
    }
};
