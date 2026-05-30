#!/usr/bin/env python3
"""
AegisFlow Flood Simulator
Mô phỏng mực nước theo thời gian thực, broadcast lên Redis channel.
"""

import os
import sys
import time
import json
import random
import signal
from datetime import datetime
from enum import Enum
from typing import Optional

import redis
import mysql.connector
from mysql.connector import Error


# ========================
# CONFIG
# ========================

class Config:
    """Configuration loader từ .env files."""
    
    # Defaults
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str = "aegisflow"
    db_user: str = "root"
    db_password: str = "secret"
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    
    @classmethod
    def load_from_env(cls, env_path: str = "../backend/.env"):
        """Load config từ .env file."""
        if os.path.exists(env_path):
            print(f"📁 Loading config from {env_path}")
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    value = value.strip().strip('"').strip("'")
                    
                    if key == "DB_HOST":
                        cls.db_host = value
                    elif key == "DB_PORT":
                        cls.db_port = int(value)
                    elif key == "DB_DATABASE":
                        cls.db_name = value
                    elif key == "DB_USERNAME":
                        cls.db_user = value
                    elif key == "DB_PASSWORD":
                        cls.db_password = value
                    elif key == "REDIS_HOST":
                        cls.redis_host = value
                    elif key == "REDIS_PORT":
                        cls.redis_port = int(value)
                    elif key == "REDIS_PASSWORD":
                        cls.redis_password = value if value != "null" else None
            
            print(f"✅ Config loaded: DB={cls.db_host}:{cls.db_port}/{cls.db_name}")
        else:
            print(f"⚠️  .env not found at {env_path}, using defaults")
        
        # Override with environment variables if set
        cls.db_host = os.getenv("DB_HOST", cls.db_host)
        cls.db_port = int(os.getenv("DB_PORT", cls.db_port))
        cls.db_name = os.getenv("DB_DATABASE", cls.db_name)
        cls.db_user = os.getenv("DB_USERNAME", cls.db_user)
        cls.db_password = os.getenv("DB_PASSWORD", cls.db_password)
        cls.redis_host = os.getenv("REDIS_HOST", cls.redis_host)
        cls.redis_port = int(os.getenv("REDIS_PORT", cls.redis_port))
        cls.redis_password = os.getenv("REDIS_PASSWORD", cls.redis_password)


# ========================
# ENUMS & CONSTANTS
# ========================

class WeatherType(Enum):
    """Các loại thời tiết mô phỏng."""
    LIGHT_RAIN = "light_rain"
    MEDIUM_RAIN = "medium_rain"
    HEAVY_RAIN = "heavy_rain"
    NO_RAIN = "no_rain"


class RiskLevel(Enum):
    """Mức độ rủi ro ngập lụt."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Weather configurations (rain intensity in mm/h)
WEATHER_CONFIG = {
    WeatherType.NO_RAIN: (0, 2),
    WeatherType.LIGHT_RAIN: (2, 10),
    WeatherType.MEDIUM_RAIN: (10, 30),
    WeatherType.HEAVY_RAIN: (30, 100),
}

# Default zones nếu DB không có data
DEFAULT_ZONES = [
    {"id": 1, "name": "Khu vực Hải Châu", "lat": 16.0544, "lng": 108.2022, "elevation": 2.0},
    {"id": 2, "name": "Khu vực Thanh Khê", "lat": 16.0600, "lng": 108.2100, "elevation": 3.0},
    {"id": 3, "name": "Khu vực Liên Chiểu", "lat": 16.0700, "lng": 108.1800, "elevation": 5.0},
    {"id": 4, "name": "Khu vực Hòa Vang", "lat": 16.0500, "lng": 108.1500, "elevation": 8.0},
    {"id": 5, "name": "Khu vực Sơn Trà", "lat": 16.0900, "lng": 108.2300, "elevation": 4.0},
    {"id": 6, "name": "Khu vực Ngũ Hành Sơn", "lat": 16.0030, "lng": 108.2630, "elevation": 6.0},
]

# Cascade relationships (zone_id -> [downstream_zone_ids])
CASCADE_MAP = {
    1: [2],      # Hải Châu ảnh hưởng Thanh Khê
    2: [3],      # Thanh Khê ảnh hưởng Liên Chiểu
    3: [4],      # Liên Chiểu ảnh hưởng Hòa Vang
    5: [1, 6],   # Sơn Trà ảnh hưởng Hải Châu và Ngũ Hành Sơn
}


# ========================
# FLOOD SIMULATOR
# ========================

class FloodSimulator:
    """
    Flood Simulator - Mô phỏng mực nước và broadcast telemetry.
    """
    
    CHANNEL_NAME = "flood_telemetry"
    BROADCAST_INTERVAL = 10  # seconds
    
    def __init__(self):
        self.running = False
        self.redis_client: Optional[redis.Redis] = None
        self.db_connection: Optional[mysql.connector.MySQLConnection] = None
        
        # Simulation state
        self.current_weather: WeatherType = WeatherType.NO_RAIN
        self.weather_duration = 0
        self.zone_states: dict[int, dict] = {}
        self.time_elapsed = 0
        
        # Stats
        self.messages_sent = 0
        self.start_time: Optional[datetime] = None
    
    # ---- Database Methods ----
    
    def connect_db(self) -> bool:
        """Kết nối MySQL database."""
        try:
            self.db_connection = mysql.connector.connect(
                host=Config.db_host,
                port=Config.db_port,
                database=Config.db_name,
                user=Config.db_user,
                password=Config.db_password,
                connection_timeout=5
            )
            print(f"🗄️  Connected to MySQL: {Config.db_host}:{Config.db_port}/{Config.db_name}")
            return True
        except Error as e:
            print(f"⚠️  MySQL connection failed: {e}")
            print("    Using default flood zones for simulation.")
            return False
    
    def load_zones_from_db(self) -> list[dict]:
        """Load flood zones từ database."""
        if not self.db_connection or not self.db_connection.is_connected():
            return DEFAULT_ZONES.copy()
        
        try:
            cursor = self.db_connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, name, ST_X(geometry) as lng, ST_Y(geometry) as lat, 
                       COALESCE(elevation, 3.0) as elevation
                FROM flood_zones
                WHERE is_active = 1
                LIMIT 20
            """)
            zones = cursor.fetchall()
            cursor.close()
            
            if zones:
                print(f"📊 Loaded {len(zones)} flood zones from database")
                return zones
            else:
                print("⚠️  No active flood zones in DB, using defaults")
                return DEFAULT_ZONES.copy()
                
        except Error as e:
            print(f"⚠️  Error loading zones: {e}")
            return DEFAULT_ZONES.copy()
    
    def load_sensors_from_db(self) -> list[dict]:
        """Load sensors từ database."""
        if not self.db_connection or not self.db_connection.is_connected():
            return []
        
        try:
            cursor = self.db_connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, zone_id, name, type, status
                FROM sensors
                WHERE status = 'active' AND type = 'water_level'
                LIMIT 50
            """)
            sensors = cursor.fetchall()
            cursor.close()
            return sensors
        except Error:
            return []
    
    # ---- Redis Methods ----
    
    def connect_redis(self) -> bool:
        """Kết nối Redis."""
        try:
            self.redis_client = redis.Redis(
                host=Config.redis_host,
                port=Config.redis_port,
                password=Config.redis_password if Config.redis_password != "null" else None,
                decode_responses=True,
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            print(f"🔴 Connected to Redis: {Config.redis_host}:{Config.redis_port}")
            return True
        except redis.ConnectionError as e:
            print(f"⚠️  Redis connection failed: {e}")
            print("    Simulator will run without broadcasting.")
            return False
    
    def broadcast_telemetry(self, telemetry_data: dict) -> bool:
        """Broadcast telemetry lên Redis channel."""
        if not self.redis_client:
            return False
        
        try:
            message = json.dumps(telemetry_data, ensure_ascii=False)
            subscribers = self.redis_client.publish(self.CHANNEL_NAME, message)
            return True
        except redis.RedisError as e:
            print(f"⚠️  Redis publish error: {e}")
            return False
    
    # ---- Simulation Logic ----
    
    def init_zones(self, zones: list[dict]):
        """Khởi tạo trạng thái các zones."""
        self.zone_states = {}
        
        for zone in zones:
            zone_id = zone["id"]
            self.zone_states[zone_id] = {
                "zone_id": zone_id,
                "zone_name": zone["name"],
                "lat": zone.get("lat", 16.05),
                "lng": zone.get("lng", 108.2),
                "elevation": zone.get("elevation", 3.0),
                "water_level": random.uniform(0.0, 0.5),  # Bắt đầu với mực nước thấp
                "rain_intensity": 0.0,
                "risk_level": RiskLevel.LOW.value,
                "last_updated": time.time()
            }
        
        print(f"🌊 Initialized {len(self.zone_states)} zones for simulation")
    
    def update_weather(self):
        """Cập nhật thời tiết theo chu kỳ."""
        self.weather_duration -= 1
        
        # Chuyển đổi thời tiết sau mỗi chu kỳ (mỗi chu kỳ = 10s)
        if self.weather_duration <= 0:
            # Random weather transition
            rand = random.random()
            
            if rand < 0.3:  # 30% no rain
                self.current_weather = WeatherType.NO_RAIN
                self.weather_duration = random.randint(6, 12)  # 1-2 phút
            elif rand < 0.6:  # 30% light rain
                self.current_weather = WeatherType.LIGHT_RAIN
                self.weather_duration = random.randint(6, 18)  # 1-3 phút
            elif rand < 0.85:  # 25% medium rain
                self.current_weather = WeatherType.MEDIUM_RAIN
                self.weather_duration = random.randint(4, 12)  # 40s - 2 phút
            else:  # 15% heavy rain
                self.current_weather = WeatherType.HEAVY_RAIN
                self.weather_duration = random.randint(2, 6)  # 20s - 1 phút
            
            weather_emoji = {
                WeatherType.NO_RAIN: "☀️",
                WeatherType.LIGHT_RAIN: "🌦️",
                WeatherType.MEDIUM_RAIN: "🌧️",
                WeatherType.HEAVY_RAIN: "⛈️"
            }
            print(f"{weather_emoji[self.current_weather]} Weather changed to: {self.current_weather.value}")
    
    def calculate_risk_level(self, water_level: float, rain_intensity: float) -> str:
        """Tính toán mức độ rủi ro dựa trên mực nước và cường độ mưa."""
        # Base risk from water level
        if water_level < 0.5:
            risk = 0
        elif water_level < 1.5:
            risk = 1
        elif water_level < 3.0:
            risk = 2
        else:
            risk = 3
        
        # Boost risk if heavy rain
        if rain_intensity > 30:
            risk = min(3, risk + 1)
        elif rain_intensity > 10:
            risk = min(3, risk + 0.5)
        
        if risk >= 3:
            return RiskLevel.CRITICAL.value
        elif risk >= 2:
            return RiskLevel.HIGH.value
        elif risk >= 1:
            return RiskLevel.MEDIUM.value
        else:
            return RiskLevel.LOW.value
    
    def update_zone_water_levels(self):
        """Cập nhật mực nước cho tất cả zones."""
        rain_min, rain_max = WEATHER_CONFIG[self.current_weather]
        base_rain_intensity = random.uniform(rain_min, rain_max)
        
        # Calculate new water levels
        for zone_id, state in self.zone_states.items():
            elevation = state["elevation"]
            
            # Base rain effect (lower elevation = more water accumulation)
            elevation_factor = max(0.5, 1.0 - (elevation / 10.0))
            rain_effect = (base_rain_intensity / 50.0) * elevation_factor * 0.3
            
            # Drain effect (water naturally recedes)
            drain_rate = 0.02 * (elevation / 5.0)  # Higher areas drain faster
            drain_effect = -drain_rate
            
            # Cascade effect (water flows to downstream zones)
            cascade_effect = 0
            for upstream_id, downstream_ids in CASCADE_MAP.items():
                if zone_id in downstream_ids:
                    upstream_level = self.zone_states.get(upstream_id, {}).get("water_level", 0)
                    if upstream_level > 1.5:
                        cascade_effect += upstream_level * 0.1
            
            # Calculate new level
            state["rain_intensity"] = base_rain_intensity * elevation_factor * random.uniform(0.8, 1.2)
            state["water_level"] += rain_effect + drain_effect + cascade_effect
            state["water_level"] = max(0.0, min(5.0, state["water_level"]))  # Clamp 0-5m
            state["risk_level"] = self.calculate_risk_level(state["water_level"], state["rain_intensity"])
            state["last_updated"] = time.time()
    
    def get_telemetry_data(self) -> dict:
        """Tạo telemetry data packet."""
        return {
            "timestamp": int(time.time()),
            "datetime": datetime.now().isoformat(),
            "weather": self.current_weather.value,
            "zones": list(self.zone_states.values())
        }
    
    def print_status(self, telemetry: dict):
        """In trạng thái ra console."""
        zone_count = len(telemetry["zones"])
        critical_count = sum(1 for z in telemetry["zones"] if z["risk_level"] == "critical")
        high_count = sum(1 for z in telemetry["zones"] if z["risk_level"] == "high")
        
        weather_icons = {
            "no_rain": "☀️",
            "light_rain": "🌦️",
            "medium_rain": "🌧️",
            "heavy_rain": "⛈️"
        }
        
        print(f"\n{'='*60}")
        print(f"⏰ {datetime.now().strftime('%H:%M:%S')} | Weather: {weather_icons.get(telemetry['weather'], '❓')} {telemetry['weather']}")
        print(f"📊 Zones: {zone_count} | 🔴 Critical: {critical_count} | 🟠 High: {high_count}")
        print("-" * 60)
        
        for zone_id, state in sorted(self.zone_states.items()):
            water_bar = "█" * int(state["water_level"] * 4) + "░" * (20 - int(state["water_level"] * 4))
            risk_color = {
                "low": "🟢",
                "medium": "🟡",
                "high": "🟠",
                "critical": "🔴"
            }
            print(f"  {risk_color.get(state['risk_level'], '⚪')} [{zone_id:2d}] {state['zone_name'][:20]:20s} | "
                  f"W:{state['water_level']:.2f}m | Rain:{state['rain_intensity']:.1f}mm/h | {water_bar}")
        
        print(f"{'='*60}")
    
    # ---- Main Loop ----
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print("\n\n🛑 Received shutdown signal, stopping simulator...")
        self.running = False
    
    def run(self):
        """Main simulation loop."""
        print("\n" + "="*60)
        print("🌊 AEGISFLOW FLOOD SIMULATOR")
        print("="*60)
        
        # Load config
        Config.load_from_env()
        
        # Connect to services
        self.connect_db()
        self.connect_redis()
        
        # Load zones
        zones = self.load_zones_from_db()
        self.init_zones(zones)
        
        # Initialize weather
        self.current_weather = WeatherType.LIGHT_RAIN
        self.weather_duration = 3
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        self.running = True
        self.start_time = datetime.now()
        
        print(f"\n🚀 Starting simulation broadcast every {self.BROADCAST_INTERVAL}s")
        print(f"📡 Redis channel: {self.CHANNEL_NAME}")
        print(f"⏱️  Press Ctrl+C to stop\n")
        
        try:
            while self.running:
                # Update simulation
                self.time_elapsed += 1
                self.update_weather()
                self.update_zone_water_levels()
                
                # Generate and broadcast telemetry
                telemetry = self.get_telemetry_data()
                
                # Broadcast to Redis
                if self.broadcast_telemetry(telemetry):
                    self.messages_sent += 1
                    print_status_flag = (self.messages_sent % 6 == 0)  # Print status every minute
                    if print_status_flag:
                        self.print_status(telemetry)
                    else:
                        # Simple progress indicator
                        elapsed = (datetime.now() - self.start_time).seconds
                        print(f"\r⏳ Running {elapsed}s | Sent {self.messages_sent} telemetry packets...", end="", flush=True)
                else:
                    # Still print status for debugging
                    print(f"\n⚠️  [t+{self.time_elapsed*10}s] Broadcasting failed (Redis unavailable)")
                
                # Wait for next cycle
                time.sleep(self.BROADCAST_INTERVAL)
                
        except KeyboardInterrupt:
            print("\n\n🛑 Interrupted by user")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Cleanup resources."""
        print("\n🧹 Cleaning up...")
        
        if self.redis_client:
            self.redis_client.close()
            print("  ✅ Redis connection closed")
        
        if self.db_connection and self.db_connection.is_connected():
            self.db_connection.close()
            print("  ✅ MySQL connection closed")
        
        elapsed = (datetime.now() - self.start_time).seconds if self.start_time else 0
        print(f"\n📈 Simulation Summary:")
        print(f"   Total runtime: {elapsed}s")
        print(f"   Messages sent: {self.messages_sent}")
        print(f"   Zones simulated: {len(self.zone_states)}")
        print("\n👋 Simulator stopped.\n")


# ========================
# MAIN
# ========================

if __name__ == "__main__":
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║   🌊  AEGISFLOW FLOOD SIMULATOR  🌊                       ║
    ║                                                            ║
    ║   Mô phỏng mực nước thời gian thực cho Đà Nẵng            ║
    ║   Broadcast lên Redis mỗi 10 giây                          ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    simulator = FloodSimulator()
    simulator.run()
