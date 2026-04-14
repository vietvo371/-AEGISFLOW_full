import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import { theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
  title?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = 'Quét mã QR' }) => {
  const scannerRef = useRef<QRCodeScanner>(null);

  const onSuccess = (e: any) => {
    if (e.data) {
      onScan(e.data);
    } else {
      // Re-activate if scanning failed or read empty
      scannerRef.current?.reactivate();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header overlay over the camera view */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.7} hitSlop={{top: 15, left: 15, bottom: 15, right: 15}}>
            <Icon name="close" size={28} color={theme.colors.white} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholderIcon} />
      </View>

      <QRCodeScanner
        ref={scannerRef}
        onRead={onSuccess}
        flashMode={RNCamera.Constants.FlashMode.auto}
        showMarker={true}
        markerStyle={styles.marker}
        cameraStyle={styles.camera}
        containerStyle={styles.scannerContainer}
        topContent={<View />}
        bottomContent={
          <Text style={styles.instruction}>
            Di chuyển camera để quét mã QR/Barcode trong khung ngắm.
          </Text>
        }
        bottomViewStyle={styles.bottomContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    height: '100%',
    width: '100%',
  },
  marker: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    borderRadius: 16,
    width: 250,
    height: 250,
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
  },
  placeholderIcon: {
    width: 44,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    color: theme.colors.white,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default QRScanner;
