import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/colors';

interface ButtonCustomProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  gradient?: boolean;
}

const ButtonCustom: React.FC<ButtonCustomProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  gradient = false,
}) => {
  const getButtonStyle = () => {
    const styles: ViewStyle[] = [{
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      width: fullWidth ? '100%' : 'auto',
      ...theme.shadows.yellow,
    }];

    // Add variant styles
    switch (variant) {
      case 'secondary':
        styles.push({
          backgroundColor: theme.colors.secondary,
          ...theme.shadows.md,
        });
        break;
      case 'outline':
        styles.push({
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        });
        break;
      case 'ghost':
        styles.push({
          backgroundColor: 'transparent',
          borderWidth: 0,
        });
        break;
      default:
        if (gradient) {
          styles.push({
            backgroundColor: 'transparent',
          });
        } else {
          styles.push({
            backgroundColor: theme.colors.primary,
          });
        }
    }

    // Add size styles
    switch (size) {
      case 'small':
        styles.push({
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
        });
        break;
      case 'large':
        styles.push({
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        });
        break;
      default:
        styles.push({
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        });
    }

    // Add disabled styles
    if (disabled) {
      styles.push({
        backgroundColor: theme.colors.disabled,
        borderColor: theme.colors.disabled,
      });
    }

    // Add custom styles
    if (style) {
      styles.push(style);
    }

    return styles;
  };

  const getTextStyle = () => {
    const styles: TextStyle[] = [{
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.md,
    }];

    // Add variant text styles
    switch (variant) {
      case 'outline':
        styles.push({
          color: theme.colors.primary,
        });
        break;
      default:
        styles.push({
          color: theme.colors.white,
        });
    }

    // Add disabled text styles
    if (disabled) {
      styles.push({
        color: theme.colors.white,
      });
    }

    // Add custom text styles
    if (textStyle) {
      styles.push(textStyle);
    }

    return styles;
  };

  const ButtonContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.white} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={20}
              color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.white}
              style={styles.leftIcon}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={20}
              color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.white}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[getButtonStyle(), { overflow: 'hidden' }]}>
        <LinearGradient
          colors={theme.colors.gradientYellow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientContainer, getButtonStyle()]}>
          <ButtonContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyle()}>
      <ButtonContent />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: theme.spacing.xs,
  },
  rightIcon: {
    marginLeft: theme.spacing.xs,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ButtonCustom;
