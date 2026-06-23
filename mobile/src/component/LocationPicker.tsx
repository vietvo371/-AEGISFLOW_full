import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { OPENMAP_STYLE_URL, getOpenMapStyleUrl } from '../config/mapbox';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../contexts/ThemeContext';

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value?: Location;
  onChange: (location: Location) => void;
  label?: string;
  error?: string;
  required?: boolean;
  onAddressChange?: (address: string | null) => void;
}

const DEFAULT_LOCATION = {
  latitude: 16.0680,
  longitude: 108.2122, // Da Nang City
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  label,
  error,
  required = false,
  onAddressChange,
}) => {
  const { colors, theme, isDark } = useAppTheme();
  const styles = getStyles(colors, theme);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(value || null);
  const [addressText, setAddressText] = useState<string | null>(null);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        if (auth === 'granted') {
          return true;
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'AegisFlowAI needs access to your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }
      }
      Alert.alert(
        'Permission Denied',
        'Location permission is required to use this feature.',
        [{ text: 'OK' }]
      );
      return false;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        position => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Check if coordinates are within Da Nang bounds
          const isWithinDaNang = (
            location.longitude >= 108.02 &&
            location.longitude <= 108.29 &&
            location.latitude >= 15.82 &&
            location.latitude <= 16.16
          );

          if (!isWithinDaNang) {
            Alert.alert(
              'Ngoài phạm vi hỗ trợ',
              'Vị trí của bạn nằm ngoài khu vực Đà Nẵng. AegisFlow chỉ hỗ trợ tại Đà Nẵng.',
              [{ text: 'Đóng' }]
            );
            return;
          }

          setCurrentLocation(location);
          setSelectedLocation(location);
          onChange(location);
          fetchAddress(location.latitude, location.longitude);
          cameraRef.current?.setCamera({
            centerCoordinate: [location.longitude, location.latitude],
            zoomLevel: 14,
            animationDuration: 1000,
          });
        },
        error => {
          console.error(error);
          Alert.alert('Error', 'Could not get your location. Please try again.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!value && !currentLocation) {
      getCurrentLocation();
    }
  }, []);

  const formatLocation = (location: Location) => {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const fetchAddress = async (lat: number, lon: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=vi`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AegisFlowAI/1.0'
        }
      });
      const data = await res.json();
      const addr = data?.address || {};
      const road = addr.road || addr.neighbourhood || addr.suburb || null;
      const city = addr.city || addr.town || addr.village || addr.county || null;
      const country = addr.country || null;
      const minimal = [road, city, country].filter(Boolean).join(', ');
      setAddressText(minimal || null);
      onAddressChange?.(minimal || null);
    } catch {
      setAddressText(null);
      onAddressChange?.(null);
    }
  };

  const handleMapPress = (event: any) => {
    const coords = event.geometry?.coordinates;
    if (!coords) return;
    const location = {
      latitude: coords[1],
      longitude: coords[0],
    };
    setSelectedLocation(location);
    onChange(location);
    fetchAddress(location.latitude, location.longitude);
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onChange(selectedLocation);
      setModalVisible(false);
    } else {
      Alert.alert('Error', 'Please select a location first');
    }
  };

  const centerCoord = selectedLocation
    ? [selectedLocation.longitude, selectedLocation.latitude]
    : [DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.latitude];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, error ? styles.buttonError : {}]}
        onPress={() => setModalVisible(true)}>
        <View style={styles.buttonContent}>
          <Icon name="map-marker" size={24} color={colors.primary} style={styles.buttonIcon} />
          <Text
            style={[
              styles.buttonText,
              !selectedLocation && styles.placeholderText,
            ]}>
            {selectedLocation ? (addressText || formatLocation(selectedLocation)) : 'Select location'}
          </Text>
        </View>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}>
                <Icon name="arrow-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Location</Text>
              <View style={styles.headerRight} />
            </View>

            <View style={styles.mapContainer}>
              <MapboxGL.MapView
                style={styles.map}
                styleURL={getOpenMapStyleUrl(isDark)}
                onPress={handleMapPress}>
                <MapboxGL.Camera
                  ref={cameraRef}
                  centerCoordinate={centerCoord}
                  zoomLevel={13}
                />
                {selectedLocation && (
                  <MapboxGL.PointAnnotation
                    id="selected-location"
                    coordinate={[selectedLocation.longitude, selectedLocation.latitude]}>
                    <View style={styles.markerContainer}>
                      <Icon name="map-marker" size={36} color={colors.error} />
                    </View>
                  </MapboxGL.PointAnnotation>
                )}
              </MapboxGL.MapView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}>
                <Icon name="crosshairs-gps" size={24} color={colors.white} />
                <Text style={styles.currentLocationText}>Use Current Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmLocation}>
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, theme: any) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    color: colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: colors.error,
  },
  button: {
    height: 48,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: theme.spacing.sm,
  },
  buttonError: {
    borderColor: colors.error,
  },
  buttonText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.md,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textLight,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: colors.error,
    marginTop: theme.spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.card,
    marginTop: 80,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.lg,
    color: colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  headerRight: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    padding: theme.spacing.md,
    backgroundColor: colors.card,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  currentLocationText: {
    marginLeft: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
    color: colors.white,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
  },
});

export default LocationPicker;