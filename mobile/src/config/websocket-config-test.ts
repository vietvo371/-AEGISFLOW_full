/**
 * File này để test các cấu hình WebSocket khác nhau
 * Uncomment cấu hình nào muốn test
 */

import env from './env';

// ============================================================================
// CẤU HÌNH 1: Production với Nginx Reverse Proxy (KHUYẾN NGHỊ)
// ============================================================================
// Web app đang dùng config này thành công!
// Nginx proxy từ https://api.cityresq360.io.vn/app/ -> localhost:6001
export const WEBSOCKET_CONFIG_PRODUCTION = {
  key: env.REVERB_APP_KEY,
  cluster: 'mt1',
  wsHost: env.REVERB_HOST,  // api.cityresq360.io.vn
  wsPort: 443,  // Port HTTPS (qua Nginx)
  wssPort: 443,
  forceTLS: true,  // Bắt buộc SSL
  enabledTransports: ['wss'],  // Chỉ dùng wss
  disableStats: true,
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  enableLogging: true,
  activityTimeout: 30000,
  pongTimeout: 30000,
};

// ============================================================================
// CẤU HÌNH 1B: Production với Nginx (ĐÚNG - Web dùng config này)
// ============================================================================
// ✅ CHÍNH XÁC - Web app dùng config này!
// WebSocket URL: wss://api.cityresq360.io.vn/app/lwf6joghdvbowg9hb7p4
// Pusher-js BẮT BUỘC phải có cluster field (dù không dùng thực sự)
export const WEBSOCKET_CONFIG_NO_CLUSTER = {
  key: env.REVERB_APP_KEY,  // lwf6joghdvbowg9hb7p4
  cluster: 'mt1',           // ⚠️ BẮT BUỘC phải có (Pusher requirement)
  wsHost: env.REVERB_HOST,  // api.cityresq360.io.vn
  wsPort: 443,              // HTTPS port qua Nginx
  wssPort: 443,
  forceTLS: true,           // wss:// = SSL enabled
  enabledTransports: ['wss'],
  disableStats: true,
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  enableLogging: true,
  activityTimeout: 30000,
  pongTimeout: 30000,
};

// ============================================================================
// CẤU HÌNH 2: Production với port 6001 (Reverb default)
// ============================================================================
export const WEBSOCKET_CONFIG_REVERB_DEFAULT = {
  key: env.REVERB_APP_KEY,
  cluster: 'mt1',
  wsHost: env.REVERB_HOST,
  wsPort: 6001,
  wssPort: 6001,
  forceTLS: true,
  enabledTransports: ['wss', 'ws'],
  disableStats: true,
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  enableLogging: true,
  activityTimeout: 30000,
  pongTimeout: 30000,
};

// ============================================================================
// CẤU HÌNH 3: Development local (không SSL)
// ============================================================================
export const WEBSOCKET_CONFIG_LOCAL = {
  key: env.REVERB_APP_KEY,
  cluster: 'mt1',
  wsHost: '192.168.1.100', // Thay bằng IP máy tính của bạn
  wsPort: 8080,
  wssPort: 8080,
  forceTLS: false,
  enabledTransports: ['ws'],  // Chỉ dùng ws (không SSL)
  disableStats: true,
  authEndpoint: 'http://192.168.1.100:8000/broadcasting/auth',
  enableLogging: true,
  activityTimeout: 30000,
  pongTimeout: 30000,
};

// ============================================================================
// CẤU HÌNH 4: Không cluster behavior (Custom host only)
// ============================================================================
// Khi có wsHost, Pusher sẽ IGNORE cluster và kết nối trực tiếp tới host
// Nhưng vẫn PHẢI có cluster field (dummy value)
export const WEBSOCKET_CONFIG_FALLBACK = {
  key: env.REVERB_APP_KEY,
  cluster: 'eu',  // Dummy cluster (sẽ bị ignore vì có wsHost)
  wsHost: env.REVERB_HOST,  // Kết nối trực tiếp tới đây
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['wss'],
  disableStats: true,
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  enableLogging: true,
  activityTimeout: 30000,
  pongTimeout: 30000,
};

// ============================================================================
// CẤU HÌNH 5: Thử không forceTLS (auto-detect)
// ============================================================================
export const WEBSOCKET_CONFIG_AUTO_TLS = {
  key: env.REVERB_APP_KEY,
  cluster: 'mt1',
  wsHost: env.REVERB_HOST,
  wsPort: 443,
  wssPort: 443,
  forceTLS: false,  // Để Pusher tự detect
  enabledTransports: ['wss', 'ws'],
  disableStats: true,
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
  enableLogging: true,
  activityTimeout: 30000,
  pongTimeout: 30000,
};

// ============================================================================
// CẤU HÌNH 6: Minimal config (chỉ fields bắt buộc)
// ============================================================================
// Pusher-js BẮT BUỘC: key, cluster
// Optional nhưng quan trọng: wsHost, wsPort, forceTLS
export const WEBSOCKET_CONFIG_MINIMAL = {
  key: env.REVERB_APP_KEY,
  cluster: 'mt1',
  wsHost: env.REVERB_HOST,
  wsPort: 443,
  forceTLS: true,
  authEndpoint: `${env.API_URL}/broadcasting/auth`,
};

// ============================================================================
// CHỌN CẤU HÌNH SỬ DỤNG
// ============================================================================
// 💥 Vẫn failed với mt1 cluster
// → THỬ CONFIG KHÁC:
// 1. FALLBACK: Dùng cluster dummy (sẽ bị ignore)
// 2. AUTO_TLS: Để Pusher tự detect SSL
// 3. LARAVEL_ECHO: Giống documentation

// export default WEBSOCKET_CONFIG_NO_CLUSTER;  // ✅ Đã thử - vẫn failed
export default WEBSOCKET_CONFIG_MINIMAL;         // ✅ Thử config tối giản
// export default WEBSOCKET_CONFIG_FALLBACK;
// export default WEBSOCKET_CONFIG_AUTO_TLS;
// export default WEBSOCKET_CONFIG_PRODUCTION;
// export default WEBSOCKET_CONFIG_REVERB_DEFAULT;
// export default WEBSOCKET_CONFIG_LOCAL;
