#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Phase 02: Feature builder (build-time) + lookup (serve-time)
========================================================================
Sinh feature TĨNH theo VỊ TRÍ, DÙNG CHUNG train == serve (chống skew).

Hàm hợp đồng cho Phase 03 (train_susceptibility.py):
    build_feature_frame(df[["lat","lon"]]) -> DataFrame[elevation, slope, dist_river, dist_coast, historical_score]

Hai chế độ:
  • BUILD-TIME (Windows/conda, có rasterio/GDAL): tính feature từ DEM + hình học sông/biển.
      - elevation, slope  ← DEM Copernicus GLO-30 (ai-service/data/dem_danang.tif)
      - dist_coast        ← distance-transform tới BIỂN (mask elevation<=0 lớn nhất, từ DEM)
      - dist_river        ← distance-transform tới polyline sông (hydro_geometry.geojson)
      - historical_score  ← mật độ báo cáo ngập lân cận (⚠️ LEAK-PRONE, xem ghi chú)
  • SERVE-TIME (Docker/pip, KHÔNG GDAL): lookup_features() đọc feature_grid.parquet + KDTree ô gần nhất.

⚠️ CIRCULARITY / LEAKAGE (từ adversarial review Phase 01):
  historical_score suy từ CHÍNH tập điểm ngập (label). Buffer 0.4km ở Phase 01 tạo margin phân tách cứng
  → nếu train trên historical_score (precompute từ TOÀN BỘ positive) thì spatial-CV vẫn CIRCULAR.
  ⇒ feature_builder VẪN trả historical_score (cho heatmap Phase 04 + minh bạch), nhưng Phase 03
     KHÔNG train trên nó (train_susceptibility.FEATURE_COLUMNS loại historical_score).
     Muốn dùng: phải tính FOLD-AWARE (chỉ positive trong fold train).

NGUYÊN TẮC: geospatial CHỈ ở build-time; production đọc precompute; một công thức duy nhất (DRY).
"""

from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent            # ai-service/services
AI_ROOT = HERE.parent                             # ai-service
DATA_DIR = AI_ROOT / "data"

DEM_PATH = DATA_DIR / "dem_danang.tif"
HYDRO_PATH = DATA_DIR / "hydro_geometry.geojson"
GRID_PATH = DATA_DIR / "feature_grid.parquet"
LABELED_PATH = DATA_DIR / "labeled_points.csv"

FEATURE_COLUMNS = ["elevation", "slope", "dist_river", "dist_coast", "historical_score"]

# Study bbox (khớp Phase 01) — precompute grid phủ vùng này.
LAT_MIN, LAT_MAX = 15.95, 16.16
LON_MIN, LON_MAX = 108.05, 108.30
GRID_STEP_M = 200.0            # độ phân giải lưới precompute (~200 m)
HIST_RADIUS_M = 500.0         # bán kính Gaussian cho historical_score
SEA_LEVEL_M = 0.0             # ngưỡng elevation coi là nước/biển (Copernicus: biển ~ 0)
EARTH_R_M = 6_371_008.8

# Polyline sông Đà Nẵng — HAND-DIGITIZED THÔ từ địa lý đã biết (lon, lat).
# Đủ để tính dist_river ở mức feature tĩnh; ghi ra hydro_geometry.geojson để minh bạch.
RIVERS = {
    "song_han": [
        [108.2285, 16.1075], [108.2270, 16.0950], [108.2255, 16.0820], [108.2250, 16.0700],
        [108.2255, 16.0560], [108.2270, 16.0430], [108.2255, 16.0320], [108.2180, 16.0240],
        [108.2100, 16.0180],
    ],
    "song_cam_le": [
        [108.2100, 16.0180], [108.1950, 16.0120], [108.1800, 16.0060], [108.1650, 16.0010],
        [108.1500, 15.9950], [108.1350, 15.9920],
    ],
    "song_cu_de": [
        [108.1550, 16.1150], [108.1350, 16.1120], [108.1150, 16.1080], [108.0950, 16.1020],
        [108.0800, 16.0950],
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
# Tiện ích hình học
# ══════════════════════════════════════════════════════════════════════════════
def _pixel_size_m(transform, lat_center: float):
    """(dx_m, dy_m) của 1 pixel DEM ở vĩ độ lat_center (EPSG:4326)."""
    dlon = abs(transform.a); dlat = abs(transform.e)
    dx = dlon * (np.pi / 180.0) * EARTH_R_M * np.cos(np.radians(lat_center))
    dy = dlat * (np.pi / 180.0) * EARTH_R_M
    return float(dx), float(dy)


def _write_hydro_geojson():
    """Ghi RIVERS ra hydro_geometry.geojson (artifact minh bạch, commit về repo)."""
    features = [{
        "type": "Feature",
        "properties": {"name": name, "kind": "river", "source": "hand-digitized-coarse"},
        "geometry": {"type": "LineString", "coordinates": coords},
    } for name, coords in RIVERS.items()]
    fc = {"type": "FeatureCollection",
          "properties": {"note": "Coarse hand-digitized Da Nang rivers; coast is DEM-derived, not here."},
          "features": features}
    HYDRO_PATH.write_text(json.dumps(fc, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_rivers():
    """Đọc polyline sông từ geojson (nếu chưa có → ghi từ RIVERS embed)."""
    if not HYDRO_PATH.exists():
        _write_hydro_geojson()
    fc = json.loads(HYDRO_PATH.read_text(encoding="utf-8"))
    lines = []
    for f in fc.get("features", []):
        g = f.get("geometry", {})
        if g.get("type") == "LineString":
            lines.append(g["coordinates"])
    return lines


# ══════════════════════════════════════════════════════════════════════════════
# Trạng thái build-time: nạp DEM, tính sẵn slope + distance rasters (một lần)
# ══════════════════════════════════════════════════════════════════════════════
_BUILD = None


def _build_state():
    """Nạp DEM + tính slope-raster, sea-mask, dist_coast-raster, dist_river-raster. Cache."""
    global _BUILD
    if _BUILD is not None:
        return _BUILD

    try:
        import rasterio
        from rasterio.features import rasterize
        from scipy.ndimage import distance_transform_edt, label as cc_label
    except Exception as e:
        raise NotImplementedError(
            "Build-time cần rasterio + scipy (conda env aegisflow-flood). "
            f"Nếu chỉ serve-time, dùng lookup_features() (đọc parquet). Lỗi import: {e}"
        )
    if not DEM_PATH.exists():
        raise FileNotFoundError(
            f"Chưa có DEM {DEM_PATH}. Phase 02 cần dem_danang.tif (Copernicus GLO-30 crop bbox Đà Nẵng)."
        )

    with rasterio.open(DEM_PATH) as ds:
        dem = ds.read(1).astype("float32")
        transform = ds.transform
        crs = ds.crs
        H, W = dem.shape

    lat_center = float(transform.f + transform.e * H / 2.0)
    dx_m, dy_m = _pixel_size_m(transform, lat_center)
    pix_m = (dx_m + dy_m) / 2.0

    # slope (độ): gradient DEM theo mét → arctan(|∇z|)
    gy, gx = np.gradient(dem.astype("float64"), dy_m, dx_m)
    slope_deg = np.degrees(np.arctan(np.sqrt(gx * gx + gy * gy))).astype("float32")

    # sea mask = HỢP của MỌI thành phần (elevation <= SEA_LEVEL) CHẠM BIÊN miền (đại dương mở).
    # ⚠️ KHÔNG dùng 'thành phần lớn nhất' (argmax): bán đảo Sơn Trà chia Biển Đông trong bbox
    #    thành 2 lobe (~166k + ~114k px) chỉ nối nhau NGOÀI miền → argmax bỏ mất lobe Nam/Đông,
    #    khiến dist_coast của cả dải bờ SE bị đo sai (My Khê 1630m thay vì ~200m). Thành phần <=0
    #    KHÔNG chạm biên = trũng nội địa (không phải biển) → giữ là "đất".
    water = dem <= SEA_LEVEL_M
    lab, n = cc_label(water)
    if n >= 1:
        border_ids = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])))
        border_ids.discard(0)  # 0 = nền (đất)
        if border_ids:
            sea_mask = np.isin(lab, list(border_ids))
        else:  # fallback hiếm: không lobe nào chạm biên → lấy lớn nhất
            sizes = np.bincount(lab.ravel()); sizes[0] = 0
            sea_mask = lab == int(sizes.argmax())
    else:
        sea_mask = np.zeros_like(water)
    # dist tới biển (m): EDT trên vùng KHÔNG-biển → khoảng cách tới pixel biển gần nhất
    dist_coast = distance_transform_edt(~sea_mask).astype("float32") * pix_m

    # dist tới sông: rasterize polyline sông lên lưới DEM rồi EDT
    rivers = _load_rivers()
    shapes = [({"type": "LineString", "coordinates": c}, 1) for c in rivers]
    river_mask = rasterize(shapes, out_shape=(H, W), transform=transform,
                           fill=0, default_value=1, all_touched=True).astype(bool)
    if river_mask.any():
        dist_river = distance_transform_edt(~river_mask).astype("float32") * pix_m
    else:
        dist_river = np.full((H, W), np.nan, dtype="float32")

    _BUILD = {
        "dem": dem, "slope": slope_deg, "dist_coast": dist_coast, "dist_river": dist_river,
        "sea_mask": sea_mask, "transform": transform, "crs": str(crs), "H": H, "W": W,
        "pix_m": pix_m, "dx_m": dx_m, "dy_m": dy_m,
    }
    return _BUILD


def _rowcol(transform, lon, lat):
    """(row, col) float từ (lon,lat) theo affine transform; vectorized."""
    a, b, c, d, e, f = transform.a, transform.b, transform.c, transform.d, transform.e, transform.f
    # x = a*col + b*row + c ; y = d*col + e*row + f  (b=d=0 cho lưới bắc-lên)
    col = (lon - c) / a
    row = (lat - f) / e
    return row, col


def _sample(raster, row, col, H, W):
    """Nearest-pixel sampling có CLAMP biên (điểm ngoài DEM → giá trị pixel biên gần nhất)."""
    r = np.clip(np.rint(row).astype(int), 0, H - 1)
    c = np.clip(np.rint(col).astype(int), 0, W - 1)
    return raster[r, c]


def _historical_score(lat, lon, pos_lat, pos_lon, radius_m=HIST_RADIUS_M):
    """Mật độ Gaussian của điểm ngập lịch sử quanh (lat,lon). ⚠️ LEAK-PRONE — không train trên nó."""
    from scipy.spatial import cKDTree
    if len(pos_lat) == 0:
        return np.zeros(len(lat), dtype="float32")
    lat0 = float(np.mean(pos_lat))
    mx = np.pi / 180.0 * EARTH_R_M * np.cos(np.radians(lat0))
    my = np.pi / 180.0 * EARTH_R_M
    tree = cKDTree(np.column_stack([np.asarray(pos_lon) * mx, np.asarray(pos_lat) * my]))
    q = np.column_stack([np.asarray(lon) * mx, np.asarray(lat) * my])
    out = np.zeros(len(lat), dtype="float64")
    # gom neighbor trong 3σ rồi cộng trọng số Gaussian
    idx_lists = tree.query_ball_point(q, r=3.0 * radius_m)
    qx, qy = q[:, 0], q[:, 1]
    px = np.asarray(pos_lon) * mx; py = np.asarray(pos_lat) * my
    for i, idxs in enumerate(idx_lists):
        if not idxs:
            continue
        d2 = (px[idxs] - qx[i]) ** 2 + (py[idxs] - qy[i]) ** 2
        out[i] = np.exp(-0.5 * d2 / (radius_m ** 2)).sum()
    return out.astype("float32")


def _load_positive_points():
    """Toạ độ điểm ngập THẬT (label=1) từ labeled_points.csv — nguồn cho historical_score."""
    if not LABELED_PATH.exists():
        return np.array([]), np.array([])
    df = pd.read_csv(LABELED_PATH)
    pos = df[df["label"] == 1]
    return pos["lat"].to_numpy(), pos["lon"].to_numpy()


# ══════════════════════════════════════════════════════════════════════════════
# HỢP ĐỒNG PHASE 03: build_feature_frame (build-time)
# ══════════════════════════════════════════════════════════════════════════════
def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """
    df: DataFrame có cột 'lat','lon'. Trả DataFrame cùng index với các cột FEATURE_COLUMNS.
    (Build-time: cần rasterio/scipy. Trainer Phase 03 gọi hàm này.)
    """
    st = _build_state()
    lat = df["lat"].to_numpy(dtype=float)
    lon = df["lon"].to_numpy(dtype=float)
    row, col = _rowcol(st["transform"], lon, lat)
    H, W = st["H"], st["W"]

    elevation = _sample(st["dem"], row, col, H, W).astype("float32")
    slope = _sample(st["slope"], row, col, H, W).astype("float32")
    dist_river = _sample(st["dist_river"], row, col, H, W).astype("float32")
    dist_coast = _sample(st["dist_coast"], row, col, H, W).astype("float32")

    pos_lat, pos_lon = _load_positive_points()
    hist = _historical_score(lat, lon, pos_lat, pos_lon)

    return pd.DataFrame({
        "elevation": elevation,
        "slope": slope,
        "dist_river": dist_river,
        "dist_coast": dist_coast,
        "historical_score": hist,
    }, index=df.index)


# ══════════════════════════════════════════════════════════════════════════════
# Precompute grid → feature_grid.parquet (commit) + land mask
# ══════════════════════════════════════════════════════════════════════════════
def build_feature_grid() -> pd.DataFrame:
    """Sinh lưới ~GRID_STEP_M phủ bbox, tính feature, loại điểm trên BIỂN, ghi parquet."""
    st = _build_state()
    lat0 = (LAT_MIN + LAT_MAX) / 2.0
    dlat = GRID_STEP_M / (np.pi / 180.0 * EARTH_R_M)
    dlon = GRID_STEP_M / (np.pi / 180.0 * EARTH_R_M * np.cos(np.radians(lat0)))
    lats = np.arange(LAT_MIN, LAT_MAX + dlat, dlat)
    lons = np.arange(LON_MIN, LON_MAX + dlon, dlon)
    glon, glat = np.meshgrid(lons, lats)
    grid = pd.DataFrame({"lat": glat.ravel(), "lon": glon.ravel()})

    # loại điểm trên biển (mask elevation<=0 lớn nhất)
    row, col = _rowcol(st["transform"], grid["lon"].to_numpy(), grid["lat"].to_numpy())
    on_sea = _sample(st["sea_mask"].astype("uint8"), row, col, st["H"], st["W"]).astype(bool)
    grid = grid[~on_sea].reset_index(drop=True)

    feats = build_feature_frame(grid)
    out = pd.concat([grid, feats], axis=1)
    out = out.round({"lat": 6, "lon": 6, "elevation": 2, "slope": 3,
                     "dist_river": 1, "dist_coast": 1, "historical_score": 5})
    out.to_parquet(GRID_PATH, index=False)
    return out


# ══════════════════════════════════════════════════════════════════════════════
# SERVE-TIME: lookup_features (đọc parquet + KDTree; KHÔNG cần rasterio/GDAL)
# ══════════════════════════════════════════════════════════════════════════════
_GRID = None


def _grid_state():
    global _GRID
    if _GRID is None:
        if not GRID_PATH.exists():
            raise FileNotFoundError(f"Chưa có {GRID_PATH}. Chạy: python feature_builder.py --build-grid")
        from scipy.spatial import cKDTree
        g = pd.read_parquet(GRID_PATH)
        lat0 = float(g["lat"].mean())
        mx = np.pi / 180.0 * EARTH_R_M * np.cos(np.radians(lat0))
        my = np.pi / 180.0 * EARTH_R_M
        tree = cKDTree(np.column_stack([g["lon"].to_numpy() * mx, g["lat"].to_numpy() * my]))
        _GRID = {"grid": g, "tree": tree, "mx": mx, "my": my}
    return _GRID


def lookup_features(df: pd.DataFrame) -> pd.DataFrame:
    """SERVE-TIME: tra cứu ô lưới GẦN NHẤT trong feature_grid.parquet. Chỉ cần pandas/scipy."""
    st = _grid_state()
    lat = df["lat"].to_numpy(dtype=float); lon = df["lon"].to_numpy(dtype=float)
    q = np.column_stack([lon * st["mx"], lat * st["my"]])
    _, idx = st["tree"].query(q, k=1)
    g = st["grid"].iloc[idx].reset_index(drop=True)
    return g[FEATURE_COLUMNS].reset_index(drop=True).set_index(df.index)


# ══════════════════════════════════════════════════════════════════════════════
def _self_test():
    """Kiểm tra plumbing + PARITY build_feature_frame == lookup_features tại điểm lưới."""
    print("[self-test] build state…")
    st = _build_state()
    print(f"  DEM {st['H']}x{st['W']} pix~{st['pix_m']:.1f}m crs={st['crs']}")
    print(f"  sea pixels={int(st['sea_mask'].sum())} "
          f"dist_coast[max]={np.nanmax(st['dist_coast']):.0f}m dist_river[max]={np.nanmax(st['dist_river']):.0f}m")

    # sanity trên vài điểm đã biết
    probe = pd.DataFrame({
        "name": ["cho_han(center)", "my_khe(beach)", "ba_na(mountain)"],
        "lat": [16.055, 16.058, 16.010],
        "lon": [108.216, 108.245, 108.030],
    })
    f = build_feature_frame(probe[["lat", "lon"]])
    print(pd.concat([probe["name"], f], axis=1).to_string(index=False))

    print("[self-test] build grid…")
    g = build_feature_grid()
    print(f"  grid rows={len(g)}  cols={list(g.columns)}")
    for c in FEATURE_COLUMNS:
        print(f"    {c}: min={g[c].min():.3f} p50={g[c].median():.3f} max={g[c].max():.3f} nan={int(g[c].isna().sum())}")

    # PARITY (đúng nghĩa serve-time): lookup_features TẠI CHÍNH điểm lưới phải trả lại giá trị
    # đã lưu của ô đó (KDTree tự-trả-về) → xác nhận grid + KDTree + đọc parquet nhất quán.
    samp_idx = g.sample(min(300, len(g)), random_state=0).index
    samp = g.loc[samp_idx, ["lat", "lon"]].reset_index(drop=True)
    stored = g.loc[samp_idx, FEATURE_COLUMNS].reset_index(drop=True)
    got = lookup_features(samp).reset_index(drop=True)
    max_abs = {c: float((stored[c] - got[c]).abs().max()) for c in FEATURE_COLUMNS}
    print("[parity] max|stored - lookup| tại điểm lưới:", {k: round(v, 6) for k, v in max_abs.items()})
    ok = all(v < 1e-6 for v in max_abs.values())
    print("[parity]", "OK ✅ (serve lookup khớp grid)" if ok else "❌ LỆCH — kiểm tra KDTree/parquet")
    # Thông tin: build (exact) vs lookup (nearest 200m cell) — lệch do LƯỢNG TỬ HOÁ lưới, KHÔNG phải lỗi.
    a = build_feature_frame(samp).reset_index(drop=True)
    quant = {c: round(float((a[c] - got[c]).abs().median()), 3) for c in FEATURE_COLUMNS}
    print("[grid-quant] median|build_exact - lookup_nearest200m| (kỳ vọng nhỏ):", quant)
    print("\n✅ SELF-TEST xong.")


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Phase 02 — feature builder + grid precompute")
    ap.add_argument("--build-grid", action="store_true", help="Sinh feature_grid.parquet")
    ap.add_argument("--self-test", action="store_true", help="Kiểm tra plumbing + parity")
    ap.add_argument("--write-hydro", action="store_true", help="Ghi lại hydro_geometry.geojson từ RIVERS")
    args = ap.parse_args()

    if args.write_hydro:
        _write_hydro_geojson(); print(f"wrote {HYDRO_PATH}")
    if args.self_test:
        _self_test(); return
    if args.build_grid:
        _write_hydro_geojson()
        g = build_feature_grid()
        sz = GRID_PATH.stat().st_size
        print(f"✅ {GRID_PATH} ({sz/1e6:.2f} MB) rows={len(g)}")
        return
    ap.print_help()


if __name__ == "__main__":
    main()
