/**
 * navigateFromPushNotification — Điều hướng từ Push Notification
 * Xử lý khi user tap vào notification để mở app và điều hướng đến màn hình phù hợp
 */

import { navigationRef } from './NavigationService';

const MAX_ATTEMPTS = 24;
const DELAY_MS = 150;

/**
 * Convert unknown data thành Record<string, string>
 */
function coerceData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.startsWith('_')) {
      continue;
    }
    if (v != null && v !== '') {
      out[k] = String(v);
    }
  }
  return out;
}

/**
 * Lấy incident/alert ID từ notification data
 * Hỗ trợ các loại notification: alert, incident, rescue, flood_warning
 */
export function extractIdFromPushData(data: Record<string, string>): number | null {
  const type = data.type ?? '';

  let raw: string | undefined;
  switch (type) {
    case 'alert':
      raw = data.alert_id ?? data.id;
      break;
    case 'incident':
    case 'incident_created':
      raw = data.incident_id ?? data.id;
      break;
    case 'rescue':
    case 'rescue_status_update':
      raw = data.rescue_id ?? data.id;
      break;
    case 'flood_warning':
      raw = data.prediction_id ?? data.flood_zone_id ?? data.id;
      break;
    default:
      raw = data.alert_id ?? data.incident_id ?? data.rescue_id ?? data.id;
  }

  if (raw == null || raw === '') {
    return null;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Lấy type từ notification data
 */
export function extractTypeFromPushData(data: Record<string, string>): string {
  return data.type ?? 'unknown';
}

/**
 * Điều hướng đến màn hình phù hợp dựa trên notification type
 */
export function navigateFromPushData(data: Record<string, string>): boolean {
  const type = data.type ?? 'unknown';
  const id = extractIdFromPushData(data);

  switch (type) {
    case 'alert':
      // Navigate đến Alert detail hoặc Alerts list
      if (id) {
        navigationRef.navigate('Alerts', { alertId: id } as any);
      } else {
        navigationRef.navigate('Alerts' as any);
      }
      return true;

    case 'incident':
    case 'incident_created':
      // Navigate đến Incident detail
      if (id) {
        navigationRef.navigate('IncidentDetail', { id } as any);
      } else {
        navigationRef.navigate('CitizenTabs' as any);
      }
      return true;

    case 'rescue':
    case 'rescue_status_update':
      // Navigate đến Rescue detail hoặc Emergency tabs
      if (id) {
        navigationRef.navigate('IncidentDetail', { id, isRescue: true } as any);
      } else {
        navigationRef.navigate('EmergencyTabs' as any);
      }
      return true;

    case 'flood_warning':
      // Navigate đến Map với vị trí flood warning
      if (data.latitude && data.longitude) {
        navigationRef.navigate('Map' as any, {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          focusOnWarning: true,
        } as any);
      } else {
        navigationRef.navigate('Map' as any);
      }
      return true;

    case 'report_status':
      // Navigate đến Report detail
      if (id) {
        navigationRef.navigate('ReportDetail', { id } as any);
      } else {
        navigationRef.navigate('MyReports' as any);
      }
      return true;

    default:
      // Navigate về home
      navigationRef.navigate('CitizenTabs' as any);
      return false;
  }
}

/**
 * Điều hướng đến IncidentDetail khi user tap notification (background/quit)
 * Retry vì cold start có thể chưa có navigationRef.isReady()
 */
export function scheduleNavigateFromPush(remoteMessage: {
  data?: Record<string, unknown> | undefined;
}): void {
  const data = coerceData(remoteMessage?.data);
  if (Object.keys(data).length === 0) {
    return;
  }

  let attempts = 0;
  const tick = () => {
    if (navigationRef.isReady()) {
      navigateFromPushData(data);
      return;
    }
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) {
      setTimeout(tick, DELAY_MS);
    } else {
      console.log('[PushNav] Max attempts reached, navigating to home');
      navigationRef.navigate('CitizenTabs' as any);
    }
  };

  requestAnimationFrame(() => {
    setTimeout(tick, 0);
  });
}

/**
 * Foreground banner: xử lý notification từ WebSocket
 */
export function navigateFromInAppNotification(
  notificationType: string,
  data: unknown,
): void {
  const base = coerceData(data);
  if (!base.type) {
    base.type = notificationType;
  }
  scheduleNavigateFromPush({ data: base });
}

/**
 * Tạo notification data object từ FCM message
 */
export function createNotificationData(remoteMessage: any): Record<string, string> {
  return coerceData(remoteMessage?.data);
}
