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

// NDA Maps API key - for Routing & Geocoding
export const NDA_API_KEY = '6TTIZbUWJmRMSpiYzQ0YY8z5v8wv43w0';
export const NDA_BASE_URL = 'https://mapapis.openmap.vn/v1';

/**
 * Tạo URL chỉ đường giữa 2 điểm
 * ⚠️ NDA API nhận origin/destination theo dạng lat,lng (không phải lng,lat)
 * @param p1 [longitude, latitude] - điểm xuất phát
 * @param p2 [longitude, latitude] - điểm đến
 */
export const ndaDirectionsURL = (p1: [number, number], p2: [number, number]) =>
  `${NDA_BASE_URL}/direction?origin=${p1[1]},${p1[0]}&destination=${p2[1]},${p2[0]}&vehicle=car&apikey=${NDA_API_KEY}`;

export default Mapbox;
