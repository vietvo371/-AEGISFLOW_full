/**
 * Map Configuration - OpenMapVN (MapLibre-based)
 * Sử dụng @rnmapbox/maps với custom style từ OpenMapVN
 */

import Mapbox from '@rnmapbox/maps';
import env from './env';

// Không cần Mapbox token khi dùng OpenMapVN style
Mapbox.setAccessToken('');

// Disable telemetry
Mapbox.setTelemetryEnabled(false);

const openMapStyleUrl =
  (env as any).OPENMAP_STYLE_URL ||
  'https://tiles.openmap.vn/styles/day-v1/style.json';
const openMapApiKey = (env as any).OPENMAP_API_KEY || '';

// OpenMapVN Style URL
export const OPENMAP_STYLE_URL =
  openMapApiKey && !openMapStyleUrl.includes('apikey=')
    ? `${openMapStyleUrl}${openMapStyleUrl.includes('?') ? '&' : '?'}apikey=${openMapApiKey}`
    : openMapStyleUrl;

// Configure camera settings
export const DEFAULT_CAMERA_CONFIG = {
  zoomLevel: 12,
  pitch: 0,
  heading: 0,
  animationMode: 'flyTo' as const,
  animationDuration: 1000,
};

// Da Nang default coordinates
export const DA_NANG_CENTER = {
  longitude: 108.245350,
  latitude: 16.068882,
};

export default Mapbox;
