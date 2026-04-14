import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  PermissionsAndroid,
  Alert,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { theme } from '../theme/colors';

interface ImagePickerProps {
  onImageSelected: (uri: string) => void;
  imageUri?: string;
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  isCircle?: boolean;
  size?: number;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelected,
  imageUri,
  label,
  error,
  required = false,
  containerStyle,
  isCircle = false,
  size = 120,
}) => {
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'AgriCred needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleImagePickerResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    if (response.errorCode) {
      let errorMessage = 'Something went wrong while picking the image';
      switch (response.errorCode) {
        case 'camera_unavailable':
          errorMessage = 'Camera not available on device';
          break;
        case 'permission':
          errorMessage = 'Permission not granted';
          break;
        case 'others':
          errorMessage = response.errorMessage || 'Unknown error occurred';
          break;
      }
      Alert.alert('Error', errorMessage);
      return;
    }

    if (response.assets && response.assets[0]?.uri) {
      onImageSelected(response.assets[0].uri);
    } else {
      Alert.alert('Error', 'No image was selected');
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
        includeBase64: false,
      });
      handleImagePickerResponse(result);
    } catch (error) {
      console.error('Camera launch error:', error);
      Alert.alert('Error', 'Failed to launch camera');
    }
  };

  const handleChoosePhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false,
      });
      handleImagePickerResponse(result);
    } catch (error) {
      console.error('Image library error:', error);
      Alert.alert('Error', 'Failed to open photo gallery');
    }
  };

  const imageContainerStyle: ViewStyle = isCircle ? {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
  } : {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.borderRadius.md,
  };

  const imageStyle: ImageStyle = isCircle ? {
    width: size,
    height: size,
  } : {
    width: '100%',
    height: '100%',
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={[styles.imageContainer, error ? styles.errorBorder : {}]}>
        {imageUri ? (
          <View style={[styles.imageWrapper, imageContainerStyle]}>
            <Image source={{ uri: imageUri }} style={[styles.image, imageStyle]} />
            <TouchableOpacity
              style={[styles.changeButton, isCircle && styles.circleChangeButton]}
              onPress={handleChoosePhoto}>
              <Icon name="camera" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.emptyContainer, imageContainerStyle]}
            onPress={handleChoosePhoto}>
            <Icon name="camera-plus" size={32} color={theme.colors.primary} />
            <Text style={styles.emptyText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  imageContainer: {
    alignItems: 'center',
  },
  errorBorder: {
    borderColor: theme.colors.error,
  },
  imageWrapper: {
    backgroundColor: theme.colors.background,
  },
  image: {
    resizeMode: 'cover',
  },
  changeButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.overlay,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  circleChangeButton: {
    bottom: 0,
    height: '35%',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});

export default ImagePicker; 