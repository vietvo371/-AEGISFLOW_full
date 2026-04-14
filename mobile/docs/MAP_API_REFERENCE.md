# Map API Module Documentation

Tài liệu chi tiết về 4 API endpoints của Map module.

## 1. Get Map Reports

**Endpoint**: `GET /api/v1/map/reports`

**Query Params**:
- `bounds` (required): `SW_lat,SW_lng,NE_lat,NE_lng`
- `danh_muc` (optional): Category filter (0-5)

**Example**:
```
GET /api/v1/map/reports?bounds=10.7,106.6,10.8,106.8
```

**Response**:
```json
{
  "success": true,
  "message": "Lấy dữ liệu bản đồ thành công",
  "data": [
    {
      "id": 45,
      "vi_do": 10.7003551,
      "kinh_do": 106.7823847,
      "tieu_de": "Rác thải tràn lan trên vỉa hè",
      "danh_muc": 4,
      "danh_muc_text": "Rác thải",
      "uu_tien": null,
      "trang_thai": 4,
      "marker_color": "#9E9E9E"
    }
  ]
}
```

---

## 2. Get Heatmap Data

**Endpoint**: `GET /api/v1/map/heatmap`

**Query Params**:
- `days` (optional): Number of days (default: 7)

**Example**:
```
GET /api/v1/map/heatmap?days=7
```

**Response**:
```json
{
  "success": true,
  "message": "Lấy dữ liệu heatmap thành công",
  "data": [
    {
      "vi_do": 10.6095324,
      "kinh_do": 106.8069295,
      "weight": 1
    },
    {
      "vi_do": 10.6186054,
      "kinh_do": 106.8500326,
      "weight": 1
    }
  ]
}
```

**Usage**: 
- Hiển thị heat layer trên map
- `weight` là số lượng reports tại tọa độ đó
- Dùng để highlight khu vực nhiều sự cố

---

## 3. Get Cluster Markers

**Endpoint**: `GET /api/v1/map/clusters`

**Query Params**:
- `zoom` (required): Map zoom level (1-20)

**Example**:
```
GET /api/v1/map/clusters?zoom=12
```

**Response**:
```json
{
  "success": true,
  "message": "Lấy cluster markers thành công",
  "data": [
    {
      "vi_do": 10.76,
      "kinh_do": 106.8,
      "count": 1,
      "sample_id": 2
    },
    {
      "vi_do": 10.73,
      "kinh_do": 106.72,
      "count": 1,
      "sample_id": 3
    }
  ]
}
```

**Usage**:
- Nhóm nhiều markers gần nhau thành 1 cluster
- `count`: số markers trong cluster
- `sample_id`: ID của 1 report đại diện (để preview)
- Giúp tránh lag khi có nhiều markers

---

## 4. Get GTFS Routes

**Endpoint**: `GET /api/v1/map/routes`

**Query Params**: None

**Example**:
```
GET /api/v1/map/routes
```

**Response**:
```json
{
  "success": true,
  "message": "GTFS routes (coming soon)",
  "data": []
}
```

**Status**: 🚧 Coming soon - Placeholder cho tương lai
- Sẽ hiển thị tuyến xe bus GTFS
- Data structure đã chuẩn bị sẵn

---

## Implementation Notes

### Map Reports
- Dùng để hiển thị markers trên map
- Filter theo category nếu cần
- Chỉ load reports trong viewport (bounds)

### Heatmap
- Dùng Mapbox heatmap layer
- Adjust intensity theo weight
- Thường dùng cho overview

### Clusters
- Tự động group markers khi zoom out
- Click cluster → zoom in
- Sample ID để show preview

### Routes
- Chưa implement
- Dữ liệu GTFS sẽ có sau
