import { ApiResponse } from './common';

export type UserRole = 'citizen' | 'emergency' | 'traffic_operator' | 'urban_planner' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ResetPasswordRequest {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface VerifyCodeRequest {
  code: string;
}

export interface UpdateFcmTokenRequest {
  fcm_token: string;
}
