#!/bin/bash

# Script build APK cho CityResQ360App
# Tạo bởi: Build Script Generator

echo "🚀 Bắt đầu build APK..."

# Màu sắc cho terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kiểm tra thư mục android
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Không tìm thấy thư mục android!${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Đang dọn dẹp build cũ...${NC}"
cd android
./gradlew clean

echo -e "${YELLOW}🔨 Đang build APK Release...${NC}"
./gradlew assembleRelease

# Kiểm tra kết quả build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build thành công!${NC}"
    
    # Tìm file APK
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        # Tạo thư mục output nếu chưa có
        mkdir -p ../apk-output
        
        # Copy APK ra thư mục gốc với tên dễ nhớ hơn
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        OUTPUT_APK="../apk-output/CityResQ360_${TIMESTAMP}.apk"
        cp "$APK_PATH" "$OUTPUT_APK"
        
        # Lấy kích thước file
        SIZE=$(du -h "$OUTPUT_APK" | cut -f1)
        
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}📱 APK đã được tạo thành công!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}📂 Đường dẫn:${NC} $OUTPUT_APK"
        echo -e "${YELLOW}📊 Kích thước:${NC} $SIZE"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}📱 Bước tiếp theo:${NC}"
        echo "1. Upload APK lên hosting (Firebase, Dropbox, Google Drive...)"
        echo "2. Sử dụng script tạo QR code: node create-qr-page.js"
        echo ""
    else
        echo -e "${RED}❌ Không tìm thấy file APK!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build thất bại! Kiểm tra lỗi ở trên.${NC}"
    exit 1
fi

cd ..
