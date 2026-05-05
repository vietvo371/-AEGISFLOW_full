
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AegisFlow AI — Mobile App Prototype</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --brand-500: #7a5af8;
      --brand-400: #9b8afb;
      --brand-600: #6938ef;
      --amber: #F59E0B;
      --red: #EF4444;
      --success: #17b26a;
      --warning: #f79009;
      --danger: #f04438;
      --info: #7a5af8;

      --critical: #EF4444;
      --critical-bg: #FEF2F2;
      --high: #F97316;
      --high-bg: #FFF7ED;
      --medium: #EAB308;
      --medium-bg: #FEFCE8;
      --low: #3B82F6;
      --low-bg: #EFF6FF;

      --bg: #FFFFFF;
      --bg-secondary: #F8F9FB;
      --bg-tertiary: #F0F2F5;
      --surface: #FAFBFC;

      --text-primary: #111827;
      --text-secondary: #6B7280;
      --text-tertiary: #9CA3AF;
      --text-light: #D1D5DB;

      --border: #E5E7EB;
      --border-light: #F3F4F6;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #f8f9fb 0%, #e8eaed 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }

    .page-title {
      text-align: center;
      margin-bottom: 32px;
    }
    .page-title h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .page-title p {
      font-size: 14px;
      color: var(--text-secondary);
    }

    /* Gallery View */
    .gallery {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 24px;
      max-width: 1600px;
      margin: 0 auto 60px;
    }

    .phone-wrapper {
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .phone-wrapper:hover {
      transform: translateY(-8px);
    }
    .phone-wrapper.active {
      transform: scale(1.02);
    }

    .phone-label {
      text-align: center;
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    /* iPhone 15 Pro Frame */
    .iphone-frame {
      width: 390px;
      height: 844px;
      background: #1a1a1a;
      border-radius: 54px;
      padding: 12px;
      position: relative;
      box-shadow:
        0 50px 100px -20px rgba(0,0,0,0.25),
        0 30px 60px -30px rgba(0,0,0,0.3),
        inset 0 0 0 2px #2a2a2a,
        inset 0 0 0 4px #1a1a1a;
    }

    .iphone-screen {
      width: 100%;
      height: 100%;
      background: var(--bg);
      border-radius: 44px;
      overflow: hidden;
      position: relative;
    }

    /* Dynamic Island */
    .dynamic-island {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 126px;
      height: 36px;
      background: #000;
      border-radius: 20px;
      z-index: 100;
    }

    /* Status Bar */
    .status-bar {
      position: absolute;
      top: 12px;
      left: 0;
      right: 0;
      height: 44px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 28px;
      z-index: 50;
    }
    .status-bar.light { color: #fff; }
    .status-bar.dark { color: #000; }
    .status-time { font-size: 15px; font-weight: 600; }
    .status-icons { display: flex; gap: 5px; align-items: center; font-size: 13px; }

    /* Home Indicator */
    .home-indicator {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 134px;
      height: 5px;
      background: #000;
      border-radius: 3px;
      z-index: 100;
    }
    .home-indicator.light { background: #fff; }

    /* Screen Content */
    .screen-content {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .screen-content::-webkit-scrollbar { display: none; }

    /* Bottom Tab Bar */
    .tab-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 84px;
      background: #fff;
      border-top: 1px solid var(--border-light);
      display: flex;
      align-items: flex-start;
      justify-content: space-around;
      padding-top: 8px;
      z-index: 90;
    }

    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      color: var(--text-tertiary);
      font-size: 10px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .tab-item.active { color: var(--brand-500); }
    .tab-item svg { width: 24px; height: 24px; }

    .tab-fab {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--brand-500), var(--brand-400));
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -20px;
      box-shadow: 0 4px 12px rgba(122, 90, 248, 0.4);
    }
    .tab-fab svg { width: 28px; height: 28px; color: #fff; }

    /* Header Gradient */
    .header-gradient {
      background: linear-gradient(135deg, var(--brand-500) 0%, var(--brand-400) 100%);
      padding: 60px 20px 24px;
      color: #fff;
    }

    /* Cards */
    .card {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      padding: 16px;
      margin-bottom: 12px;
    }

    .card-severity {
      border-left: 4px solid;
    }
    .card-severity.critical { border-color: var(--critical); }
    .card-severity.high { border-color: var(--high); }
    .card-severity.medium { border-color: var(--medium); }
    .card-severity.low { border-color: var(--low); }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge.critical { background: rgba(239,68,68,0.15); color: var(--critical); }
    .badge.high { background: rgba(249,115,22,0.15); color: var(--high); }
    .badge.medium { background: rgba(234,179,8,0.15); color: var(--medium); }
    .badge.low { background: rgba(59,130,246,0.15); color: var(--low); }
    .badge.success { background: rgba(23,178,106,0.15); color: var(--success); }
    .badge.active { background: rgba(23,178,106,0.15); color: var(--success); }

    /* Quick Actions Grid */
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px 20px;
    }
    .quick-action {
      background: #fff;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .quick-action-icon {
      width: 52px;
      height: 52px;
      border-radius: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .quick-action-icon svg { width: 26px; height: 26px; }
    .quick-action span { font-size: 13px; font-weight: 600; color: var(--text-primary); }

    /* Section */
    .section {
      padding: 0 20px;
      margin-bottom: 20px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .section-link {
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-500);
    }

    /* Alert Banner */
    .alert-banner {
      background: var(--critical);
      border-radius: 14px;
      padding: 16px;
      margin: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #fff;
    }
    .alert-banner-icon {
      width: 44px;
      height: 44px;
      background: rgba(255,255,255,0.2);
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .alert-banner-content { flex: 1; }
    .alert-banner-title { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
    .alert-banner-desc { font-size: 12px; opacity: 0.9; }

    /* Form Elements */
    .form-group { margin-bottom: 20px; }
    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
      display: block;
    }
    .form-input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 15px;
      color: var(--text-primary);
      background: #fff;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--brand-500);
      box-shadow: 0 0 0 3px rgba(122,90,248,0.1);
    }
    .form-textarea {
      min-height: 100px;
      resize: none;
    }

    /* Chips */
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      padding: 10px 16px;
      border: 2px solid var(--border);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: #fff;
      transition: all 0.2s;
    }
    .chip.selected {
      border-color: var(--brand-500);
      background: rgba(122,90,248,0.08);
      color: var(--brand-500);
    }
    .chip.critical.selected { border-color: var(--critical); background: rgba(239,68,68,0.1); color: var(--critical); }
    .chip.high.selected { border-color: var(--high); background: rgba(249,115,22,0.1); color: var(--high); }
    .chip.medium.selected { border-color: var(--medium); background: rgba(234,179,8,0.1); color: #a16207; }
    .chip.low.selected { border-color: var(--low); background: rgba(59,130,246,0.1); color: var(--low); }

    /* Button */
    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: linear-gradient(135deg, var(--brand-500), var(--brand-400));
      color: #fff;
      box-shadow: 0 4px 12px rgba(122,90,248,0.3);
    }
    .btn-danger {
      background: var(--critical);
      color: #fff;
      box-shadow: 0 4px 12px rgba(239,68,68,0.3);
    }
    .btn-outline {
      background: transparent;
      border: 2px solid var(--border);
      color: var(--text-primary);
    }

    /* Profile */
    .profile-header {
      text-align: center;
      padding: 80px 20px 24px;
      background: #fff;
    }
    .profile-avatar {
      width: 80px;
      height: 80px;
      border-radius: 40px;
      background: linear-gradient(135deg, var(--brand-500), var(--brand-400));
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }
    .profile-name { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .profile-email { font-size: 14px; color: var(--text-secondary); }

    .menu-section { padding: 16px 20px; }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border-light);
    }
    .menu-item:last-child { border-bottom: none; }
    .menu-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .menu-icon svg { width: 20px; height: 20px; color: var(--text-secondary); }
    .menu-label { flex: 1; font-size: 15px; color: var(--text-primary); }
    .menu-item.danger .menu-label { color: var(--critical); }
    .menu-item.danger .menu-icon { background: rgba(239,68,68,0.1); }
    .menu-item.danger svg { color: var(--critical); }

    /* Shelter Card */
    .shelter-card { margin: 12px 20px; }
    .shelter-name { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .shelter-address { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .shelter-capacity { margin-bottom: 10px; }
    .shelter-capacity-bar { height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
    .shelter-capacity-fill { height: 100%; background: var(--success); border-radius: 3px; }
    .shelter-capacity-text { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
    .shelter-facilities { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .facility-chip {
      padding: 6px 10px;
      background: var(--bg-secondary);
      border-radius: 8px;
      font-size: 11px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .shelter-footer { display: flex; justify-content: space-between; align-items: center; }
    .shelter-distance { font-size: 13px; color: var(--text-secondary); }
    .shelter-btn {
      padding: 8px 16px;
      border: 1px solid var(--brand-500);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-500);
      background: transparent;
    }

    /* Map placeholder */
    .map-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 84px;
      background: linear-gradient(180deg, #e8f4f8 0%, #d0e8ed 100%);
    }
    .map-overlay {
      position: absolute;
      top: 60px;
      left: 16px;
      right: 16px;
    }
    .map-search {
      background: #fff;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .map-search input {
      border: none;
      outline: none;
      flex: 1;
      font-size: 15px;
    }
    .map-controls {
      position: absolute;
      top: 120px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .map-btn {
      width: 44px;
      height: 44px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .map-markers {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .map-marker {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .map-marker.critical { background: var(--critical); }
    .map-marker.high { background: var(--high); }
    .map-marker.shelter { background: var(--success); }
    .map-marker svg { width: 20px; height: 20px; color: #fff; }

    .map-bottom-card {
      position: absolute;
      bottom: 100px;
      left: 16px;
      right: 16px;
      background: #fff;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    }

    /* Animations */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in { animation: fadeInUp 0.4s ease forwards; }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
    }
    .pulse { animation: pulse 2s infinite; }

    /* Detail View */
    .detail-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .detail-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .detail-phone {
      transform: scale(0.9);
      transition: transform 0.3s;
    }
    .detail-overlay.active .detail-phone {
      transform: scale(1);
    }
    .detail-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      background: #fff;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    /* Screen navigation */
    .screen { display: none; }
    .screen.active { display: block; }
  </style>
</head>
<body>
  <div class="page-title">
    <h1>AegisFlow AI — Mobile Prototype</h1>
    <p>Ứng dụng cảnh báo ngập lụt • Click vào màn hình để xem chi tiết</p>
  </div>

  <!-- Gallery View -->
  <div class="gallery" id="gallery">
    <!-- 1. HomeScreen -->
    <div class="phone-wrapper" data-screen="home">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar light">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="screen-content">
            <div class="header-gradient">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <div>
                  <div style="font-size:12px;opacity:0.85;margin-bottom:2px">Chủ nhật, 04/05/2026</div>
                  <div style="font-size:22px;font-weight:700">Xin chào, Minh Tuấn</div>
                </div>
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:20px;display:flex;align-items:center;justify-content:center;position:relative">
                  <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                  <div style="position:absolute;top:-2px;right:-2px;width:18px;height:18px;background:#EF4444;border-radius:9px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">3</div>
                </div>
              </div>
              <div style="display:flex;gap:16px;font-size:12px;opacity:0.9;margin-top:12px">
                <span>☁️ 28°C</span>
                <span>💧 82%</span>
                <span>🌧 15mm/h</span>
              </div>
            </div>

            <div class="alert-banner pulse animate-in" style="animation-delay:0.1s">
              <div class="alert-banner-icon">
                <svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
              </div>
              <div class="alert-banner-content">
                <div class="alert-banner-title">Cảnh báo ngập nghiêm trọng</div>
                <div class="alert-banner-desc">Quận 7 - Mực nước dự kiến 0.8m</div>
              </div>
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            <div class="quick-actions">
              <div class="quick-action animate-in" style="animation-delay:0.2s">
                <div class="quick-action-icon" style="background:rgba(59,130,246,0.12)">
                  <svg fill="none" stroke="#3B82F6" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                </div>
                <span>Báo cáo ngập</span>
              </div>
              <div class="quick-action animate-in" style="animation-delay:0.25s">
                <div class="quick-action-icon" style="background:rgba(239,68,68,0.12)">
                  <svg fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M9.17 14.83l-4.24 4.24"/></svg>
                </div>
                <span>Yêu cầu cứu hộ</span>
              </div>
              <div class="quick-action animate-in" style="animation-delay:0.3s">
                <div class="quick-action-icon" style="background:rgba(34,197,94,0.12)">
                  <svg fill="none" stroke="#22C55E" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
                </div>
                <span>Nơi trú ẩn</span>
              </div>
              <div class="quick-action animate-in" style="animation-delay:0.35s">
                <div class="quick-action-icon" style="background:rgba(139,92,246,0.12)">
                  <svg fill="none" stroke="#8B5CF6" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span>Bản đồ ngập</span>
              </div>
            </div>

            <div class="section animate-in" style="animation-delay:0.4s">
              <div class="section-header">
                <span class="section-title">Cảnh báo đang hoạt động</span>
                <span class="section-link">Xem tất cả</span>
              </div>

              <div class="card card-severity critical">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                  <span style="font-size:14px;font-weight:600;color:var(--text-primary)">Ngập nặng đường Nguyễn Văn Linh</span>
                  <span class="badge critical">Nghiêm trọng</span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2 2"/></svg>
                  15 phút trước
                </div>
              </div>

              <div class="card card-severity high">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                  <span style="font-size:14px;font-weight:600;color:var(--text-primary)">Mưa lớn cảnh báo - Quận 2</span>
                  <span class="badge high">Cao</span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2 2"/></svg>
                  1 giờ trước
                </div>
              </div>
            </div>

            <div style="height:120px"></div>
          </div>

          <div class="tab-bar">
            <div class="tab-item active">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <span>Trang chủ</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Bản đồ</span>
            </div>
            <div class="tab-fab">
              <svg fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span>Cảnh báo</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              <span>Cá nhân</span>
            </div>
          </div>
          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">1. Trang chủ</div>
    </div>

    <!-- 2. AlertsScreen -->
    <div class="phone-wrapper" data-screen="alerts">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar dark">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="screen-content" style="padding-top:60px">
            <div style="padding:0 20px 16px">
              <h1 style="font-size:28px;font-weight:800;color:var(--text-primary);margin-bottom:4px">Cảnh báo</h1>
              <p style="font-size:14px;color:var(--text-secondary)">Cập nhật tình hình ngập lụt & thời tiết</p>
            </div>

            <div style="padding:0 20px">
              <div class="card card-severity critical animate-in" style="display:flex;gap:14px;animation-delay:0.1s">
                <div style="width:44px;height:44px;background:rgba(239,68,68,0.15);border-radius:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="22" height="22" fill="none" stroke="#EF4444" stroke-width="2"><path d="M2 12s2-4 5-4c4 0 4 4 5 4s1.5-2 3-2 2.5 2 5 2"/><path d="M2 18s2-4 5-4c4 0 4 4 5 4s1.5-2 3-2 2.5 2 5 2"/></svg>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
                    <span style="font-size:15px;font-weight:600;color:var(--text-primary);flex:1">Ngập nặng đường Nguyễn Văn Linh</span>
                    <span class="badge critical">Nghiêm trọng</span>
                  </div>
                  <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">Mực nước đạt 0.8m, các phương tiện không thể lưu thông. Khuyến cáo người dân tránh di chuyển qua khu vực.</p>
                  <div style="display:flex;gap:12px;font-size:12px;color:var(--text-tertiary)">
                    <span style="display:flex;align-items:center;gap:4px">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>
                      15 phút trước
                    </span>
                    <span class="badge active" style="font-size:10px;padding:2px 8px">Đang hoạt động</span>
                  </div>
                </div>
              </div>

              <div class="card card-severity high animate-in" style="display:flex;gap:14px;animation-delay:0.2s">
                <div style="width:44px;height:44px;background:rgba(249,115,22,0.15);border-radius:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="22" height="22" fill="none" stroke="#F97316" stroke-width="2"><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/><path d="M8 19v-6M12 19v-4M16 19v-2"/></svg>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
                    <span style="font-size:15px;font-weight:600;color:var(--text-primary);flex:1">Cảnh báo mưa lớn - Quận 2</span>
                    <span class="badge high">Cao</span>
                  </div>
                  <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Dự báo mưa lớn trong 2 giờ tới, lượng mưa dự kiến 50-80mm.</p>
                  <div style="display:flex;gap:12px;font-size:12px;color:var(--text-tertiary)">
                    <span style="display:flex;align-items:center;gap:4px">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>
                      1 giờ trước
                    </span>
                    <span class="badge active" style="font-size:10px;padding:2px 8px">Đang hoạt động</span>
                  </div>
                </div>
              </div>

              <div class="card card-severity medium animate-in" style="display:flex;gap:14px;animation-delay:0.3s">
                <div style="width:44px;height:44px;background:rgba(234,179,8,0.15);border-radius:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="22" height="22" fill="none" stroke="#EAB308" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
                    <span style="font-size:15px;font-weight:600;color:var(--text-primary);flex:1">Nguy cơ ngập - Bình Thạnh</span>
                    <span class="badge medium">Trung bình</span>
                  </div>
                  <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Triều cường kết hợp mưa lớn, nguy cơ ngập nhẹ các tuyến đường ven kênh.</p>
                  <div style="display:flex;gap:12px;font-size:12px;color:var(--text-tertiary)">
                    <span style="display:flex;align-items:center;gap:4px">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>
                      3 giờ trước
                    </span>
                    <span class="badge active" style="font-size:10px;padding:2px 8px">Đang hoạt động</span>
                  </div>
                </div>
              </div>

              <div class="card card-severity low animate-in" style="display:flex;gap:14px;animation-delay:0.4s">
                <div style="width:44px;height:44px;background:rgba(59,130,246,0.15);border-radius:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="22" height="22" fill="none" stroke="#3B82F6" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M11 7v4l2 2"/></svg>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
                    <span style="font-size:15px;font-weight:600;color:var(--text-primary);flex:1">Dự báo thời tiết tuần tới</span>
                    <span class="badge low">Thông tin</span>
                  </div>
                  <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">Thời tiết ổn định, không có dự báo mưa lớn trong 7 ngày tới.</p>
                  <div style="display:flex;gap:12px;font-size:12px;color:var(--text-tertiary)">
                    <span style="display:flex;align-items:center;gap:4px">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>
                      6 giờ trước
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style="height:120px"></div>
          </div>

          <div class="tab-bar">
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <span>Trang chủ</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Bản đồ</span>
            </div>
            <div class="tab-fab">
              <svg fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="tab-item active">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span>Cảnh báo</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              <span>Cá nhân</span>
            </div>
          </div>
          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">2. Cảnh báo</div>
    </div>

    <!-- 3. MapScreen -->
    <div class="phone-wrapper" data-screen="map">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar dark">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="map-container">
            <svg width="100%" height="100%" style="position:absolute;top:0;left:0;opacity:0.3">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9ca3af" stroke-width="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
            </svg>

            <svg width="100%" height="100%" style="position:absolute;top:0;left:0">
              <path d="M0 200 Q180 180 366 220" stroke="#fff" stroke-width="8" fill="none"/>
              <path d="M0 400 Q200 380 366 420" stroke="#fff" stroke-width="6" fill="none"/>
              <path d="M180 0 Q160 400 200 760" stroke="#fff" stroke-width="6" fill="none"/>
            </svg>

            <svg width="100%" height="100%" style="position:absolute;top:0;left:0">
              <ellipse cx="200" cy="350" rx="100" ry="80" fill="rgba(59,130,246,0.2)" stroke="#3B82F6" stroke-width="2" stroke-dasharray="8 4"/>
            </svg>

            <div class="map-overlay">
              <div class="map-search">
                <svg width="20" height="20" fill="none" stroke="#9CA3AF" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M14 14l4 4"/></svg>
                <input type="text" placeholder="Tìm kiếm địa điểm...">
              </div>
            </div>

            <div class="map-controls">
              <div class="map-btn">
                <svg width="20" height="20" fill="none" stroke="#6B7280" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <div class="map-btn">
                <svg width="20" height="20" fill="none" stroke="#6B7280" stroke-width="2"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2"/></svg>
              </div>
            </div>

            <div class="map-markers">
              <div class="map-marker critical" style="top:-60px;left:-40px">
                <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2"><path d="M2 12s2-4 5-4c4 0 4 4 5 4s1.5-2 3-2 2.5 2 5 2"/></svg>
              </div>
              <div class="map-marker high" style="top:20px;left:60px">
                <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              </div>
              <div class="map-marker shelter" style="top:-100px;left:80px">
                <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
            </div>

            <div class="map-bottom-card animate-in">
              <div style="display:flex;align-items:flex-start;gap:12px">
                <div style="width:44px;height:44px;background:rgba(239,68,68,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="22" height="22" fill="none" stroke="#EF4444" stroke-width="2"><path d="M2 12s2-4 5-4c4 0 4 4 5 4s1.5-2 3-2 2.5 2 5 2"/><path d="M2 18s2-4 5-4c4 0 4 4 5 4s1.5-2 3-2 2.5 2 5 2"/></svg>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <span style="font-size:15px;font-weight:600;color:var(--text-primary)">Ngập đường Nguyễn Văn Linh</span>
                    <span class="badge critical">0.8m</span>
                  </div>
                  <p style="font-size:13px;color:var(--text-secondary);margin-top:4px">Quận 7, TP. Hồ Chí Minh</p>
                  <div style="display:flex;gap:8px;margin-top:10px">
                    <button class="shelter-btn" style="flex:1">Chỉ đường tránh</button>
                    <button class="shelter-btn" style="flex:1;background:var(--brand-500);color:#fff;border-color:var(--brand-500)">Chi tiết</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="tab-bar">
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <span>Trang chủ</span>
            </div>
            <div class="tab-item active">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Bản đồ</span>
            </div>
            <div class="tab-fab">
              <svg fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span>Cảnh báo</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              <span>Cá nhân</span>
            </div>
          </div>
          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">3. Bản đồ</div>
    </div>

    <!-- 4. CreateReportScreen -->
    <div class="phone-wrapper" data-screen="report">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar dark">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="screen-content" style="padding-top:60px;background:var(--bg-secondary)">
            <div style="padding:0 20px 16px;background:#fff">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <div style="width:40px;height:40px;background:var(--bg-secondary);border-radius:20px;display:flex;align-items:center;justify-content:center">
                  <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </div>
                <h1 style="font-size:20px;font-weight:700;color:var(--text-primary)">Báo cáo sự cố ngập</h1>
              </div>
            </div>

            <div style="padding:20px">
              <div class="form-group animate-in" style="animation-delay:0.1s">
                <label class="form-label">Tiêu đề báo cáo</label>
                <input class="form-input" type="text" placeholder="VD: Ngập nặng đường Nguyễn Văn Linh" value="Ngập nước tại chợ Bến Thành">
              </div>

              <div class="form-group animate-in" style="animation-delay:0.15s">
                <label class="form-label">Loại sự cố</label>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                  <div class="chip selected" style="text-align:center;padding:12px 8px">
                    <svg width="24" height="24" fill="none" stroke="var(--brand-500)" stroke-width="2" style="display:block;margin:0 auto 4px"><path d="M2 12s2-4 5-4c4 0 4 4 5 4s1.5-2 3-2 2.5 2 5 2"/></svg>
                    <span style="font-size:11px">Ngập lụt</span>
                  </div>
                  <div class="chip" style="text-align:center;padding:12px 8px">
                    <svg width="24" height="24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" style="display:block;margin:0 auto 4px"><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/></svg>
                    <span style="font-size:11px">Mưa lớn</span>
                  </div>
                  <div class="chip" style="text-align:center;padding:12px 8px">
                    <svg width="24" height="24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" style="display:block;margin:0 auto 4px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    <span style="font-size:11px">Sạt lở</span>
                  </div>
                </div>
              </div>

              <div class="form-group animate-in" style="animation-delay:0.2s">
                <label class="form-label">Mức độ nghiêm trọng</label>
                <div class="chips">
                  <div class="chip low">Thấp</div>
                  <div class="chip medium">Trung bình</div>
                  <div class="chip high selected">Cao</div>
                  <div class="chip critical">Nghiêm trọng</div>
                </div>
              </div>

              <div class="form-group animate-in" style="animation-delay:0.25s">
                <label class="form-label">Vị trí</label>
                <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px;margin-bottom:8px">
                  <svg width="20" height="20" fill="none" stroke="#3B82F6" stroke-width="2"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2"/></svg>
                  <div>
                    <div style="font-size:13px;font-weight:500;color:var(--text-primary)">Đã xác định vị trí GPS</div>
                    <div style="font-size:11px;color:var(--text-secondary)">10.7731° N, 106.6981° E</div>
                  </div>
                </div>
                <input class="form-input" type="text" placeholder="Địa chỉ chi tiết" value="Chợ Bến Thành, Quận 1, TP.HCM">
              </div>

              <div class="form-group animate-in" style="animation-delay:0.3s">
                <label class="form-label">Mô tả chi tiết</label>
                <textarea class="form-input form-textarea" placeholder="Mô tả tình hình ngập...">Nước ngập khoảng 40cm, nhiều xe máy không thể di chuyển. Nước có màu đục, có mùi.</textarea>
              </div>

              <div class="form-group animate-in" style="animation-delay:0.35s">
                <label class="form-label">Hình ảnh (tùy chọn)</label>
                <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px">
                  <div style="width:80px;height:80px;background:var(--bg-tertiary);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;border:2px dashed var(--border)">
                    <svg width="24" height="24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    <span style="font-size:10px;color:var(--text-tertiary);margin-top:4px">Thêm ảnh</span>
                  </div>
                </div>
              </div>

              <button class="btn btn-primary animate-in" style="animation-delay:0.4s">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                Gửi báo cáo
              </button>
            </div>

            <div style="height:40px"></div>
          </div>

          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">4. Tạo báo cáo</div>
    </div>

    <!-- 5. RescueRequestScreen -->
    <div class="phone-wrapper" data-screen="rescue">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar dark">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="screen-content" style="padding-top:60px;background:var(--bg-secondary)">
            <div style="padding:0 20px 16px;background:#fff">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="width:40px;height:40px;background:var(--bg-secondary);border-radius:20px;display:flex;align-items:center;justify-content:center">
                  <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </div>
                <h1 style="font-size:20px;font-weight:700;color:var(--text-primary)">Yêu cầu cứu hộ</h1>
              </div>
            </div>

            <div style="margin:12px 20px;background:var(--critical-bg);border:1px solid #FECACA;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px" class="animate-in">
              <svg width="24" height="24" fill="none" stroke="#EF4444" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:#991B1B">Tình huống nguy hiểm?</div>
                <div style="font-size:12px;color:#B91C1C">Gọi ngay 113 / 114 / 115</div>
              </div>
            </div>

            <div style="padding:12px 20px">
              <div class="form-group animate-in" style="animation-delay:0.1s">
                <label class="form-label">Họ tên người liên hệ</label>
                <input class="form-input" type="text" value="Nguyễn Minh Tuấn">
              </div>

              <div class="form-group animate-in" style="animation-delay:0.15s">
                <label class="form-label">Số điện thoại</label>
                <input class="form-input" type="tel" value="0903 456 789">
              </div>

              <div class="form-group animate-in" style="animation-delay:0.2s">
                <label class="form-label">Mức độ khẩn cấp</label>
                <div class="chips">
                  <div class="chip low">Thấp</div>
                  <div class="chip medium">Trung bình</div>
                  <div class="chip high">Cao</div>
                  <div class="chip critical selected">Khẩn cấp</div>
                </div>
              </div>

              <div class="form-group animate-in" style="animation-delay:0.25s">
                <label class="form-label">Loại hỗ trợ cần</label>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                  <div class="chip selected" style="text-align:center;padding:10px 4px;font-size:10px">
                    <svg width="20" height="20" fill="none" stroke="var(--brand-500)" stroke-width="2" style="display:block;margin:0 auto 2px"><circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="3"/></svg>
                    Cứu hộ
                  </div>
                  <div class="chip" style="text-align:center;padding:10px 4px;font-size:10px">
                    <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2" style="display:block;margin:0 auto 2px"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"/><path d="M12 8v8M8 12h8"/></svg>
                    Y tế
                  </div>
                  <div class="chip selected" style="text-align:center;padding:10px 4px;font-size:10px">
                    <svg width="20" height="20" fill="none" stroke="var(--brand-500)" stroke-width="2" style="display:block;margin:0 auto 2px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Sơ tán
                  </div>
                  <div class="chip" style="text-align:center;padding:10px 4px;font-size:10px">
                    <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2" style="display:block;margin:0 auto 2px"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    Trú ẩn
                  </div>
                </div>
              </div>

              <div class="form-group animate-in" style="animation-delay:0.3s">
                <label class="form-label">Số người cần hỗ trợ</label>
                <div style="display:flex;align-items:center;gap:16px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:8px 16px;width:fit-content">
                  <button style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;background:#fff;font-size:20px;font-weight:600;color:var(--text-secondary)">−</button>
                  <span style="font-size:20px;font-weight:700;color:var(--text-primary);min-width:40px;text-align:center">4</span>
                  <button style="width:36px;height:36px;border:1px solid var(--brand-500);border-radius:8px;background:rgba(122,90,248,0.1);font-size:20px;font-weight:600;color:var(--brand-500)">+</button>
                </div>
              </div>

              <div class="form-group animate-in" style="animation-delay:0.35s">
                <label class="form-label">Nhóm cần ưu tiên</label>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border:1px solid var(--border);border-radius:10px;font-size:13px">
                    <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--brand-500)">
                    Trẻ em
                  </label>
                  <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border:1px solid var(--border);border-radius:10px;font-size:13px">
                    <input type="checkbox" style="width:18px;height:18px;accent-color:var(--brand-500)">
                    Người già
                  </label>
                  <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border:1px solid var(--border);border-radius:10px;font-size:13px">
                    <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--brand-500)">
                    Người khuyết tật
                  </label>
                </div>
              </div>

              <button class="btn btn-danger animate-in" style="animation-delay:0.4s;margin-top:8px">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                Gửi yêu cầu cứu hộ
              </button>
            </div>

            <div style="height:40px"></div>
          </div>

          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">5. Yêu cầu cứu hộ</div>
    </div>

    <!-- 6. ShelterListScreen -->
    <div class="phone-wrapper" data-screen="shelter">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar dark">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="screen-content" style="padding-top:60px">
            <div style="padding:0 20px 16px">
              <h1 style="font-size:28px;font-weight:800;color:var(--text-primary);margin-bottom:4px">Nơi trú ẩn</h1>
              <p style="font-size:14px;color:var(--text-secondary)">Tìm nơi trú ẩn gần bạn</p>
            </div>

            <div style="padding:0 20px 12px;display:flex;gap:8px">
              <div style="flex:1;background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">
                <svg width="20" height="20" fill="none" stroke="#9CA3AF" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M14 14l4 4"/></svg>
                <input type="text" placeholder="Tìm kiếm..." style="border:none;outline:none;flex:1;font-size:15px">
              </div>
              <button style="width:48px;height:48px;background:var(--brand-500);border:none;border-radius:12px;display:flex;align-items:center;justify-content:center">
                <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><circle cx="11" cy="11" r="4"/><path d="M11 3v2M11 17v2M3 11h2M17 11h2"/></svg>
              </button>
            </div>

            <div class="card shelter-card animate-in" style="animation-delay:0.1s">
              <div class="shelter-name">
                Trường THPT Nguyễn Thị Minh Khai
                <span class="badge success">Còn chỗ</span>
              </div>
              <div class="shelter-address">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 7c0 4.5-5 8.5-5 8.5S4 11.5 4 7a5 5 0 1110 0z"/><circle cx="9" cy="7" r="2"/></svg>
                275 Điện Biên Phủ, Quận 3, TP.HCM
              </div>
              <div class="shelter-capacity">
                <div class="shelter-capacity-bar">
                  <div class="shelter-capacity-fill" style="width:45%"></div>
                </div>
                <div class="shelter-capacity-text">135/300 chỗ trống</div>
              </div>
              <div class="shelter-facilities">
                <span class="facility-chip">🍚 Thực phẩm</span>
                <span class="facility-chip">💧 Nước sạch</span>
                <span class="facility-chip">🏥 Y tế</span>
                <span class="facility-chip">⚡ Điện</span>
              </div>
              <div class="shelter-footer">
                <span class="shelter-distance">📍 1.2 km</span>
                <button class="shelter-btn">Chỉ đường</button>
              </div>
            </div>

            <div class="card shelter-card animate-in" style="animation-delay:0.2s">
              <div class="shelter-name">
                Nhà văn hóa Quận 1
                <span class="badge success">Còn chỗ</span>
              </div>
              <div class="shelter-address">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 7c0 4.5-5 8.5-5 8.5S4 11.5 4 7a5 5 0 1110 0z"/><circle cx="9" cy="7" r="2"/></svg>
                45 Lê Duẩn, Quận 1, TP.HCM
              </div>
              <div class="shelter-capacity">
                <div class="shelter-capacity-bar">
                  <div class="shelter-capacity-fill" style="width:72%"></div>
                </div>
                <div class="shelter-capacity-text">56/200 chỗ trống</div>
              </div>
              <div class="shelter-facilities">
                <span class="facility-chip">🍚 Thực phẩm</span>
                <span class="facility-chip">💧 Nước sạch</span>
                <span class="facility-chip">🚽 Vệ sinh</span>
              </div>
              <div class="shelter-footer">
                <span class="shelter-distance">📍 2.8 km</span>
                <button class="shelter-btn">Chỉ đường</button>
              </div>
            </div>

            <div class="card shelter-card animate-in" style="animation-delay:0.3s">
              <div class="shelter-name">
                UBND Phường Bến Nghé
                <span class="badge" style="background:rgba(234,179,8,0.15);color:#a16207">Gần đầy</span>
              </div>
              <div class="shelter-address">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 7c0 4.5-5 8.5-5 8.5S4 11.5 4 7a5 5 0 1110 0z"/><circle cx="9" cy="7" r="2"/></svg>
                78 Tôn Thất Đạm, Quận 1, TP.HCM
              </div>
              <div class="shelter-capacity">
                <div class="shelter-capacity-bar">
                  <div class="shelter-capacity-fill" style="width:92%;background:var(--warning)"></div>
                </div>
                <div class="shelter-capacity-text">8/100 chỗ trống</div>
              </div>
              <div class="shelter-facilities">
                <span class="facility-chip">💧 Nước sạch</span>
                <span class="facility-chip">⚡ Điện</span>
              </div>
              <div class="shelter-footer">
                <span class="shelter-distance">📍 3.5 km</span>
                <button class="shelter-btn">Chỉ đường</button>
              </div>
            </div>

            <div style="height:100px"></div>
          </div>

          <div class="tab-bar">
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <span>Trang chủ</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Bản đồ</span>
            </div>
            <div class="tab-fab">
              <svg fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span>Cảnh báo</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              <span>Cá nhân</span>
            </div>
          </div>
          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">6. Nơi trú ẩn</div>
    </div>

    <!-- 7. ProfileScreen -->
    <div class="phone-wrapper" data-screen="profile">
      <div class="iphone-frame">
        <div class="iphone-screen">
          <div class="dynamic-island"></div>
          <div class="status-bar dark">
            <span class="status-time">9:41</span>
            <span class="status-icons">
              <svg width="18" height="12" fill="currentColor"><path d="M1 4h2v5H1zM4.5 2.5h2v6.5h-2zM8 1h2v8H8zM11.5 3h2v5h-2zM15 0h2v9h-2z"/></svg>
              <svg width="16" height="12" fill="currentColor"><path d="M8 2a6 6 0 016 6h-2a4 4 0 00-8 0H2a6 6 0 016-6z"/><circle cx="8" cy="9" r="2"/></svg>
              <svg width="25" height="12" fill="currentColor"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke="currentColor" stroke-width="1" fill="none"/><rect x="23" y="4" width="1.5" height="4" rx="0.5"/><rect x="2" y="3" width="17" height="6" rx="1"/></svg>
            </span>
          </div>

          <div class="screen-content" style="background:var(--bg-secondary)">
            <div class="profile-header">
              <div class="profile-avatar">MT</div>
              <div class="profile-name">Nguyễn Minh Tuấn</div>
              <div class="profile-email">minhtuan@gmail.com</div>
              <button class="btn btn-outline" style="width:auto;margin:16px auto 0;padding:10px 20px;font-size:14px">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Chỉnh sửa
              </button>
            </div>

            <div class="menu-section animate-in" style="animation-delay:0.1s">
              <div class="card" style="padding:0">
                <div class="menu-item" style="padding:14px 16px">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  </div>
                  <span class="menu-label">Báo cáo của tôi</span>
                  <span style="background:var(--brand-500);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">3</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div class="menu-item" style="padding:14px 16px">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M9.17 14.83l-4.24 4.24"/></svg>
                  </div>
                  <span class="menu-label">Yêu cầu cứu hộ</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div class="menu-item" style="padding:14px 16px;border-bottom:none">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                  </div>
                  <span class="menu-label">Thông báo</span>
                  <span style="background:var(--critical);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">5</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </div>

            <div class="menu-section animate-in" style="animation-delay:0.2s;padding-top:0">
              <div class="card" style="padding:0">
                <div class="menu-item" style="padding:14px 16px">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </div>
                  <span class="menu-label">Đổi mật khẩu</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div class="menu-item" style="padding:14px 16px">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  </div>
                  <span class="menu-label">Ngôn ngữ</span>
                  <span style="font-size:13px;color:var(--text-tertiary)">Tiếng Việt</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div class="menu-item" style="padding:14px 16px">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
                  </div>
                  <span class="menu-label">Trung tâm trợ giúp</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div class="menu-item" style="padding:14px 16px;border-bottom:none">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </div>
                  <span class="menu-label">Giới thiệu</span>
                  <svg width="20" height="20" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </div>

            <div class="menu-section animate-in" style="animation-delay:0.3s;padding-top:0">
              <div class="card" style="padding:0">
                <div class="menu-item danger" style="padding:14px 16px;border-bottom:none">
                  <div class="menu-icon">
                    <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  </div>
                  <span class="menu-label">Đăng xuất</span>
                </div>
              </div>
            </div>

            <div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:12px">
              AegisFlow AI v1.0.0
            </div>

            <div style="height:100px"></div>
          </div>

          <div class="tab-bar">
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              <span>Trang chủ</span>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Bản đồ</span>
            </div>
            <div class="tab-fab">
              <svg fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="tab-item">
              <svg fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span>Cảnh báo</span>
            </div>
            <div class="tab-item active">
              <svg fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              <span>Cá nhân</span>
            </div>
          </div>
          <div class="home-indicator"></div>
        </div>
      </div>
      <div class="phone-label">7. Cá nhân</div>
    </div>
  </div>

  <!-- Detail Overlay -->
  <div class="detail-overlay" id="detailOverlay">
    <div class="detail-close" onclick="closeDetail()">
      <svg width="24" height="24" fill="none" stroke="#333" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </div>
    <div class="detail-phone" id="detailContent"></div>
  </div>

  <script>
    const gallery = document.getElementById('gallery');
    const detailOverlay = document.getElementById('detailOverlay');
    const detailContent = document.getElementById('detailContent');

    gallery.querySelectorAll('.phone-wrapper').forEach(wrapper => {
      wrapper.addEventListener('click', () => {
        const clone = wrapper.querySelector('.iphone-frame').cloneNode(true);
        detailContent.innerHTML = '';
        detailContent.appendChild(clone);
        detailOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeDetail() {
      detailOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    detailOverlay.addEventListener('click', (e) => {
      if (e.target === detailOverlay) closeDetail();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });
  </script>
</body>
</html>
