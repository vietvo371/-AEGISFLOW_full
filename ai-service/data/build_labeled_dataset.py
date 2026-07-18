#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Phase 01: Build Labeled Dataset (nhãn THẬT, không circular)
=======================================================================
Sinh `labeled_points.csv` cho Flood Susceptibility Mapping — thay HOÀN TOÀN CSV synthetic.

Positive (label=1) = điểm ngập THẬT:
  • 391 điểm sự kiện 14/10/2022  → scripts/crawled_data/flood_reports_2022_oct14.json
  • điểm ngập KINH NIÊN (is_frequent=True) → scripts/crawled_data/flood_reports.json

Negative (label=0) = pseudo-absence lấy mẫu có kiểm soát theo địa hình + không gian:
  • loại trừ buffer quanh mọi positive (BUFFER_KM),
  • geofence "trên đất liền / vùng dân cư" (trong LAND_KM của mạng lưới trạm+node+positive)
    → tự loại biển Đông và núi xa mà KHÔNG cần polygon bờ biển,
  • trộn 2 nhóm để CHỐNG lỗi "trivially-separable" (model chỉ học 'cao = an toàn'):
      - HARD (~40%): elevation THẤP/TRUNG BÌNH và GẦN điểm ngập thật (ngoài buffer)
      - EASY (~60%): elevation cao HOẶC xa mọi điểm ngập.

NGUYÊN TẮC (theo HANDOFF): KHÔNG oversample nhân bản; split-trước/cân-bằng-sau ở Phase 03;
KHÔNG dùng flood_danang_*.csv. Deterministic (seed cố định) → chạy lại ra y hệt.

Output:
  ai-service/data/labeled_points.csv        cols: lat, lon, label, source, water_level_cm
  ai-service/data/labeled_points_meta.json  provenance + tham số + counts + sha256(csv)
  ai-service/data/labeled_points_scatter.png  (tùy chọn, cần matplotlib; --plot)

Chạy:
  python ai-service/data/build_labeled_dataset.py
  python ai-service/data/build_labeled_dataset.py --plot        # kèm scatter kiểm tra bằng mắt
  python ai-service/data/build_labeled_dataset.py --verify      # chạy 2 lần, xác nhận byte-identical
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

# ── Đường dẫn ─────────────────────────────────────────────────────────────────
HERE = Path(__file__).resolve().parent                 # ai-service/data
AI_ROOT = HERE.parent                                  # ai-service
REPO_ROOT = AI_ROOT.parent                             # repo root
CRAWLED = REPO_ROOT / "scripts" / "crawled_data"

SRC_OCT14 = CRAWLED / "flood_reports_2022_oct14.json"
SRC_REPORTS = CRAWLED / "flood_reports.json"
SRC_WATER = CRAWLED / "water_stations_all.json"
SRC_RAIN = CRAWLED / "rain_stations.json"
SRC_GRAPH = AI_ROOT / "data" / "danang_flood_graph.json"

OUT_CSV = HERE / "labeled_points.csv"
OUT_META = HERE / "labeled_points_meta.json"
OUT_PLOT = HERE / "labeled_points_scatter.png"

# ── Tham số (deterministic, ghi vào meta) ────────────────────────────────────
SEED = 42
ROUND_DEDUP = 5          # làm tròn ~5 chữ số (~1.1 m) để dedup positive/negative
ROUND_OUT = 6            # số chữ số ghi ra CSV (ổn định byte)

# Study bbox — Đà Nẵng đất liền (đô thị + Hòa Vang). Loại outlier tỉnh khác
# (một số điểm kinh niên nằm ở Quảng Nam: lat~15.58, lon~107.54).
LAT_MIN, LAT_MAX = 15.95, 16.16
LON_MIN, LON_MAX = 108.05, 108.30

BUFFER_KM = 0.4          # loại trừ negative trong bán kính này quanh mọi positive
LAND_KM = 1.5            # geofence: negative phải trong bán kính này của 1 điểm mốc đất liền
NEG_RATIO = 2.5          # negative : positive
HARD_FRACTION = 0.40     # tỉ lệ hard-negative trong tổng negative
ELEV_SPLIT_M = 8.0       # elevation-proxy < ngưỡng này = "thấp/trung bình" (ứng viên hard)
HARD_MAX_KM = 1.2        # hard-negative phải nằm trong bán kính này của 1 positive
DRAW_BATCH = 20000       # số ứng viên uniform mỗi vòng bốc (đủ để lấp quota nhanh)
MAX_ROUNDS = 60          # trần an toàn cho vòng lặp bốc mẫu

EARTH_R_KM = 6371.0088


# ══════════════════════════════════════════════════════════════════════════════
# Tiện ích
# ══════════════════════════════════════════════════════════════════════════════
def load_json(path: Path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def records(blob):
    """Chuẩn hoá: file có thể là list, hoặc dict bọc {'data': [...]}."""
    if isinstance(blob, list):
        return blob
    if isinstance(blob, dict):
        for k in ("data", "reports", "results", "items"):
            if isinstance(blob.get(k), list):
                return blob[k]
    return []


def coord_lonlat(rec):
    """Trả (lon, lat) từ location.coordinates ([lon, lat] kiểu GeoJSON)."""
    loc = rec.get("location") or {}
    c = loc.get("coordinates")
    if not c or len(c) < 2:
        return None
    try:
        return float(c[0]), float(c[1])
    except (TypeError, ValueError):
        return None


def in_bbox(lon, lat) -> bool:
    return (LON_MIN <= lon <= LON_MAX) and (LAT_MIN <= lat <= LAT_MAX)


def haversine_km(lon1, lat1, lon2, lat2):
    """Vectorized haversine. Broadcasting: (N,1) vs (M,) → (N,M) hoặc scalar-array."""
    lat1r = np.radians(lat1); lat2r = np.radians(lat2)
    dphi = np.radians(lat2 - lat1); dl = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0) ** 2 + np.cos(lat1r) * np.cos(lat2r) * np.sin(dl / 2.0) ** 2
    return 2.0 * EARTH_R_KM * np.arcsin(np.sqrt(a))


def min_dist_km(cand_lon, cand_lat, ref_lon, ref_lat, chunk=4000):
    """Với mỗi ứng viên (N), khoảng cách NHỎ NHẤT tới tập tham chiếu (M). Chia chunk cho nhẹ RAM."""
    n = len(cand_lon)
    out = np.empty(n, dtype=float)
    for s in range(0, n, chunk):
        e = min(s + chunk, n)
        d = haversine_km(
            cand_lon[s:e, None], cand_lat[s:e, None], ref_lon[None, :], ref_lat[None, :]
        )
        out[s:e] = d.min(axis=1)
    return out


def nearest_node_elev(cand_lon, cand_lat, node_lon, node_lat, node_elev, chunk=4000):
    """Elevation-proxy = elevation của node đồ thị GẦN NHẤT (35 node, thô nhưng là nguồn thật duy nhất
    ở Phase 01; Phase 02 sẽ tính elevation DEM chuẩn). Chỉ dùng để phân tầng hard/easy."""
    n = len(cand_lon)
    out = np.empty(n, dtype=float)
    for s in range(0, n, chunk):
        e = min(s + chunk, n)
        d = haversine_km(
            cand_lon[s:e, None], cand_lat[s:e, None], node_lon[None, :], node_lat[None, :]
        )
        out[s:e] = node_elev[np.argmin(d, axis=1)]
    return out


# ══════════════════════════════════════════════════════════════════════════════
# 1. Positive từ báo cáo ngập THẬT
# ══════════════════════════════════════════════════════════════════════════════
def build_positives():
    """Trả DataFrame[lat, lon, label=1, source, water_level_cm] đã dedup + lọc bbox."""
    rows = []
    n_raw_oct14 = n_raw_chronic = 0
    n_out_bbox = 0

    # (a) Sự kiện 14/10/2022 — TẤT CẢ đều là điểm ngập thật.
    for rec in records(load_json(SRC_OCT14)):
        c = coord_lonlat(rec)
        if c is None:
            continue
        n_raw_oct14 += 1
        lon, lat = c
        if not in_bbox(lon, lat):
            n_out_bbox += 1
            continue
        wl = rec.get("water_level")
        rows.append((lat, lon, "oct14_2022", int(wl) if isinstance(wl, (int, float)) else None))

    # (b) Điểm kinh niên (is_frequent=True) từ flood_reports.json.
    for rec in records(load_json(SRC_REPORTS)):
        if rec.get("is_frequent") is not True:
            continue
        c = coord_lonlat(rec)
        if c is None:
            continue
        n_raw_chronic += 1
        lon, lat = c
        if not in_bbox(lon, lat):
            n_out_bbox += 1
            continue
        wl = rec.get("water_level")
        rows.append((lat, lon, "chronic", int(wl) if isinstance(wl, (int, float)) else None))

    # Dedup theo (lon,lat) làm tròn ROUND_DEDUP. Ưu tiên xuất hiện đầu (oct14 trước chronic);
    # trong nhóm trùng giữ water_level LỚN NHẤT (thông tin nặng nhất). Deterministic.
    best = {}
    for lat, lon, source, wl in rows:
        key = (round(lon, ROUND_DEDUP), round(lat, ROUND_DEDUP))
        if key not in best:
            best[key] = [lat, lon, source, wl]
        else:
            cur = best[key]
            if wl is not None and (cur[3] is None or wl > cur[3]):
                cur[3] = wl  # nâng water_level lên mức lớn nhất, giữ source/toạ độ gốc

    pos = pd.DataFrame(
        [(v[0], v[1], 1, v[2], v[3]) for v in best.values()],
        columns=["lat", "lon", "label", "source", "water_level_cm"],
    )
    stats = {
        "n_raw_oct14": n_raw_oct14,
        "n_raw_chronic": n_raw_chronic,
        "n_dropped_out_of_bbox": n_out_bbox,
        "n_positive_after_dedup": int(len(pos)),
        "n_pos_oct14": int((pos["source"] == "oct14_2022").sum()),
        "n_pos_chronic": int((pos["source"] == "chronic").sum()),
    }
    return pos, stats


# ══════════════════════════════════════════════════════════════════════════════
# 2. Tập điểm mốc "đất liền / dân cư" (geofence) + node elevation
# ══════════════════════════════════════════════════════════════════════════════
def build_land_reference(pos: pd.DataFrame):
    land_lon, land_lat = [], []

    # trạm nước (longitude/latitude trực tiếp)
    for w in records(load_json(SRC_WATER)):
        lo, la = w.get("longitude"), w.get("latitude")
        if lo is None or la is None:
            continue
        lo, la = float(lo), float(la)
        if in_bbox(lo, la):
            land_lon.append(lo); land_lat.append(la)

    # trạm mưa (location.coordinates)
    for r in records(load_json(SRC_RAIN)):
        c = coord_lonlat(r)
        if c and in_bbox(*c):
            land_lon.append(c[0]); land_lat.append(c[1])

    # node đồ thị
    graph = load_json(SRC_GRAPH)
    node_lon, node_lat, node_elev = [], [], []
    for v in graph.values():
        lo, la, el = float(v["lng"]), float(v["lat"]), float(v["elevation"])
        node_lon.append(lo); node_lat.append(la); node_elev.append(el)
        if in_bbox(lo, la):
            land_lon.append(lo); land_lat.append(la)

    # positive cũng là điểm đất liền chắc chắn
    land_lon.extend(pos["lon"].tolist())
    land_lat.extend(pos["lat"].tolist())

    return (
        np.asarray(land_lon), np.asarray(land_lat),
        np.asarray(node_lon), np.asarray(node_lat), np.asarray(node_elev),
    )


# ══════════════════════════════════════════════════════════════════════════════
# 3. Pseudo-absence: bốc mẫu + phân tầng hard/easy (deterministic)
# ══════════════════════════════════════════════════════════════════════════════
def build_negatives(pos, land_lon, land_lat, node_lon, node_lat, node_elev):
    rng = np.random.default_rng(SEED)
    pos_lon = pos["lon"].to_numpy(); pos_lat = pos["lat"].to_numpy()

    n_pos = len(pos)
    target_neg = int(round(n_pos * NEG_RATIO))
    target_hard = int(round(target_neg * HARD_FRACTION))
    target_easy = target_neg - target_hard

    hard, easy = [], []          # mỗi phần tử: (lat, lon)
    taken_keys = set()           # dedup theo ROUND_DEDUP (chống trùng negative & trùng positive)
    for (lo, la) in zip(pos_lon, pos_lat):
        taken_keys.add((round(lo, ROUND_DEDUP), round(la, ROUND_DEDUP)))

    dpos_hist, elev_hist = [], []  # thống kê để ghi meta
    rounds = 0
    while (len(hard) < target_hard or len(easy) < target_easy) and rounds < MAX_ROUNDS:
        rounds += 1
        clon = rng.uniform(LON_MIN, LON_MAX, DRAW_BATCH)
        clat = rng.uniform(LAT_MIN, LAT_MAX, DRAW_BATCH)

        d_land = min_dist_km(clon, clat, land_lon, land_lat)
        d_pos = min_dist_km(clon, clat, pos_lon, pos_lat)
        elev = nearest_node_elev(clon, clat, node_lon, node_lat, node_elev)

        on_land = d_land <= LAND_KM
        outside_buf = d_pos >= BUFFER_KM
        ok = on_land & outside_buf
        # hard = thấp/TB elevation VÀ gần điểm ngập thật (ngoài buffer)
        is_hard = ok & (elev < ELEV_SPLIT_M) & (d_pos <= HARD_MAX_KM)
        is_easy = ok & ~is_hard

        for idx in np.nonzero(ok)[0]:
            lo = float(clon[idx]); la = float(clat[idx])
            key = (round(lo, ROUND_DEDUP), round(la, ROUND_DEDUP))
            if key in taken_keys:
                continue
            if is_hard[idx] and len(hard) < target_hard:
                hard.append((la, lo)); taken_keys.add(key)
                dpos_hist.append(float(d_pos[idx])); elev_hist.append(float(elev[idx]))
            elif is_easy[idx] and len(easy) < target_easy:
                easy.append((la, lo)); taken_keys.add(key)
                dpos_hist.append(float(d_pos[idx])); elev_hist.append(float(elev[idx]))
            if len(hard) >= target_hard and len(easy) >= target_easy:
                break

    # water_level_cm = None cho negative (không có báo cáo). LƯU Ý: water_level_cm & source là
    # METADATA nguồn gốc — chúng encode label (positive có water_level/source ngập; negative rỗng).
    # TUYỆT ĐỐI KHÔNG dùng 2 cột này làm feature; feature CHỈ suy từ lat/lon ở Phase 02 (xem caveats meta).
    neg_rows = [(la, lo, 0, "pseudo_absence_hard", None) for (la, lo) in hard]
    neg_rows += [(la, lo, 0, "pseudo_absence_easy", None) for (la, lo) in easy]
    neg = pd.DataFrame(neg_rows, columns=["lat", "lon", "label", "source", "water_level_cm"])

    quota_met = (len(hard) == target_hard) and (len(easy) == target_easy)
    dpos_hist = np.asarray(dpos_hist); elev_hist = np.asarray(elev_hist)
    stats = {
        "target_neg": target_neg,
        "target_hard": target_hard,
        "target_easy": target_easy,
        "n_hard": len(hard),
        "n_easy": len(easy),
        "quota_met": bool(quota_met),
        "hit_max_rounds": bool(rounds >= MAX_ROUNDS),
        "rounds_used": rounds,
        "neg_d_pos_km": {
            "p10": _p(dpos_hist, 10), "p50": _p(dpos_hist, 50), "p90": _p(dpos_hist, 90),
        },
        "neg_elev_proxy_m": {
            "min": _minmax(elev_hist, "min"), "p50": _p(elev_hist, 50), "max": _minmax(elev_hist, "max"),
        },
    }
    return neg, stats


def _p(a, q):
    return float(np.percentile(a, q)) if len(a) else None


def _minmax(a, which):
    if not len(a):
        return None
    return float(a.min() if which == "min" else a.max())


# ══════════════════════════════════════════════════════════════════════════════
# 4. Ghi CSV + meta (+ scatter tùy chọn)
# ══════════════════════════════════════════════════════════════════════════════
def write_outputs(pos, neg, pos_stats, neg_stats, do_plot):
    df = pd.concat([pos, neg], ignore_index=True)
    # Sắp xếp ổn định để output byte-identical giữa các lần chạy.
    df["lat"] = df["lat"].round(ROUND_OUT)
    df["lon"] = df["lon"].round(ROUND_OUT)
    df = df.sort_values(["label", "lat", "lon", "source"], kind="mergesort").reset_index(drop=True)
    # water_level_cm: số nguyên nullable → ghi '' cho negative
    df["water_level_cm"] = df["water_level_cm"].astype("Int64")

    df.to_csv(OUT_CSV, index=False, lineterminator="\n", encoding="utf-8")
    csv_sha = hashlib.sha256(OUT_CSV.read_bytes()).hexdigest()

    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "purpose": "Phase 01 — labeled points cho Flood Susceptibility Mapping (nhãn THẬT, không circular)",
        "csv": OUT_CSV.name,
        "csv_sha256": csv_sha,
        "csv_rows": int(len(df)),
        "schema": ["lat", "lon", "label", "source", "water_level_cm"],
        "label_definition": {
            "1": "điểm ngập THẬT (báo cáo 14/10/2022 hoặc kinh niên is_frequent=True)",
            "0": "pseudo-absence (không có báo cáo ngập); KHÔNG khẳng định 'không bao giờ ngập'",
        },
        "sources": {
            "positive_oct14": SRC_OCT14.relative_to(REPO_ROOT).as_posix(),
            "positive_chronic": SRC_REPORTS.relative_to(REPO_ROOT).as_posix(),
            "land_reference": [
                SRC_WATER.relative_to(REPO_ROOT).as_posix(),
                SRC_RAIN.relative_to(REPO_ROOT).as_posix(),
                SRC_GRAPH.relative_to(REPO_ROOT).as_posix(),
            ],
            "NOT_USED": "ai-service/data/flood_danang_*.csv (synthetic + nhãn circular)",
        },
        "quota_met": neg_stats["quota_met"],
        "counts": {
            "n_total": int(len(df)),
            "n_positive": int((df["label"] == 1).sum()),
            "n_negative": int((df["label"] == 0).sum()),
            "n_pos_oct14": pos_stats["n_pos_oct14"],
            "n_pos_chronic": pos_stats["n_pos_chronic"],
            "n_neg_hard": neg_stats["n_hard"],
            "n_neg_easy": neg_stats["n_easy"],
        },
        "params": {
            "seed": SEED,
            "round_dedup_decimals": ROUND_DEDUP,
            "round_output_decimals": ROUND_OUT,
            "study_bbox": {"lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX]},
            "buffer_km": BUFFER_KM,
            "land_geofence_km": LAND_KM,
            "neg_ratio": NEG_RATIO,
            "hard_fraction": HARD_FRACTION,
            "elev_split_m": ELEV_SPLIT_M,
            "hard_max_km": HARD_MAX_KM,
        },
        "positive_build_stats": pos_stats,
        "negative_build_stats": neg_stats,
        "library_versions": {
            "python": sys.version.split()[0],
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
        "caveats": [
            "Presence-only: nhãn 0 = 'không có báo cáo', KHÔNG phải 'không ngập' → pseudo-absence có bias.",
            "Đã giảm bias bằng buffer + geofence + 40% hard-negative (elevation thấp/TB, gần điểm ngập).",
            "elevation-proxy dùng để phân tầng là node đồ thị THÔ (35 node); Phase 02 mới tính DEM chuẩn.",
            "Chỉ 1 sự kiện lũ lớn (14/10/2022) → khái quát theo KHÔNG GIAN, không theo thời gian.",
            "Đánh giá TRUNG THỰC = spatial-CV PR-AUC ở Phase 03, KHÔNG phải random split.",
            "⚠️ LEAKAGE GUARD (Phase 02/03): water_level_cm và source là METADATA nguồn gốc — encode label "
            "1-1 (positive có water_level & source ngập; negative rỗng). TUYỆT ĐỐI KHÔNG dùng làm feature; "
            "feature CHỈ suy từ (lat, lon).",
            "⚠️ CIRCULARITY (Phase 02/03): buffer "
            + str(BUFFER_KM) + "km tạo khoảng cách phân tách CỨNG giữa 2 lớp (mọi negative ≥ buffer khỏi mọi "
            "positive). Do đó BẤT KỲ feature 'khoảng cách/mật độ tới điểm ngập lịch sử' (vd historical_score) "
            "sẽ CIRCULAR và spatial-CV KHÔNG cứu được nếu precompute từ TOÀN BỘ positive. Phải tính FOLD-AWARE "
            "(chỉ từ positive trong fold train) hoặc LOẠI feature đó.",
            "⚠️ POSITIONAL GRADIENT (Phase 03): negative lấy uniform vs positive co cụm → có gradient tỉ lệ "
            "theo vị trí (lon lõi ~64% positive, rìa ~4%). KHÔNG dùng lat/lon THÔ làm feature; nên báo PR-AUC "
            "RIÊNG cho hard-negative vs easy-negative để lộ mức lệch do lấy mẫu.",
        ],
    }
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    if do_plot:
        _plot(df)

    return df, meta, csv_sha


def _plot(df):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception as e:  # matplotlib không bắt buộc
        print(f"[plot] bỏ qua (thiếu matplotlib: {e})")
        return
    fig, ax = plt.subplots(figsize=(8, 8))
    sub = {
        "pseudo_absence_easy": ("#9ecae1", "easy neg", 6),
        "pseudo_absence_hard": ("#fdae6b", "hard neg", 8),
        "chronic": ("#31a354", "chronic pos", 14),
        "oct14_2022": ("#de2d26", "oct14 pos", 10),
    }
    for src, (color, lbl, sz) in sub.items():
        m = df["source"] == src
        ax.scatter(df.loc[m, "lon"], df.loc[m, "lat"], s=sz, c=color, label=lbl,
                   alpha=0.7, edgecolors="none")
    ax.set_xlabel("lon"); ax.set_ylabel("lat")
    ax.set_title("AegisFlow labeled_points — positive (ngập thật) vs pseudo-absence")
    ax.legend(loc="upper right", fontsize=8); ax.set_aspect("equal", adjustable="datalim")
    fig.tight_layout(); fig.savefig(OUT_PLOT, dpi=120)
    print(f"[plot] đã lưu {OUT_PLOT}")


# ══════════════════════════════════════════════════════════════════════════════
def build_once(do_plot=False, quiet=False):
    pos, pos_stats = build_positives()
    land_lon, land_lat, node_lon, node_lat, node_elev = build_land_reference(pos)
    neg, neg_stats = build_negatives(pos, land_lon, land_lat, node_lon, node_lat, node_elev)
    df, meta, csv_sha = write_outputs(pos, neg, pos_stats, neg_stats, do_plot)
    if not quiet:
        c = meta["counts"]
        print("[positives]", pos_stats)
        print("[negatives]", {k: neg_stats[k] for k in ("target_neg", "n_hard", "n_easy", "rounds_used")})
        print(f"[total] {c['n_total']} = {c['n_positive']} pos "
              f"({c['n_pos_oct14']} oct14 + {c['n_pos_chronic']} chronic) + "
              f"{c['n_negative']} neg ({c['n_neg_hard']} hard + {c['n_neg_easy']} easy)")
        if not neg_stats["quota_met"]:
            print(f"⚠️ [WARNING] KHÔNG lấp đủ quota negative sau {neg_stats['rounds_used']} vòng "
                  f"(hard {neg_stats['n_hard']}/{neg_stats['target_hard']}, "
                  f"easy {neg_stats['n_easy']}/{neg_stats['target_easy']}). "
                  f"Dataset lệch tỉ lệ — Phase 03 nên gate trên meta.quota_met. "
                  f"Kiểm tra nguồn dữ liệu / nới ELEV_SPLIT_M / HARD_MAX_KM / MAX_ROUNDS.")
        print(f"[csv] {OUT_CSV}  sha256={csv_sha[:16]}…")
        print(f"[meta] {OUT_META}")
    return csv_sha


def main():
    ap = argparse.ArgumentParser(description="Phase 01 — build labeled_points.csv (nhãn thật)")
    ap.add_argument("--plot", action="store_true", help="Ghi scatter PNG (cần matplotlib)")
    ap.add_argument("--verify", action="store_true",
                    help="Chạy 2 lần, xác nhận CSV byte-identical (deterministic)")
    args = ap.parse_args()

    sha1 = build_once(do_plot=args.plot)
    if args.verify:
        sha2 = build_once(do_plot=False, quiet=True)
        ok = sha1 == sha2
        print(f"\n[verify] run1={sha1[:16]}… run2={sha2[:16]}… → "
              f"{'IDENTICAL ✅ (deterministic)' if ok else 'KHÁC NHAU ❌ (non-deterministic!)'}")
        if not ok:
            sys.exit(1)
    print("\n✅ Phase 01 xong. Tiếp theo: Phase 02 (feature_builder) rồi Phase 03 (train).")


if __name__ == "__main__":
    main()
