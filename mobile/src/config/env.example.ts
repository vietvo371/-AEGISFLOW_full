/**
 * Cấu hình môi trường ứng dụng - FILE MẪU
 * Copy file này thành env.ts và điền thông tin thích hợp
 */

const env = {
  // API URL
  API_URL: 'https://api.example.com',

  // EKYC Configuration
  REVERB_APP_ID: 'YOUR_REVERB_APP_ID',
  REVERB_APP_KEY: 'YOUR_REVERB_APP_KEY',
  REVERB_APP_SECRET: 'YOUR_REVERB_APP_SECRET',
  REVERB_HOST: 'YOUR_REVERB_HOST',
  REVERB_PORT: 'YOUR_REVERB_PORT',  // Port HTTPS thay vì 6001
  REVERB_SCHEME: 'YOUR_REVERB_SCHEME',

  // MapTiler Configuration (Open Source Map Provider)
  MAPTILER_API_KEY: 'YOUR_MAPTILER_API_KEY', // Get free key from https://cloud.maptiler.com

  // Các cấu hình khác
  TIMEOUT: 15000,
  DEBUG: true,
};

export default env;
