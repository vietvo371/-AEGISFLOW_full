export interface Notification {
    id: number | string;
    // Standard Keys (English)
    title: string;
    message: string;
    type: string;
    read: boolean;
    data?: any;
    created_at: string;

    // Legacy Keys (Backward Compatibility - Optional)
    tieu_de?: string;
    noi_dung?: string;
    loai?: string;
    da_doc?: boolean;
    du_lieu_mo_rong?: {
        phan_anh_id?: number;
        trang_thai_moi?: number;
        [key: string]: any;
    };
    ngay_tao?: string;
}

export interface NotificationFilterParams {
    page?: number;
    per_page?: number;
    da_doc?: boolean;
}

export interface NotificationSettings {
    push_enabled: boolean;
    email_enabled: boolean;
    report_updates: boolean;
    comment_replies: boolean;
}
