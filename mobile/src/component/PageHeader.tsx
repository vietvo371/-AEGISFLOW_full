import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  theme,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ICON_SIZE,
  wp,
  hp,
  SCREEN_PADDING
} from '../theme';
import NotificationBellButton from './NotificationBellButton';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showNotification?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
  variant?: 'home' | 'default' | 'featured' | 'public' | 'gradient';

  // Navigation props
  onBack?: () => void;
  showBack?: boolean;

  // Right Action props
  rightIcon?: string;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;

  style?: ViewStyle;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showNotification = true,
  notificationCount = 0,
  onNotificationPress,
  variant = 'default',
  onBack,
  showBack,
  rightIcon,
  onRightPress,
  rightComponent,
  style,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  // 1. Home Variant (Dashboard style)
  if (variant === 'home') {
    return (
      <View style={[styles.homeHeader, style]}>
        <View style={styles.homeLeft}>
          <Text style={styles.homeGreeting}>{subtitle || 'Xin chào'}</Text>
          <Text style={styles.homeTitle}>{title}</Text>
        </View>
        {showNotification && (
          <NotificationBellButton 
            style={styles.notificationButton} 
            color={theme.colors.text}
          />
        )}
      </View>
    );
  }

  // 2. Featured/Gradient Variant (Gradient background for special screens)
  if (variant === 'featured' || variant === 'gradient') {
    return (
      <View style={[styles.featuredWrapper, style]}>
        <View style={styles.featuredContent}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.gradientBackButton}>
              <Icon name="arrow-left" size={ICON_SIZE.md} color={theme.colors.white} />
            </TouchableOpacity>
          )}
          <View style={styles.textWrapper}>
            <Text style={styles.featuredTitle}>{title}</Text>
            {subtitle && <Text style={styles.featuredSubtitle}>{subtitle}</Text>}
          </View>
          {showNotification && (
            <NotificationBellButton 
              style={styles.featuredIconButton} 
              color={theme.colors.primary}
            />
          )}
        </View>
      </View>
    );
  }

  // 3. Public Variant (Minimal header for auth screens - Login, Register, etc.)
  if (variant === 'public') {
    return (
      <View style={[styles.publicHeader, style]}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.publicBackButton}>
            <Icon name="arrow-left" size={ICON_SIZE.md} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        {rightComponent && (
          <View style={styles.publicRightContainer}>
            {rightComponent}
          </View>
        )}
      </View>
    );
  }

  // 4. Default Variant (Standard header for child screens)
  const shouldShowBack = showBack !== undefined ? showBack : true;

  return (
    <View style={[styles.defaultHeader, style]}>
      <View style={styles.leftContainer}>
        {shouldShowBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="chevron-left" size={ICON_SIZE.lg} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerContainer}>
        <Text style={styles.defaultTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.defaultSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      <View style={styles.rightContainer}>
        {rightComponent ? (
          rightComponent
        ) : showNotification ? (
          <NotificationBellButton color={theme.colors.primary} />
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightPress} style={styles.rightButton}>
            <Icon name={rightIcon} size={ICON_SIZE['xl']} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderRight} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Home Variant
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: theme.colors.background,
  },
  homeLeft: {
    flex: 1,
  },
  homeGreeting: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  homeTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: '700',
    color: theme.colors.text,
  },
  notificationButton: {
    width: wp('11%'),
    height: wp('11%'),
    borderRadius: wp('5.5%'),
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },

  // Featured Variant
  featuredWrapper: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  featuredContent: {
    backgroundColor: theme.colors.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING['2xl'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  textWrapper: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  featuredTitle: {
    color: theme.colors.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  featuredSubtitle: {
    color: theme.colors.white,
    opacity: 0.9,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  featuredIconButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Default Variant
  defaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: hp('7.5%'),
    paddingHorizontal: SCREEN_PADDING.horizontal,
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
    zIndex: 10,
  },
  leftContainer: {
    width: wp('12%'),
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightContainer: {
    width: wp('12%'),
    alignItems: 'flex-end',
  },
  backButton: {
    padding: SPACING.xs,
    marginLeft: -SPACING.xs,
  },
  defaultTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  defaultSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
  },
  rightButton: {
    padding: SPACING.xs,
    marginRight: -SPACING.xs,
  },
  placeholderRight: {
    width: ICON_SIZE.lg,
  },

  // Public Variant (for auth screens)
  publicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: 'transparent',
  },
  publicBackButton: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  publicRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  gradientBackButton: {
    marginRight: SPACING.md,
  },
});

export default PageHeader;
