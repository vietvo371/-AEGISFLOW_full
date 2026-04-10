-- ============================================================
--  AEGISFLOW AI — Full SQL Schema
--  Cơ sở dữ liệu: PostgreSQL 16 + PostGIS 3.4
--  Phiên bản: 1.0.0 | Ngày: 2026-04-10
--  Múi giờ: Asia/Ho_Chi_Minh (UTC+7)
-- ============================================================

-- Cần enable PostGIS extension trước khi tạo bảng
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- UUID generation

-- ============================================================
--  DOMAIN 1: AUTHENTICATION & RBAC
-- ============================================================

-- Bảng users đã có từ Laravel (0001_01_01_000000_create_users_table.php)
-- Cần thêm các cột mở rộng
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.phone IS 'Số điện thoại';
COMMENT ON COLUMN users.avatar_url IS 'URL ảnh đại diện';
COMMENT ON COLUMN users.status IS 'Trạng thái: active|inactive|suspended';
COMMENT ON COLUMN users.last_login_at IS 'Đăng nhập lần cuối';
COMMENT ON COLUMN users.last_login_ip IS 'IP đăng nhập cuối';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp';

-- Vai trò hệ thống
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    guard_name VARCHAR(50) DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Các vai trò mặc định
INSERT INTO roles (name, slug, description) VALUES
    ('Quản trị viên thành phố', 'city_admin', 'Toàn quyền quản lý hệ thống'),
    ('Điều phối viên cứu hộ', 'rescue_operator', 'Điều phối đội cứu hộ, xác nhận yêu cầu'),
    ('Đội cứu hộ', 'rescue_team', 'Nhân viên cứu hộ thực địa'),
    ('Công dân', 'citizen', 'Người dân bình thường, gửi yêu cầu cứu hộ'),
    ('Điều hành AI', 'ai_operator', 'Vận hành và giám sát hệ thống AI')
ON CONFLICT (slug) DO NOTHING;

-- Quyền hạn
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    group_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Các quyền mặc định
INSERT INTO permissions (name, slug, description, group_name) VALUES
    -- Flood
    ('Xem vùng ngập', 'flood.zones.view', 'Xem danh sách vùng ngập', 'flood'),
    ('Quản lý vùng ngập', 'flood.zones.manage', 'Thêm/sửa/xóa vùng ngập', 'flood'),
    ('Xem cảm biến', 'flood.sensors.view', 'Xem dữ liệu cảm biến', 'flood'),
    ('Quản lý cảm biến', 'flood.sensors.manage', 'Thêm/sửa cảm biến', 'flood'),
    ('Xem dự báo', 'flood.predictions.view', 'Xem kết quả dự báo', 'flood'),
    ('Xác nhận dự báo', 'flood.predictions.verify', 'Xác nhận dự báo AI', 'flood'),
    -- Incidents
    ('Xem sự cố', 'incidents.view', 'Xem danh sách sự cố', 'incident'),
    ('Tạo sự cố', 'incidents.create', 'Báo cáo sự cố mới', 'incident'),
    ('Xử lý sự cố', 'incidents.manage', 'Cập nhật trạng thái sự cố', 'incident'),
    ('Xác minh sự cố', 'incidents.verify', 'Xác minh sự cố', 'incident'),
    -- Rescue
    ('Xem yêu cầu cứu hộ', 'rescue.requests.view', 'Xem yêu cầu cứu hộ', 'rescue'),
    ('Tạo yêu cầu cứu hộ', 'rescue.requests.create', 'Gửi yêu cầu cứu hộ', 'rescue'),
    ('Xử lý yêu cầu', 'rescue.requests.manage', 'Phân công, cập nhật yêu cầu', 'rescue'),
    ('Xem đội cứu hộ', 'rescue.teams.view', 'Xem danh sách đội cứu hộ', 'rescue'),
    ('Quản lý đội cứu hộ', 'rescue.teams.manage', 'Thêm/sửa đội cứu hộ', 'rescue'),
    ('Xem điểm trú ẩn', 'rescue.shelters.view', 'Xem điểm trú ẩn', 'rescue'),
    ('Quản lý trú ẩn', 'rescue.shelters.manage', 'Thêm/sửa điểm trú ẩn', 'rescue'),
    ('Quản lý vật tư', 'rescue.supplies.manage', 'Quản lý kho vật tư', 'rescue'),
    -- Route
    ('Xem bản đồ', 'route.map.view', 'Xem bản đồ', 'route'),
    ('Xem tuyến sơ tán', 'route.evacuation.view', 'Xem tuyến sơ tán', 'route'),
    ('Quản lý tuyến', 'route.evacuation.manage', 'Tạo/sửa tuyến sơ tán', 'route'),
    -- Alert
    ('Xem cảnh báo', 'alerts.view', 'Xem cảnh báo', 'alert'),
    ('Tạo cảnh báo', 'alerts.create', 'Phát cảnh báo', 'alert'),
    ('Quản lý cảnh báo', 'alerts.manage', 'Cập nhật cảnh báo', 'alert'),
    -- System
    ('Quản lý người dùng', 'system.users.manage', 'Quản lý tài khoản', 'system'),
    ('Quản lý vai trò', 'system.roles.manage', 'Gán vai trò, quyền', 'system'),
    ('Xem báo cáo', 'system.reports.view', 'Xem báo cáo thống kê', 'system'),
    ('Cấu hình hệ thống', 'system.settings.manage', 'Thay đổi cấu hình', 'system')
ON CONFLICT (slug) DO NOTHING;

-- Gán quyền mặc định cho các vai trò
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'city_admin'
  AND p.group_name IN ('flood','incident','rescue','route','alert','system')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'rescue_operator'
  AND p.slug IN (
    'flood.zones.view','flood.sensors.view','flood.predictions.view',
    'incidents.view','incidents.verify','incidents.manage',
    'rescue.requests.view','rescue.requests.manage',
    'rescue.teams.view','rescue.shelters.view',
    'route.map.view','route.evacuation.view',
    'alerts.view','alerts.create','alerts.manage',
    'system.reports.view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'rescue_team'
  AND p.slug IN (
    'flood.zones.view','flood.sensors.view',
    'incidents.view',
    'rescue.requests.view','rescue.requests.manage',
    'rescue.teams.view',
    'route.map.view','route.evacuation.view',
    'alerts.view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'citizen'
  AND p.slug IN (
    'flood.zones.view','flood.sensors.view',
    'alerts.view',
    'rescue.requests.create','rescue.requests.view',
    'route.evacuation.view'
  )
ON CONFLICT DO NOTHING;

-- Pivot: Vai trò ↔ Quyền
CREATE TABLE IF NOT EXISTS role_permission (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Pivot: Người dùng ↔ Vai trò
CREATE TABLE IF NOT EXISTS user_role (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Thiết bị FCM
CREATE TABLE IF NOT EXISTS user_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios','android','web')),
    device_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

-- ============================================================
--  DOMAIN 2: GEOGRAPHY
-- ============================================================

-- Quận/Huyện
CREATE TABLE IF NOT EXISTS districts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    boundary GEOMETRY(POLYGON, 4326),
    population INTEGER,
    area_km2 DECIMAL(10,2),
    risk_level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phường/Xã
CREATE TABLE IF NOT EXISTS wards (
    id BIGSERIAL PRIMARY KEY,
    district_id BIGINT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    boundary GEOMETRY(POLYGON, 4326),
    population INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dữ liệu mẫu: Đà Nẵng
INSERT INTO districts (name, code, population, area_km2, risk_level) VALUES
    ('Liên Chiểu', 'HoaVang', 230000, 252.87, 'high'),
    ('Cẩm Lệ', 'CamLe', 165000, 89.65, 'medium'),
    ('Hòa Vang', 'HoaVangRural', 190000, 714.52, 'high'),
    ('Hải Châu', 'HaiChau', 205000, 28.36, 'medium'),
    ('Thanh Khê', 'ThanhKhe', 195000, 9.87, 'low'),
    ('Sơn Trà', 'SonTra', 165000, 59.52, 'low'),
    ('Ngũ Hành Sơn', 'NguHanhSon', 80000, 34.01, 'medium'),
    ('Liên Chiểu (Q7)', 'LienChieuNew', 45000, 40.23, 'critical')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
--  DOMAIN 3: FLOOD MANAGEMENT
-- ============================================================

-- Vùng ngập lụt
CREATE TABLE IF NOT EXISTS flood_zones (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326),
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    ward_ids BIGINT[] DEFAULT '{}',
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
    base_water_level_m DECIMAL(6,2) DEFAULT 0,
    current_water_level_m DECIMAL(6,2) DEFAULT 0,
    alert_threshold_m DECIMAL(6,2) DEFAULT 1.5,
    danger_threshold_m DECIMAL(6,2) DEFAULT 3.0,
    area_km2 DECIMAL(10,2),
    population_affected INTEGER,
    status VARCHAR(20) DEFAULT 'monitoring'
        CHECK (status IN ('monitoring','alert','danger','flooded','receded')),
    color VARCHAR(7) NOT NULL DEFAULT '#f79009',
    opacity DECIMAL(3,2) DEFAULT 0.3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vùng ngập mẫu cho Đà Nẵng (theo frontend hardcoded data)
INSERT INTO flood_zones (name, slug, risk_level, status, color, opacity, description) VALUES
    ('Liên Chiểu', 'lien-chieu', 'critical', 'monitoring', '#f04438', 0.35,
     'Khu vực trũng thấp, thường xuyên ngập khi mưa lớn'),
    ('Cẩm Lệ (Ven sông)', 'cam-le', 'high', 'monitoring', '#f79009', 0.28,
     'Khu vực ven sông Cẩm Lệ, thoát nước kém'),
    ('Hoà Vang (Hòa Thọ Tây)', 'hoa-vang', 'high', 'monitoring', '#f79009', 0.24,
     'Khu vực trũng đô thị hóa nhanh, thiếu hạ tầng thoát nước')
ON CONFLICT (slug) DO NOTHING;

-- Cập nhật centroid cho vùng ngập (sau khi có geometry)
UPDATE flood_zones SET centroid = ST_Centroid(geometry) WHERE centroid IS NULL;

-- Cảm biến môi trường
CREATE TABLE IF NOT EXISTS sensors (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('water_level','rainfall','camera','wind','temperature','humidity','combined')),
    model VARCHAR(100),
    geometry GEOMETRY(POINT, 4326) NOT NULL,
    flood_zone_id BIGINT REFERENCES flood_zones(id) ON DELETE SET NULL,
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'online'
        CHECK (status IN ('online','offline','maintenance','error')),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    unit VARCHAR(20) NOT NULL DEFAULT 'mm',
    reading_interval_seconds INTEGER DEFAULT 300,
    alert_threshold DECIMAL(10,2),
    danger_threshold DECIMAL(10,2),
    last_reading_at TIMESTAMPTZ,
    last_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dữ liệu cảm biến — time-series
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL,
    sensor_id BIGINT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    raw_data JSONB,
    is_anomaly BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3,2),
    source VARCHAR(30) DEFAULT 'sensor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Tạo partition mặc định cho tháng hiện tại
CREATE TABLE IF NOT EXISTS sensor_readings_default
    PARTITION OF sensor_readings DEFAULT;

-- Tạo partition hàng tháng (procedure để chạy định kỳ)
CREATE OR REPLACE FUNCTION create_sensor_reading_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    -- Tạo partition cho tháng tới
    partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'sensor_readings_y' || EXTRACT(YEAR FROM partition_date)
                      || 'm' || LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
    start_date := TO_CHAR(partition_date, 'YYYY-MM-DD');
    end_date := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF sensor_readings
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Dữ liệu thời tiết
CREATE TABLE IF NOT EXISTS weather_data (
    id BIGSERIAL PRIMARY KEY,
    district_id BIGINT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    temperature_c DECIMAL(5,2),
    humidity_pct DECIMAL(5,2),
    wind_speed_kmh DECIMAL(6,2),
    wind_direction VARCHAR(10),
    rainfall_mm DECIMAL(6,2),
    pressure_hpa DECIMAL(7,2),
    visibility_km DECIMAL(6,2),
    cloud_cover_pct DECIMAL(5,2),
    uv_index DECIMAL(4,2),
    source VARCHAR(50) DEFAULT 'openweather',
    forecast_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 4: INCIDENTS
-- ============================================================

-- Sự cố ngập lụt
CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('flood','heavy_rain','landslide','dam_failure','other')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    status VARCHAR(20) DEFAULT 'reported'
        CHECK (status IN ('reported','verified','responding','resolved','closed')),
    source VARCHAR(30) NOT NULL CHECK (source IN ('citizen','camera','sensor','operator','ai')),
    geometry GEOMETRY(POINT, 4326),
    address TEXT,
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    ward_id BIGINT REFERENCES wards(id) ON DELETE SET NULL,
    flood_zone_id BIGINT REFERENCES flood_zones(id) ON DELETE SET NULL,
    water_level_m DECIMAL(6,2),
    rainfall_mm DECIMAL(6,2),
    photo_urls TEXT[] DEFAULT '{}',
    reported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline sự cố
CREATE TABLE IF NOT EXISTS incident_events (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 5: ROUTING & MAPS
-- ============================================================

-- Nút giao thông
CREATE TABLE IF NOT EXISTS map_nodes (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(100),
    name VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('intersection','roundabout','bridge','highway_entry','terminal','shelter','building')),
    geometry GEOMETRY(POINT, 4326) NOT NULL,
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    ward_id BIGINT REFERENCES wards(id) ON DELETE SET NULL,
    elevation_m DECIMAL(6,2),
    flood_zone_id BIGINT REFERENCES flood_zones(id) ON DELETE SET NULL,
    is_safe BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active','inactive','blocked','flooded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Đoạn đường / Cạnh đồ thị
CREATE TABLE IF NOT EXISTS map_edges (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(100),
    name VARCHAR(255),
    source_node_id BIGINT NOT NULL REFERENCES map_nodes(id) ON DELETE RESTRICT,
    target_node_id BIGINT NOT NULL REFERENCES map_nodes(id) ON DELETE RESTRICT,
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    length_m DECIMAL(10,2) NOT NULL,
    lanes SMALLINT DEFAULT 2,
    max_speed_kmh SMALLINT,
    road_type VARCHAR(50) NOT NULL DEFAULT 'local'
        CHECK (road_type IN ('highway','arterial','local','residential','bridge','footpath')),
    direction VARCHAR(10) DEFAULT 'two_way'
        CHECK (direction IN ('one_way','two_way','reversible')),
    surface_type VARCHAR(30),
    has_sidewalk BOOLEAN DEFAULT TRUE,
    is_flood_prone BOOLEAN DEFAULT FALSE,

    -- Metrics thời gian thực
    current_density DECIMAL(5,4) DEFAULT 0,
    current_speed_kmh DECIMAL(6,2) DEFAULT 0,
    current_flow DECIMAL(8,2),
    congestion_level VARCHAR(20) DEFAULT 'none'
        CHECK (congestion_level IN ('none','light','moderate','heavy','gridlock')),
    status VARCHAR(20) DEFAULT 'normal'
        CHECK (status IN ('normal','congested','blocked','closed','flooded')),
    metrics_updated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT no_self_loop CHECK (source_node_id != target_node_id)
);

-- Tuyến sơ tán
CREATE TABLE IF NOT EXISTS evacuation_routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_node_id BIGINT NOT NULL REFERENCES map_nodes(id) ON DELETE RESTRICT,
    end_node_id BIGINT NOT NULL REFERENCES map_nodes(id) ON DELETE RESTRICT,
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    polyline TEXT,
    distance_m INTEGER NOT NULL,
    estimated_time_seconds INTEGER NOT NULL,
    is_safe BOOLEAN DEFAULT TRUE,
    safety_rating DECIMAL(3,2),
    risk_factors JSONB DEFAULT '{}',
    flood_zone_id BIGINT REFERENCES flood_zones(id) ON DELETE SET NULL,
    shelter_id BIGINT,
    is_primary BOOLEAN DEFAULT FALSE,
    max_capacity INTEGER,
    current_usage INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active','inactive','blocked','flooded')),
    color VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segments của tuyến sơ tán
CREATE TABLE IF NOT EXISTS evacuation_route_segments (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES evacuation_routes(id) ON DELETE CASCADE,
    edge_id BIGINT NOT NULL REFERENCES map_edges(id) ON DELETE RESTRICT,
    sequence_order SMALLINT NOT NULL,
    is_flood_prone BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 6: RESCUE
-- ============================================================

-- Đội cứu hộ
CREATE TABLE IF NOT EXISTS rescue_teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    team_type VARCHAR(50) NOT NULL
        CHECK (team_type IN ('fire','medical','military','volunteer','police','civil_defense')),
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    specializations TEXT[] DEFAULT '{}',
    vehicle_count SMALLINT DEFAULT 0,
    personnel_count SMALLINT DEFAULT 0,
    equipment JSONB DEFAULT '{}',
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'available'
        CHECK (status IN ('available','dispatched','busy','offline')),
    current_latitude DECIMAL(10,7),
    current_longitude DECIMAL(10,7),
    current_location GEOMETRY(POINT, 4326),
    current_node_id BIGINT,
    heading_to_incident_id BIGINT REFERENCES incidents(id) ON DELETE SET NULL,
    last_location_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thành viên đội cứu hộ
CREATE TABLE IF NOT EXISTS rescue_members (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES rescue_teams(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    badge_number VARCHAR(50),
    certifications TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- Điểm trú ẩn
CREATE TABLE IF NOT EXISTS shelters (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    geometry GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    ward_id BIGINT REFERENCES wards(id) ON DELETE SET NULL,
    shelter_type VARCHAR(50) NOT NULL
        CHECK (shelter_type IN ('school','community_center','government','stadium','temple','hotel')),
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    facilities TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open','full','closed','preparing')),
    accessibility VARCHAR(20) DEFAULT 'accessible',
    is_flood_safe BOOLEAN DEFAULT TRUE,
    flood_depth_tolerance_m DECIMAL(4,2) DEFAULT 2.0,
    contact_phone VARCHAR(20),
    contact_name VARCHAR(255),
    opening_hours VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yêu cầu cứu hộ
CREATE TABLE IF NOT EXISTS rescue_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(30) NOT NULL UNIQUE,
    caller_name VARCHAR(255) NOT NULL,
    caller_phone VARCHAR(20),
    geometry GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    ward_id BIGINT REFERENCES wards(id) ON DELETE SET NULL,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE SET NULL,
    urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('low','medium','high','critical')),
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('medical','food','water','rescue','evacuation','shelter','other')),
    people_count INTEGER DEFAULT 1,
    vulnerable_groups TEXT[] DEFAULT '{}',
    description TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    water_level_m DECIMAL(6,2),
    accessibility_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
    priority_score DECIMAL(4,2),
    assigned_team_id BIGINT REFERENCES rescue_teams(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    eta_minutes INTEGER,
    completed_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    reported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline yêu cầu cứu hộ
CREATE TABLE IF NOT EXISTS rescue_request_events (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kho vật tư
CREATE TABLE IF NOT EXISTS relief_supplies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('food','water','medicine','clothing','shelter','tool','hygiene','other')),
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(12,2) DEFAULT 0,
    min_stock_level DECIMAL(12,2),
    expiry_date DATE,
    storage_location VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tồn kho tại điểm
CREATE TABLE IF NOT EXISTS supply_stocks (
    id BIGSERIAL PRIMARY KEY,
    supply_id BIGINT NOT NULL REFERENCES relief_supplies(id) ON DELETE CASCADE,
    stockable_type VARCHAR(50) NOT NULL CHECK (stockable_type IN ('Shelter','RescueTeam','Warehouse')),
    stockable_id BIGINT NOT NULL,
    quantity DECIMAL(12,2) DEFAULT 0,
    reserved_quantity DECIMAL(12,2) DEFAULT 0,
    last_restocked_at TIMESTAMPTZ,
    expiry_tracking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supply_id, stockable_type, stockable_id)
);

-- Phân bổ vật tư
CREATE TABLE IF NOT EXISTS supply_allocations (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES rescue_requests(id) ON DELETE SET NULL,
    supply_id BIGINT NOT NULL REFERENCES relief_supplies(id) ON DELETE CASCADE,
    from_stock_id BIGINT,
    to_shelter_id BIGINT,
    to_team_id BIGINT,
    quantity DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','dispatched','delivered','cancelled')),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivered_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 7: AI/ML
-- ============================================================

-- Phiên bản mô hình AI
CREATE TABLE IF NOT EXISTS ai_models (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL
        CHECK (model_type IN ('lstm','cnn','transformer','ensemble','rule','regression')),
    version VARCHAR(20) NOT NULL,
    description TEXT,
    framework VARCHAR(50),
    input_features JSONB NOT NULL DEFAULT '[]',
    output_type VARCHAR(50) NOT NULL,
    training_dataset_id BIGINT,
    performance_metrics JSONB DEFAULT '{}',
    hyperparameters JSONB DEFAULT '{}',
    trained_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    is_production BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dữ liệu train/val (metadata)
CREATE TABLE IF NOT EXISTS ai_datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT,
    record_count INTEGER,
    features JSONB DEFAULT '[]',
    labels JSONB DEFAULT '[]',
    train_start_date DATE,
    train_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_models
    ADD COLUMN IF NOT EXISTS training_dataset_id BIGINT REFERENCES ai_datasets(id) ON DELETE SET NULL;

-- Kết quả dự đoán
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT REFERENCES ai_models(id) ON DELETE SET NULL,
    model_version VARCHAR(20),
    prediction_type VARCHAR(50) NOT NULL
        CHECK (prediction_type IN ('water_level','flood_probability','inundation','rainfall','evacuation_demand')),
    target_area GEOMETRY(GEOMETRY, 4326),
    district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
    flood_zone_id BIGINT REFERENCES flood_zones(id) ON DELETE SET NULL,
    prediction_for TIMESTAMPTZ NOT NULL,
    horizon_minutes INTEGER NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    predicted_value DECIMAL(10,4),
    confidence DECIMAL(3,2),
    probability DECIMAL(5,4),
    severity VARCHAR(20) CHECK (severity IN ('low','medium','high','critical')),
    input_data JSONB DEFAULT '{}',
    processing_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'generated'
        CHECK (status IN ('generated','verified','alerted','expired')),
    verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chi tiết dự báo theo vùng
CREATE TABLE IF NOT EXISTS prediction_details (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    predicted_value DECIMAL(10,4),
    confidence DECIMAL(3,2),
    probability DECIMAL(5,4),
    severity VARCHAR(20),
    risk_factors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 8: ALERTS & NOTIFICATIONS
-- ============================================================

-- Cảnh báo
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_number VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type VARCHAR(50) NOT NULL
        CHECK (alert_type IN ('flood_warning','heavy_rain','dam_warning','evacuation','all_clear','weather')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('draft','active','updated','resolved','expired')),
    geometry GEOMETRY(GEOMETRY, 4326),
    affected_districts BIGINT[] DEFAULT '{}',
    affected_wards BIGINT[] DEFAULT '{}',
    affected_flood_zones BIGINT[] DEFAULT '{}',
    radius_km DECIMAL(6,2),
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    issued_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    source VARCHAR(30) DEFAULT 'system',
    related_prediction_id BIGINT REFERENCES predictions(id) ON DELETE SET NULL,
    related_incident_id BIGINT REFERENCES incidents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thông báo push
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    alert_id BIGINT REFERENCES alerts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    notification_type VARCHAR(50) NOT NULL
        CHECK (notification_type IN ('alert','update','rescue','system','evacuation')),
    target_type VARCHAR(20) NOT NULL
        CHECK (target_type IN ('user','role','district','all')),
    target_id BIGINT,
    target_roles VARCHAR[] DEFAULT '{}',
    target_districts BIGINT[] DEFAULT '{}',
    channel VARCHAR(20) DEFAULT 'fcm',
    status VARCHAR(20) DEFAULT 'queued'
        CHECK (status IN ('queued','sent','delivered','failed','read')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    read_device_id BIGINT REFERENCES user_devices(id) ON DELETE SET NULL,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log gửi notification chi tiết
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id BIGINT REFERENCES user_devices(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 9: ANALYTICS & REPORTING
-- ============================================================

-- Dashboard metrics
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    district_id BIGINT REFERENCES districts(id) ON DELETE CASCADE,
    flood_zone_id BIGINT REFERENCES flood_zones(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('hourly','daily','weekly','monthly')),
    avg_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    min_value DECIMAL(10,4),
    total_count INTEGER,
    active_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  DOMAIN 10: SYSTEM & SETTINGS
-- ============================================================

-- Cấu hình hệ thống
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string'
        CHECK (type IN ('string','boolean','integer','json')),
    group_name VARCHAR(50),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Các cấu hình mặc định
INSERT INTO system_settings (key, value, type, group_name, description, is_public) VALUES
    ('flood.alert_threshold_m', '1.5', 'decimal', 'flood', 'Ngưỡng cảnh báo ngập (m)', true),
    ('flood.danger_threshold_m', '3.0', 'decimal', 'flood', 'Ngưỡng nguy hiểm (m)', true),
    ('flood.prediction_interval_minutes', '15', 'integer', 'flood', 'Khoảng cách dự báo (phút)', true),
    ('flood.max_prediction_horizon_hours', '24', 'integer', 'flood', 'H horizon tối đa (giờ)', true),
    ('rescue.default_eta_minutes', '30', 'integer', 'rescue', 'Thời gian đến mặc định (phút)', true),
    ('notification.fcm_enabled', 'true', 'boolean', 'notification', 'Bật FCM notifications', false),
    ('system.maintenance_mode', 'false', 'boolean', 'system', 'Chế độ bảo trì', false),
    ('system.version', '1.0.0', 'string', 'system', 'Phiên bản hệ thống', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
--  INDEXES
-- ============================================================

-- Flood zones
CREATE INDEX IF NOT EXISTS idx_flood_zones_risk ON flood_zones(risk_level) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flood_zones_status ON flood_zones(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flood_zones_geom ON flood_zones USING GIST(geometry);

-- Sensors
CREATE INDEX IF NOT EXISTS idx_sensors_zone ON sensors(flood_zone_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sensors_district ON sensors(district_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sensors_type ON sensors(type);

-- Sensor readings
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time
    ON sensor_readings(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_anomaly
    ON sensor_readings(sensor_id) WHERE is_anomaly = true;
CREATE INDEX IF NOT EXISTS idx_sensor_readings_value
    ON sensor_readings(value DESC) WHERE recorded_at > NOW() - INTERVAL '24 hours';

-- Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_type_status ON incidents(type, status);
CREATE INDEX IF NOT EXISTS idx_incidents_district ON incidents(district_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(status, severity)
    WHERE status NOT IN ('closed','resolved');

-- Map nodes
CREATE INDEX IF NOT EXISTS idx_map_nodes_type ON map_nodes(type);
CREATE INDEX IF NOT EXISTS idx_map_nodes_zone ON map_nodes(flood_zone_id);
CREATE INDEX IF NOT EXISTS idx_map_nodes_geom ON map_nodes USING GIST(geometry);

-- Map edges
CREATE INDEX IF NOT EXISTS idx_map_edges_nodes ON map_edges(source_node_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_map_edges_geom ON map_edges USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_map_edges_flood_prone ON map_edges(is_flood_prone) WHERE is_flood_prone = true;
CREATE INDEX IF NOT EXISTS idx_map_edges_status ON map_edges(status);

-- Evacuation routes
CREATE INDEX IF NOT EXISTS idx_evac_routes_safe ON evacuation_routes(is_safe, status)
    WHERE status = 'active' AND is_safe = true;
CREATE INDEX IF NOT EXISTS idx_evac_routes_zone ON evacuation_routes(flood_zone_id);
CREATE INDEX IF NOT EXISTS idx_evac_routes_geom ON evacuation_routes USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_evac_routes_primary ON evacuation_routes(is_primary) WHERE is_primary = true;

-- Rescue requests
CREATE INDEX IF NOT EXISTS idx_rescue_req_status ON rescue_requests(status);
CREATE INDEX IF NOT EXISTS idx_rescue_req_urgency ON rescue_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_rescue_req_priority ON rescue_requests(priority_score DESC)
    WHERE status IN ('pending','assigned');
CREATE INDEX IF NOT EXISTS idx_rescue_req_district ON rescue_requests(district_id);
CREATE INDEX IF NOT EXISTS idx_rescue_req_created ON rescue_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rescue_req_pending_critical ON rescue_requests(urgency)
    WHERE urgency IN ('critical','high') AND status = 'pending';

-- Rescue teams
CREATE INDEX IF NOT EXISTS idx_rescue_teams_status ON rescue_teams(status);
CREATE INDEX IF NOT EXISTS idx_rescue_teams_district ON rescue_teams(district_id);
CREATE INDEX IF NOT EXISTS idx_rescue_teams_location
    ON rescue_teams USING GIST(current_location) WHERE current_location IS NOT NULL;

-- Shelters
CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_shelters_district ON shelters(district_id);
CREATE INDEX IF NOT EXISTS idx_shelters_capacity ON shelters(capacity, current_occupancy);
CREATE INDEX IF NOT EXISTS idx_shelters_geom ON shelters USING GIST(geometry);

-- Predictions
CREATE INDEX IF NOT EXISTS idx_predictions_type_time ON predictions(prediction_type, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_zone ON predictions(flood_zone_id);
CREATE INDEX IF NOT EXISTS idx_predictions_alerted ON predictions(status) WHERE status = 'alerted';
CREATE INDEX IF NOT EXISTS idx_predictions_geom ON predictions USING GIST(target_area);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(status, severity) WHERE status IN ('active','updated');
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_geom ON alerts USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_alerts_effective ON alerts(effective_from, effective_until)
    WHERE status = 'active';

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Weather
CREATE INDEX IF NOT EXISTS idx_weather_district_time ON weather_data(district_id, recorded_at DESC);

-- Dashboard metrics
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type_period
    ON dashboard_metrics(metric_type, period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_zone
    ON dashboard_metrics(district_id, flood_zone_id, period_start DESC);

-- Districts & Wards
CREATE INDEX IF NOT EXISTS idx_districts_geom ON districts USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_wards_district ON wards(district_id);
CREATE INDEX IF NOT EXISTS idx_wards_geom ON wards USING GIST(boundary);

-- Roles & Permissions
CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_perm ON role_permission(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_role_user ON user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role ON user_role(role_id);

-- ============================================================
--  TRIGGERS & FUNCTIONS
-- ============================================================

-- Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cho các bảng
DO $$ DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'roles', 'permissions', 'districts', 'wards',
        'flood_zones', 'sensors', 'weather_data',
        'incidents', 'incident_events',
        'map_nodes', 'map_edges', 'evacuation_routes', 'evacuation_route_segments',
        'rescue_teams', 'rescue_members', 'shelters',
        'rescue_requests', 'rescue_request_events',
        'relief_supplies', 'supply_stocks', 'supply_allocations',
        'ai_models', 'predictions', 'prediction_details',
        'alerts', 'notifications', 'notification_delivery_logs',
        'dashboard_metrics', 'system_settings', 'user_devices'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trigger_%s_updated_at ON %I;
             CREATE TRIGGER trigger_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
            t, t, t, t
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Tự động sinh mã yêu cầu cứu hộ
CREATE OR REPLACE FUNCTION generate_rescue_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(NEXTVAL('rescue_request_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS rescue_request_seq START 1;

DROP TRIGGER IF EXISTS trigger_rescue_request_number ON rescue_requests;
CREATE TRIGGER trigger_rescue_request_number
    BEFORE INSERT ON rescue_requests
    FOR EACH ROW EXECUTE FUNCTION generate_rescue_request_number();

-- Tự động sinh mã cảnh báo
CREATE OR REPLACE FUNCTION generate_alert_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.alert_number IS NULL THEN
        NEW.alert_number := 'ALT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(NEXTVAL('alert_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS alert_seq START 1;

DROP TRIGGER IF EXISTS trigger_alert_number ON alerts;
CREATE TRIGGER trigger_alert_number
    BEFORE INSERT ON alerts
    FOR EACH ROW EXECUTE FUNCTION generate_alert_number();

-- Tự động cập nhật centroid vùng ngập khi geometry thay đổi
DROP TRIGGER IF EXISTS trigger_flood_zone_centroid ON flood_zones;
CREATE TRIGGER trigger_flood_zone_centroid
    BEFORE INSERT OR UPDATE OF geometry ON flood_zones
    FOR EACH ROW EXECUTE FUNCTION (
        SELECT CASE
            WHEN NEW.centroid IS NULL OR NOT ST_Equals(ST_Centroid(NEW.geometry), NEW.centroid)
            THEN (NEW.centroid = ST_Centroid(NEW.geometry), NEW.updated_at = NOW())::void
            ELSE NULL
        END
    );

-- Cập nhật trạng thái sensor khi có reading mới
CREATE OR REPLACE FUNCTION update_sensor_last_reading()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sensors
    SET last_value = NEW.value,
        last_reading_at = NEW.recorded_at,
        status = CASE
            WHEN is_active = false THEN status
            ELSE 'online'
        END,
        updated_at = NOW()
    WHERE id = NEW.sensor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sensor_reading ON sensor_readings;
CREATE TRIGGER trigger_sensor_reading
    AFTER INSERT ON sensor_readings
    FOR EACH ROW EXECUTE FUNCTION update_sensor_last_reading();

-- Kiểm tra mực nước vượt ngưỡng → tạo incident tự động
CREATE OR REPLACE FUNCTION check_flood_threshold()
RETURNS TRIGGER AS $$
DECLARE
    zone_record RECORD;
    severity_val VARCHAR(20);
BEGIN
    -- Chỉ kiểm tra với cảm biến mực nước
    IF NOT EXISTS (SELECT 1 FROM sensors WHERE id = NEW.sensor_id AND type = 'water_level') THEN
        RETURN NEW;
    END IF;

    -- Tìm vùng ngập gần nhất
    SELECT INTO zone_record f.*
    FROM flood_zones f
    WHERE ST_Contains(f.geometry, ST_SetSRID(NEW.geometry, 4326))
       OR ST_DWithin(f.centroid, ST_SetSRID(NEW.geometry, 4326), 500)
    ORDER BY ST_Distance(f.centroid, ST_SetSRID(NEW.geometry, 4326))
    LIMIT 1;

    IF zone_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Cập nhật mực nước hiện tại của vùng
    UPDATE flood_zones SET
        current_water_level_m = GREATEST(current_water_level_m, NEW.value),
        status = CASE
            WHEN NEW.value >= COALESCE(danger_threshold_m, 3.0) THEN 'flooded'
            WHEN NEW.value >= COALESCE(alert_threshold_m, 1.5) THEN 'danger'
            WHEN NEW.value >= COALESCE(alert_threshold_m, 1.5) * 0.7 THEN 'alert'
            ELSE 'monitoring'
        END,
        updated_at = NOW()
    WHERE id = zone_record.id;

    -- Đánh dấu anomaly nếu vượt ngưỡng
    IF NEW.value >= COALESCE(
        (SELECT danger_threshold FROM sensors WHERE id = NEW.sensor_id),
        3.0
    ) THEN
        NEW.is_anomaly := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_flood_threshold ON sensor_readings;
CREATE TRIGGER trigger_flood_threshold
    BEFORE INSERT ON sensor_readings
    FOR EACH ROW EXECUTE FUNCTION check_flood_threshold();

-- ============================================================
--  ROW LEVEL SECURITY (RLS) — Production
-- ============================================================

-- Bật RLS cho multi-tenant safety (PostgreSQL 16)
-- Áp dụng khi dùng shared hosting hoặc cần isolation cấp district

-- ALTER TABLE rescue_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE flood_zones ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  SEEDS: Dữ liệu mẫu ban đầu
-- ============================================================

-- Điểm trú ẩn mẫu
INSERT INTO shelters (name, code, address, shelter_type, capacity, facilities, is_flood_safe, status) VALUES
    ('Trường THPT Liên Chiểu', 'SHELTER-001', '123 Nguyễn Lương Bằng, Liên Chiểu, Đà Nẵng', 'school', 500,
     ARRAY['food','water','medical','electricity','toilet'], true, 'open'),
    ('Trường ĐH Bách Khoa', 'SHELTER-002', '54 Nguyễn Lương Bằng, Đà Nẵng', 'school', 1000,
     ARRAY['food','water','medical','electricity','toilet','shelter'], true, 'open'),
    ('Trung tâm VHTT Quận Cẩm Lệ', 'SHELTER-003', '456 Đường 2/9, Cẩm Lệ, Đà Nẵng', 'community_center', 300,
     ARRAY['food','water','medical'], true, 'open'),
    ('Sân vận động Hòa Vang', 'SHELTER-004', '78 Quang Trung, Hòa Vang, Đà Nẵng', 'stadium', 2000,
     ARRAY['food','water','medical','electricity','toilet'], true, 'open')
ON CONFLICT (code) DO NOTHING;

-- Vật tư mẫu
INSERT INTO relief_supplies (name, category, unit, quantity, min_stock_level) VALUES
    ('Nước đóng chai 500ml', 'water', 'chai', 10000, 1000),
    ('Gạo (kg)', 'food', 'kg', 5000, 500),
    ('Mì gói', 'food', 'gói', 20000, 2000),
    ('Bánh quy', 'food', 'gói', 10000, 1000),
    ('Thuốc lào', 'medicine', 'hộp', 500, 50),
    ('Băng y tế', 'medicine', 'cuộn', 1000, 100),
    ('Nước sát khuẩn', 'hygiene', 'chai', 500, 50),
    ('Quần áo ấm', 'clothing', 'bộ', 500, 50),
    ('Chăn mỏng', 'shelter', 'cái', 300, 30),
    ('Đèn pin', 'tool', 'cái', 200, 20)
ON CONFLICT DO NOTHING;

-- Đội cứu hộ mẫu
INSERT INTO rescue_teams (name, code, team_type, district_id, specializations, personnel_count, vehicle_count, status) VALUES
    ('Đội cứu hộ PCCC Liên Chiểu', 'RESCUE-001', 'fire', 1,
     ARRAY['flood_rescue','first_aid','water_pump'], 25, 5, 'available'),
    ('Đội cứu hộ PCCC Cẩm Lệ', 'RESCUE-002', 'fire', 2,
     ARRAY['flood_rescue','first_aid'], 20, 4, 'available'),
    ('Đội Y tế Đà Nẵng', 'RESCUE-003', 'medical', NULL,
     ARRAY['first_aid','medical_evacuation','triage'], 30, 6, 'available'),
    ('Đội quân đội Hòa Vang', 'RESCUE-004', 'military', 3,
     ARRAY['flood_rescue','logistics','evacuation'], 50, 10, 'available'),
    ('Đội tình nguyện Thanh Khê', 'RESCUE-005', 'volunteer', 5,
     ARRAY['food_distribution','shelter_support','first_aid'], 40, 2, 'available')
ON CONFLICT (code) DO NOTHING;

-- AI Models mẫu
INSERT INTO ai_models (name, slug, model_type, version, framework, output_type, description, is_production) VALUES
    ('LSTM Water Level Predictor', 'water-level-lstm', 'lstm', 'v1.0', 'TensorFlow',
     'water_level', 'Dự báo mực nước sử dụng mạng LSTM với lookback 24 giờ', true),
    ('CNN Rainfall Classifier', 'rainfall-cnn', 'cnn', 'v1.2', 'PyTorch',
     'rainfall', 'Phân loại cường độ mưa từ radar/satellite imagery', false),
    ('Flood Risk Ensemble', 'flood-risk-ensemble', 'ensemble', 'v1.0', 'Scikit-learn',
     'flood_probability', 'Ensemble model kết hợp LSTM + CNN + XGBoost', true),
    ('Rule-based Alert Engine', 'alert-rule-engine', 'rule', 'v2.0', 'Python',
     'alert', 'Engine sinh cảnh báo dựa trên rules và thresholds', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
--  VIEWS tiện ích
-- ============================================================

-- View: Tổng hợp tình trạng ngập theo quận
CREATE OR REPLACE VIEW v_district_flood_summary AS
SELECT
    d.id AS district_id,
    d.name AS district_name,
    d.risk_level,
    COUNT(DISTINCT fz.id) AS total_flood_zones,
    COUNT(DISTINCT CASE WHEN fz.status IN ('alert','danger','flooded') THEN fz.id END) AS active_zones,
    AVG(fz.current_water_level_m) AS avg_water_level,
    MAX(fz.current_water_level_m) AS max_water_level,
    COUNT(DISTINCT s.id) AS sensor_count,
    COUNT(DISTINCT CASE WHEN s.status = 'online' THEN s.id END) AS online_sensors
FROM districts d
LEFT JOIN flood_zones fz ON fz.district_id = d.id AND fz.is_active = true
LEFT JOIN sensors s ON s.district_id = d.id AND s.is_active = true
GROUP BY d.id, d.name, d.risk_level;

-- View: Yêu cầu cứu hộ đang chờ
CREATE OR REPLACE VIEW v_pending_rescue_requests AS
SELECT
    rr.id,
    rr.request_number,
    rr.urgency,
    rr.category,
    rr.people_count,
    rr.address,
    rr.status,
    rr.priority_score,
    d.name AS district_name,
    rt.name AS assigned_team,
    rt.status AS team_status,
    EXTRACT(EPOCH FROM (NOW() - rr.created_at))/60 AS waiting_minutes,
    CASE
        WHEN rr.urgency = 'critical' AND rr.status = 'pending' THEN 1
        WHEN rr.urgency = 'high' AND rr.status = 'pending' THEN 2
        ELSE 0
    END AS sort_priority
FROM rescue_requests rr
LEFT JOIN districts d ON d.id = rr.district_id
LEFT JOIN rescue_teams rt ON rt.id = rr.assigned_team_id
WHERE rr.status IN ('pending','assigned','in_progress')
ORDER BY sort_priority DESC, rr.priority_score DESC NULLS LAST;

-- View: Trạng thái đội cứu hộ
CREATE OR REPLACE VIEW v_rescue_team_status AS
SELECT
    rt.id,
    rt.name,
    rt.code,
    rt.team_type,
    rt.status,
    d.name AS district_name,
    rt.personnel_count,
    rt.vehicle_count,
    rt.current_latitude,
    rt.current_longitude,
    COUNT(DISTINCT rr.id) FILTER (WHERE rr.status = 'in_progress') AS active_missions,
    CASE
        WHEN rt.status = 'available' THEN 'Sẵn sàng'
        WHEN rt.status = 'dispatched' THEN 'Đang di chuyển'
        WHEN rt.status = 'busy' THEN 'Đang làm nhiệm vụ'
        ELSE 'Ngoại tuyến'
    END AS status_text
FROM rescue_teams rt
LEFT JOIN districts d ON d.id = rt.district_id
LEFT JOIN rescue_requests rr ON rr.assigned_team_id = rt.id
GROUP BY rt.id, rt.name, rt.code, rt.team_type, rt.status,
         d.name, rt.personnel_count, rt.vehicle_count,
         rt.current_latitude, rt.current_longitude;

-- View: Shelters với sức chứa
CREATE OR REPLACE VIEW v_shelter_capacity AS
SELECT
    s.id,
    s.name,
    s.code,
    s.capacity,
    s.current_occupancy,
    (s.capacity - s.current_occupancy) AS available_beds,
    ROUND((s.current_occupancy::DECIMAL / NULLIF(s.capacity, 0)) * 100, 1) AS occupancy_pct,
    s.status,
    d.name AS district_name,
    CASE
        WHEN s.status = 'open' AND s.current_occupancy < s.capacity * 0.9 THEN 'Còn chỗ'
        WHEN s.status = 'open' AND s.current_occupancy >= s.capacity * 0.9 THEN 'Gần đầy'
        WHEN s.status = 'full' THEN 'Đã đầy'
        ELSE 'Đóng cửa'
    END AS availability_status
FROM shelters s
LEFT JOIN districts d ON d.id = s.district_id;

-- ============================================================
--  FINISH
-- ============================================================

-- Grant permissions (chạy sau khi tạo user app)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aegisflow_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aegisflow_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO aegisflow_app;

SELECT '✅ AegisFlow AI Database Schema v1.0.0 đã tạo thành công!' AS status;
