#!/usr/bin/env python3
"""
Crawl data từ muangap.danang.gov.vn
Dùng Playwright để intercept API calls và lưu JSON responses
"""

import json
import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "https://muangap.danang.gov.vn"
OUTPUT_DIR = Path("scripts/crawled_data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

captured = {}

def save_json(name: str, data):
    path = OUTPUT_DIR / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✅ Saved: {path} ({len(data) if isinstance(data, list) else 'object'})")

def crawl_page(page, url: str, wait_selector: str = None, wait_ms: int = 3000):
    """Navigate to page and wait for content to load"""
    print(f"\n🌐 Crawling: {url}")
    page.goto(url, wait_until="networkidle", timeout=30000)
    if wait_selector:
        try:
            page.wait_for_selector(wait_selector, timeout=10000)
        except:
            pass
    page.wait_for_timeout(wait_ms)

def intercept_and_crawl():
    api_responses = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = context.new_page()

        # Intercept all API responses
        def handle_response(response):
            url = response.url
            # Capture JSON API responses
            if any(keyword in url for keyword in [
                '/api/', 'shelter', 'station', 'rain', 'flood', 'sensor',
                'landslide', 'fallen', 'sos', 'report', 'ward', 'district'
            ]):
                try:
                    content_type = response.headers.get('content-type', '')
                    if 'json' in content_type:
                        data = response.json()
                        key = url.replace(BASE_URL, '').split('?')[0].strip('/')
                        key = key.replace('/', '_')
                        if key not in api_responses:
                            api_responses[key] = data
                            print(f"  📡 API captured: {url}")
                except Exception as e:
                    pass

        page.on("response", handle_response)

        # ── 1. Trang chủ (bản đồ) ──
        crawl_page(page, BASE_URL, wait_ms=5000)

        # ── 2. Lượng mưa - tất cả các trang ──
        for pg in range(1, 10):
            url = f"{BASE_URL}/rain" if pg == 1 else f"{BASE_URL}/rain?page={pg}"
            crawl_page(page, url, wait_ms=3000)

        # ── 3. Trạm đo tự động ──
        crawl_page(page, f"{BASE_URL}/automatic-measuring-station", wait_ms=4000)

        # ── 4. Nhà sơ tán ──
        crawl_page(page, f"{BASE_URL}/shelter", wait_ms=4000)

        # ── 5. Khu vực sạt lở ──
        crawl_page(page, f"{BASE_URL}/landslide", wait_ms=4000)

        # ── 6. Cây ngã đổ ──
        crawl_page(page, f"{BASE_URL}/fallen-tree", wait_ms=3000)

        # Save all captured API responses
        print(f"\n📦 Total API responses captured: {len(api_responses)}")
        for key, data in api_responses.items():
            save_json(f"api_{key}", data)

        # ── Scrape HTML content as fallback ──
        print("\n📄 Scraping HTML content as fallback...")

        # Rain stations from HTML table
        crawl_page(page, f"{BASE_URL}/rain", wait_ms=3000)
        rain_stations = scrape_rain_stations(page)
        if rain_stations:
            save_json("rain_stations", rain_stations)

        # Shelters from HTML
        crawl_page(page, f"{BASE_URL}/shelter", wait_ms=3000)
        shelters = scrape_shelters(page)
        if shelters:
            save_json("shelters", shelters)

        # Auto measuring stations
        crawl_page(page, f"{BASE_URL}/automatic-measuring-station", wait_ms=4000)
        auto_stations = scrape_auto_stations(page)
        if auto_stations:
            save_json("auto_stations", auto_stations)

        browser.close()

    return api_responses


def scrape_rain_stations(page) -> list:
    """Scrape all rain station names from paginated table"""
    stations = []
    
    for pg in range(1, 10):
        url = f"{BASE_URL}/rain" if pg == 1 else f"{BASE_URL}/rain?page={pg}"
        page.goto(url, wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)

        rows = page.query_selector_all("table tr, .rain-table tr, [class*='table'] tr")
        if not rows:
            # Try generic table rows
            rows = page.query_selector_all("tr")

        page_stations = []
        for row in rows:
            cells = row.query_selector_all("td")
            if len(cells) >= 2:
                name = cells[0].inner_text().strip()
                ward = cells[1].inner_text().strip()
                if name and ward and name != "Tên trạm":
                    page_stations.append({"name": name, "ward": ward, "type": "rain_station"})

        if not page_stations:
            break

        stations.extend(page_stations)
        print(f"    Page {pg}: {len(page_stations)} stations")

        # Check if there's a next page
        next_btn = page.query_selector("a[href*='page=']:last-child, .pagination .next")
        if not next_btn:
            break

    return stations


def scrape_shelters(page) -> list:
    """Scrape shelter data"""
    shelters = []
    
    # Get all ward sections
    ward_sections = page.query_selector_all("h6, .ward-title, [class*='ward']")
    
    # Try to get shelter items
    items = page.query_selector_all("[class*='shelter'], [class*='item'], .card")
    for item in items:
        text = item.inner_text().strip()
        if text:
            shelters.append({"raw_text": text})

    # Fallback: get all text content grouped by ward
    content = page.inner_text("body")
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    current_ward = None
    for line in lines:
        if line.startswith("Phường") or line.startswith("Xã"):
            current_ward = line
        elif current_ward and len(line) > 5 and not line.startswith("Bản đồ"):
            shelters.append({"ward": current_ward, "name": line})

    return shelters


def scrape_auto_stations(page) -> list:
    """Scrape automatic measuring stations"""
    stations = []
    
    content = page.inner_text("body")
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    current_type = None
    for line in lines:
        if "THÁP BÁO NGẬP" in line.upper():
            current_type = "flood_tower"
        elif "TRẠM ĐO MỰC NƯỚC" in line.upper():
            current_type = "water_level_station"
        elif "THÁP BÁO LŨ" in line.upper():
            current_type = "flood_warning_tower"
        elif current_type and len(line) > 3:
            stations.append({"name": line, "type": current_type})

    return stations


if __name__ == "__main__":
    print("🚀 Bắt đầu crawl muangap.danang.gov.vn...")
    print(f"📁 Output: {OUTPUT_DIR.absolute()}\n")
    
    api_data = intercept_and_crawl()
    
    print(f"\n✅ Hoàn thành! Files đã lưu tại: {OUTPUT_DIR.absolute()}")
    print(f"   - API responses: {len(api_data)} endpoints")
    saved = list(OUTPUT_DIR.glob("*.json"))
    print(f"   - JSON files: {len(saved)}")
    for f in saved:
        size = f.stat().st_size
        print(f"     • {f.name} ({size:,} bytes)")
