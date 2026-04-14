import axios from "axios";
import { Platform } from 'react-native';
import { getToken, removeToken, saveToken } from "./TokenManager";
import { navigate, resetTo } from "../navigation/NavigationService";
import Geolocation from 'react-native-geolocation-service';
import i18n from '../i18n';
import { ErrorModalManager } from './ErrorModalManager.tsx';
import env from '../config/env.ts';

// Location interface
interface LocationData {
  lat: number;
  long: number;
}

let cachedLocation: LocationData | null = null;
let locationCacheTime = 0;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let isShowingAuthAlert = false;

const getCurrentLocation = (): Promise<LocationData | null> => {
  return new Promise((resolve) => {
    const now = Date.now();
    if (cachedLocation && (now - locationCacheTime) < LOCATION_CACHE_DURATION) {
      resolve(cachedLocation);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = {
          lat: latitude,
          long: longitude,
        };
        cachedLocation = location;
        locationCacheTime = now;

        resolve(location);
      },
      (error) => {
        const defaultLocation = {
          lat: 16.068882,
          long: 108.245350,
        };

        cachedLocation = defaultLocation;
        locationCacheTime = now;

        resolve(defaultLocation);
      },
      {
        enableHighAccuracy: false,
        timeout: 1000,
        maximumAge: 300000,
        showLocationDialog: false,
        forceRequestLocation: false,
      }
    );
  });
};


const baseUrl = env.API_URL + '/api';

// Export baseUrl để sử dụng trong các service khác
export const API_BASE_URL = env.API_URL + '/api';

const api = axios.create({
  baseURL: baseUrl,
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  maxRedirects: 0,
  validateStatus: function (status) {
    return status >= 200 && status < 400;
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  console.log('language', i18n.language);
  config.headers['x-Language'] = i18n.language || 'vi';

  if (token) {
    console.log('token', token);
    config.headers.Authorization = `Bearer ${token}`;
  }

  getCurrentLocation().then((location) => {
    if (location) {
      config.headers['x-location'] = JSON.stringify(location);
    }
  }).catch((error) => {
  });

  return config;
});

const MAX_RETRY_ATTEMPTS = 2;

const shouldRetry = (error: any, retryCount: number) => {
  if (retryCount >= MAX_RETRY_ATTEMPTS) return false;
  if (error.response?.status === 422) return false;
  if (error.response?.status === 403) return false;
  return (
    !error.response ||
    error.code === 'ECONNABORTED' ||
    /timeout/i.test(error.message) ||
    error.response.status === 401 ||
    (error.response.status >= 500 && error.response.status <= 599)
  );
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: any) => {
    const config = error.config;

    config.retryCount = config.retryCount || 0;

    if (shouldRetry(error, config.retryCount)) {
      config.retryCount += 1;
      const delayMs = Math.min(1000 * (2 ** config.retryCount), 10000);
      await new Promise<void>(resolve => setTimeout(resolve, delayMs));

      return api(config);
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('Timeout after retries:', error);
      removeToken();
      ErrorModalManager.showTimeoutError(() => {
        resetTo('Login');
      });
      return Promise.reject(error);
    }

    if (error.response?.status === 422) {
      console.log('Validation error:', error.response.data);
      return Promise.reject(error);
    }

    // For 401/403 errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Check if this is a login request - don't show modal for login failures
      const isLoginRequest = config.url?.includes('/auth/login');
      
      // Only show "Session Expired" if the original request actually had a token
      // If no Authorization header was sent, it's just a normal "not logged in" status
      const hasToken = !!config.headers?.Authorization;

      if (!isLoginRequest && hasToken) {
        // Only remove token and show modal for authenticated requests that fail
        removeToken();
        if (!isShowingAuthAlert) {
          isShowingAuthAlert = true;

          if (error.response?.status === 401) {
            ErrorModalManager.showSessionExpired(() => {
              isShowingAuthAlert = false;
              resetTo('Login');
            });
          } else {
            ErrorModalManager.showAccessDenied(() => {
              isShowingAuthAlert = false;
              resetTo('Login');
            });
          }
        }
      }

      // Always reject the error so the caller can handle it
      return Promise.reject(error);
    }

    console.log('API error after retries:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      retryCount: config.retryCount,
    });
    return Promise.reject(error);
  }
);

export default api;