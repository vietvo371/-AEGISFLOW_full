#!/bin/bash

# Đường dẫn đến ảnh gốc (thay thế path_to_original_image.png bằng đường dẫn thật)
ORIGINAL_IMAGE="./src/assets/images/logo.png"
OUTPUT_DIR="ios/CityResQ360App/Images.xcassets/AppIcon.appiconset"

# Tạo các icon với kích thước khác nhau
sips -z 40 40 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-40.png"
sips -z 60 60 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-60.png"
sips -z 58 58 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-58.png"
sips -z 87 87 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-87.png"
sips -z 80 80 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-80.png"
sips -z 120 120 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-120.png"
sips -z 180 180 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-180.png"
sips -z 1024 1024 "${ORIGINAL_IMAGE}" --out "${OUTPUT_DIR}/Icon-1024.png"

echo "Icon generation completed!"
