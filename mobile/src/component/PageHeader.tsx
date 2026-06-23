import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StatusBar } from 'react-native';
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
import { useAppTheme } from '../contexts/ThemeContext';
import NotificationBellButton from './NotificationBellButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  showNotification = false,
  notificationCount: _notificationCount = 0,
  onNotificationPress: _onNotificationPress,
  variant = 'default',
  onBack,
  showBack,
  rightIcon,
  onRightPress,
  rightComponent,
  style,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

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
      <View style={[{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: SPACING.lg,
        backgroundColor: colors.background,
      }, style]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginBottom: SPACING.xs }}>
            {subtitle || 'Xin chào'}
          </Text>
          <Text style={{ fontSize: FONT_SIZE['2xl'], fontWeight: '700', color: colors.text }}>
            {title}
          </Text>
        </View>
        {showNotification && (
          <NotificationBellButton
            style={{
              width: wp('11%'),
              height: wp('11%'),
              borderRadius: wp('5.5%'),
              backgroundColor: colors.backgroundSecondary,
              justifyContent: 'center',
              alignItems: 'center',
              ...theme.shadows.sm,
            }}
            color={colors.text}
          />
        )}
      </View>
    );
  }

  // 2. Featured/Gradient Variant
  if (variant === 'featured' || variant === 'gradient') {
    return (
      <View style={[{
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: SPACING.md,
      }, style]}>
        <View style={{
          backgroundColor: colors.primary,
          borderRadius: BORDER_RADIUS.xl,
          paddingHorizontal: SPACING.xl,
          paddingVertical: SPACING['2xl'],
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          ...theme.shadows.md,
        }}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={{ marginRight: SPACING.md }}>
              <Icon name="arrow-left" size={ICON_SIZE.md} color={colors.white} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, paddingRight: SPACING.md }}>
            <Text style={{ color: colors.white, fontSize: FONT_SIZE.xl, fontWeight: '700' }}>{title}</Text>
            {subtitle && (
              <Text style={{ color: colors.white, opacity: 0.9, fontSize: FONT_SIZE.sm, marginTop: SPACING.xs }}>
                {subtitle}
              </Text>
            )}
          </View>
          {showNotification && (
            <NotificationBellButton
              style={{
                width: wp('10%'),
                height: wp('10%'),
                borderRadius: wp('5%'),
                backgroundColor: colors.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              color={colors.primary}
            />
          )}
        </View>
      </View>
    );
  }

  // 3. Public Variant (auth screens)
  if (variant === 'public') {
    return (
      <View style={[{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING.horizontal,
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: SPACING.sm,
        backgroundColor: 'transparent',
      }, style]}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={{
            width: wp('10%'),
            height: wp('10%'),
            borderRadius: wp('5%'),
            backgroundColor: colors.backgroundSecondary,
            justifyContent: 'center',
            alignItems: 'center',
            ...theme.shadows.sm,
          }}>
            <Icon name="arrow-left" size={ICON_SIZE.md} color={colors.text} />
          </TouchableOpacity>
        )}
        {rightComponent && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            {rightComponent}
          </View>
        )}
      </View>
    );
  }

  // 4. Default Variant
  const shouldShowBack = showBack !== undefined ? showBack : true;

  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingBottom: 10,
      paddingHorizontal: SCREEN_PADDING.horizontal,
      paddingTop: insets.top,
      height: 52 + insets.top,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      ...theme.shadows.sm,
      zIndex: 10,
    }, style]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <View style={{ minWidth: wp('12%'), alignItems: 'flex-start', justifyContent: 'center' }}>
        {shouldShowBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={{ padding: SPACING.xs, marginLeft: -SPACING.xs }}
          >
            <Icon name="chevron-left" size={ICON_SIZE.lg} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
        <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: FONT_SIZE.xs, color: colors.textSecondary }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={{ minWidth: wp('12%'), alignItems: 'flex-end', justifyContent: 'center' }}>
        {rightComponent ? (
          rightComponent
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightPress}
            style={{ padding: SPACING.xs, marginRight: -SPACING.xs }}
          >
            <Icon name={rightIcon} size={ICON_SIZE['xl']} color={colors.primary} />
          </TouchableOpacity>
        ) : showNotification ? (
          <NotificationBellButton color={colors.primary} />
        ) : (
          <View style={{ width: ICON_SIZE.lg }} />
        )}
      </View>
    </View>
  );
};

export default PageHeader;
