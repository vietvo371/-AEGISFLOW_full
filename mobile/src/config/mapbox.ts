/**
 * Mapbox Configuration
 * Initialize Mapbox GL for React Native
 */

import Mapbox from '@rnmapbox/maps';
import env from './env';

// Set Mapbox access token
Mapbox.setAccessToken(env.MAPBOX_ACCESS_TOKEN);

// Disable telemetry (optional - để tránh gửi analytics)
Mapbox.setTelemetryEnabled(false);

// Set WellKnownTileServer (optional - để sử dụng Mapbox tiles)
Mapbox.setWellKnownTileServer('Mapbox');

// Configure camera settings (optional)
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

