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
import { useAppTheme } from '../contexts/ThemeContext';

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
  const { colors, theme } = useAppTheme();
  const styles = getStyles(theme);

  const getButtonStyle = () => {
    const btnStyles: ViewStyle[] = [{
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      width: fullWidth ? '100%' : 'auto',
      ...theme.shadows.sm,
    }];

    // Add variant styles
    switch (variant) {
      case 'secondary':
        btnStyles.push({
          backgroundColor: colors.secondary,
          ...theme.shadows.md,
        });
        break;
      case 'outline':
        btnStyles.push({
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary,
        });
        break;
      case 'ghost':
        btnStyles.push({
          backgroundColor: 'transparent',
          borderWidth: 0,
        });
        break;
      default:
        if (gradient) {
          btnStyles.push({
            backgroundColor: 'transparent',
          });
        } else {
          btnStyles.push({
            backgroundColor: colors.primary,
          });
        }
    }

    // Add size styles
    switch (size) {
      case 'small':
        btnStyles.push({
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
        });
        break;
      case 'large':
        btnStyles.push({
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        });
        break;
      default:
        btnStyles.push({
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        });
    }

    // Add disabled styles
    if (disabled) {
      btnStyles.push({
        backgroundColor: colors.disabled,
        borderColor: colors.disabled,
      });
    }

    // Add custom styles
    if (style) {
      btnStyles.push(style);
    }

    return btnStyles;
  };

  const getTextStyle = () => {
    const txtStyles: TextStyle[] = [{
      fontFamily: theme.typography.fontFamily || undefined,
      fontWeight: theme.typography.fontWeight.medium,
      fontSize: theme.typography.fontSize.md,
    }];

    // Add variant text styles
    switch (variant) {
      case 'outline':
        txtStyles.push({
          color: colors.primary,
        });
        break;
      default:
        txtStyles.push({
          color: colors.white,
        });
    }

    // Add disabled text styles
    if (disabled) {
      txtStyles.push({
        color: colors.white,
      });
    }

    // Add custom text styles
    if (textStyle) {
      txtStyles.push(textStyle);
    }

    return txtStyles;
  };

  const ButtonContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={20}
              color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
              style={styles.leftIcon}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={20}
              color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
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
          colors={colors.gradientSecondary || ['#F59E0B', '#D97706']}
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

const getStyles = (theme: any) => StyleSheet.create({
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
